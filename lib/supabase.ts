import { until } from "@open-draft/until";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

import type { TwitchUser, TwitchWebhookType } from "./twitch";

let client: SupabaseClient;

const supabaseUrl = process.env.SUPABASE_API_URL ?? "";
const supabaseKey = process.env.SUPABASE_API_KEY ?? "";

interface TwitchToken {
  id: number;
  token: string;
  expires_at: Date | string;
}

export async function addNewTwitchToken(token: string, expires_in: number) {
  return insert<TwitchToken, Omit<TwitchToken, "id">>("twitch_tokens", {
    token,
    expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
  });
}

export async function getLatestActiveTwitchToken() {
  const base = getClientInstance();

  const [error, record] = await until(async () =>
    base
      .from<TwitchToken>("twitch_tokens")
      .select("token")
      .gt("expires_at", new Date().toISOString())
      .single()
  );

  if (error != null || record?.data?.token == null) {
    return undefined;
  }

  return record.data.token;
}

export interface User {
  id: string;
  login: string;
  profile_img_url?: string;
}

export function addNewUser(user: TwitchUser) {
  return insert<User>("users", {
    id: user.id,
    login: user.login,
    profile_img_url: user.imageUrl,
  });
}

export interface TwitchWebhookSub {
  /**
   * The subscription ID returned from the Twitch API
   */
  id: string;
  sub_type: string;
  user_id: string;
}

export function addNewUserWebhookSubscription(
  user: TwitchUser | User,
  hook: Omit<TwitchWebhookSub, "user_id">
) {
  return insert<TwitchWebhookSub>("twitch_webhooks", {
    ...hook,
    user_id: user.id,
  });
}

export async function removeUserWebhookSubscription(subscriptionId: string) {
  const base = getClientInstance();

  const [error] = await until(async () =>
    base
      .from<TwitchWebhookSub>("twitch_webhooks")
      .delete()
      .eq("id", subscriptionId)
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
      .eq("sub_type", type)
      .eq("user_id", user.id)
      .single()
  );

  if (error != null || record.data == null) {
    return false;
  }

  return record.data;
}

export async function listAllWebhooksForUser(
  userId: (User | TwitchUser)["id"]
) {
  const base = getClientInstance();

  const [error, record] = await until(async () =>
    base
      .from<TwitchWebhookSub>("twitch_webhooks")
      .select()
      .eq("user_id", userId)
  );

  if (error != null || record.data == null) {
    return [];
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

export async function removeAllRewardsForUser(user: TwitchUser | User) {
  const base = getClientInstance();

  const [error] = await until(async () =>
    base.from<UserSubReward>("user_rewards").delete().eq("user_id", user.id)
  );

  return error != null;
}

export async function removeRewardForUser(
  user: TwitchUser | User,
  rewardId: string
) {
  const base = getClientInstance();

  const [error] = await until(async () =>
    base
      .from<UserSubReward>("user_rewards")
      .delete()
      .eq("user_id", user.id)
      .eq("id", rewardId)
  );

  return error != null;
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

export interface UserLiveStream {
  id: string;
  user_id: string;
  start_time: string;
  is_complete?: boolean;
}

export async function addNewUserLiveStream(
  userId: (TwitchUser | User)["id"],
  streamInfo: Omit<UserLiveStream, "isComplete" | "user_id">
) {
  return insert<UserLiveStream>("live_streams", {
    ...streamInfo,
    user_id: userId,
    is_complete: false,
  });
}

export async function markLiveStreamComplete(
  userId: (TwitchUser | User)["id"]
) {
  const base = getClientInstance();

  const [error] = await until(async () =>
    base
      .from<UserLiveStream>("live_streams")
      .update({ is_complete: true })
      .eq("user_id", userId)
      .eq("is_complete", false)
  );

  return error == null;
}

export async function getCurrentLiveStreamForUserId(userId: string) {
  const base = getClientInstance();

  const [error, record] = await until(async () =>
    base
      .from<UserLiveStream>("live_streams")
      .select()
      .eq("user_id", userId)
      .eq("is_complete", false)
      .single()
  );

  if (error != null || record.data == null) {
    return undefined;
  }

  return record.data;
}

export interface TwitchUserEvent {
  id: number;
  user_id: string;
  stream_id: string;
  event_user_id: string;
  event_user_login: string;
  event_user_name: string;
  event_type: TwitchWebhookType;
  created_at: string;
}

export function addTwitchUserEvent(
  userId: string,
  streamId: string,
  data: Omit<TwitchUserEvent, "id" | "user_id" | "stream_id" | "created_at">
) {
  return insert<TwitchUserEvent, Omit<TwitchUserEvent, "id">>(
    "twitch_user_events",
    {
      ...data,
      user_id: userId,
      stream_id: streamId,
      created_at: new Date().toISOString(),
    }
  );
}

export async function getAllUserEventsFor(
  userId: string,
  streamId: string,
  eventType: TwitchWebhookType
): Promise<{ count: number; latestEvent?: TwitchUserEvent | undefined }> {
  const base = getClientInstance();

  const [error, records] = await until(async () =>
    base
      .from<TwitchUserEvent>("twitch_user_events")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("stream_id", streamId)
      .eq("event_type", eventType)
      .order("created_at")
  );

  if (error != null || records.data == null) {
    return { count: 0 };
  }

  return {
    count: records.count ?? 0,
    latestEvent: records.data.pop(),
  };
}

interface TwitchWebhookLog {
  id: string;
  /**
   * An ISO date string included with the twitch headers
   */
  received_at: string;
}

export function trackRecievedTwitchWebhook(
  messageId: string,
  timestamp: string
) {
  // TODO: make sure that the ID is unique, so this insert will fail
  // if we are trying to count a message twice.
  return insert<TwitchWebhookLog>("twitch_webhook_log", {
    id: messageId,
    received_at: timestamp,
  });
}

function getClientInstance() {
  if (client == null) {
    client = createClient(supabaseUrl, supabaseKey);
  }

  return client;
}

async function insert<T, D = T>(tableName: string, data: D): Promise<boolean> {
  const base = getClientInstance();

  const [error] = await until(async () =>
    base.from<T>(tableName).insert([data])
  );

  return error == null;
}
