import { until } from "@open-draft/until";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { TwitchUser } from "./twitch";

let client: SupabaseClient;

const supabaseUrl = process.env.SUPABASE_API_URL ?? "";
const supabaseKey = process.env.SUPABASE_API_KEY ?? "";

export interface User {
  id: string;
  login: string;
  profile_img_url?: string;
}

export async function addNewUser(user: TwitchUser) {
  const base = getClientInstance();

  const [error] = await until(async () =>
    base.from<User>("users").insert([
      {
        id: user.id,
        login: user.login,
        profile_img_url: user.imageUrl,
      },
    ])
  );

  return error == null;
}

interface TwitchWebhookSub {
  id: string;
  type: string;
  user_id: string;
}

export async function addNewUserWebhookSubscription(
  user: TwitchUser | User,
  hook: Omit<TwitchWebhookSub, "user_id">
) {
  const base = getClientInstance();

  const [error] = await until(async () =>
    base.from<TwitchWebhookSub>("twitch_webhooks").insert([
      {
        ...hook,
        user_id: user.id,
      },
    ])
  );

  return error == null;
}

export async function doesUserHaveWebhook(
  user: TwitchUser | User | Pick<User | TwitchUser, "id">,
  type: string
) {
  const base = getClientInstance();

  const [error, record] = await until(async () =>
    base
      .from<TwitchWebhookSub>("twitch_webhooks")
      .select()
      .eq("type", type)
      .eq("user_id", user.id)
      .single()
  );

  if (error != null || record.data == null) {
    return false;
  }

  return record.data;
}

export async function getUserByTwitchLogin(login: string) {
  const base = getClientInstance();

  const [error, user] = await until(async () =>
    base.from<User>("users").select().eq("login", login).single()
  );

  if (error != null) {
    return null;
  }

  return user.data;
}

export async function getUserById(id: string) {
  const base = getClientInstance();

  const [error, user] = await until(async () =>
    base.from<User>("users").select().eq("id", id).single()
  );

  if (error != null) {
    return null;
  }

  return user.data;
}

export interface UserSubReward {
  id: number;
  sub_count: number;
  reward: string;
  user_id: string;
}

export async function createNewRewardForUser(
  user: TwitchUser | User,
  data: Omit<UserSubReward, "id" | "user_id">
) {
  const base = getClientInstance();

  const [error, record] = await until(async () =>
    base
      .from<UserSubReward>("user_rewards")
      .insert([{ ...data, user_id: user.id }], { returning: "representation" })
      .single()
  );

  if (error != null || record.data == null) {
    return undefined;
  }

  return record.data;
}

export async function listRewardsForUser(user: TwitchUser | User) {
  const base = getClientInstance();

  const [error, record] = await until(async () =>
    base
      .from<UserSubReward>("user_rewards")
      .select()
      .eq("user_id", user.id)
      .order("sub_count")
  );

  if (error != null || record.data == null) {
    return [];
  }

  return record.data;
}

export async function listRewardsForTwitchLogin(
  login: (TwitchUser | User)["login"]
) {
  const base = getClientInstance();

  const user = await getUserByTwitchLogin(login);

  if (user == null) {
    return [];
  }

  const [error, record] = await until(async () =>
    base
      .from<UserSubReward>("user_rewards")
      .select()
      .eq("user_id", user.id)
      .order("sub_count")
  );

  if (error != null || record.data == null) {
    return [];
  }

  return record.data;
}

interface UserLiveStream {
  id: string;
  user_id: string;
  start_time: string;
  isComplete?: boolean;
}

export async function addNewUserLiveStream(
  userId: (TwitchUser | User)["id"],
  streamInfo: Omit<UserLiveStream, "isComplete" | "user_id">
) {
  const base = getClientInstance();

  const [error] = await until(async () =>
    base
      .from<UserLiveStream>("live_streams")
      .insert([{ ...streamInfo, user_id: userId }])
  );

  return error == null;
}

export async function markLiveStreamComplete(
  userId: (TwitchUser | User)["id"]
) {
  const base = getClientInstance();

  const [error] = await until(async () =>
    base
      .from<UserLiveStream>("live_streams")
      .update({ isComplete: true })
      .eq("user_id", userId)
      .eq("isComplete", false)
  );

  return error == null;
}

export async function getCurrentLiveStreamForUserId(userId: string) {
  const base = getClientInstance();

  const [error, record] = await until(async () =>
    base.from<UserLiveStream>("live_streams").select().match({
      user_id: userId,
      isComplete: false,
    })
  );

  if (error != null || record.data == null) {
    return undefined;
  }

  return record.data;
}

function getClientInstance() {
  if (client == null) {
    client = createClient(supabaseUrl, supabaseKey);
  }

  return client;
}
