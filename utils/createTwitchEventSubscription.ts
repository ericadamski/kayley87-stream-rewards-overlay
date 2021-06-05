import * as Supabase from "lib/supabase";
import * as Twitch from "lib/twitch";
import { getActiveTwitchAppToken } from "./getActiveTwitchAppToken";

export enum EventSubscriptionStatus {
  Rejected = "rejected",
  Duplicate = "duplicate",
  Connected = "connected",
}

export async function createTwitchEventSubscription(
  user: Twitch.TwitchUser | Supabase.User,
  subType: Twitch.TwitchWebhookType
): Promise<EventSubscriptionStatus> {
  const token = await getActiveTwitchAppToken();

  if (token == null) {
    return EventSubscriptionStatus.Rejected;
  }

  if (!(await Supabase.doesUserHaveWebhook(user, subType))) {
    const data = await Twitch.createWebhookSubscription(
      token,
      user.id,
      subType
    );

    if (!data) {
      return EventSubscriptionStatus.Rejected;
    }

    await Supabase.addNewUserWebhookSubscription(user, data);

    return EventSubscriptionStatus.Connected;
  }

  return EventSubscriptionStatus.Duplicate;
}
