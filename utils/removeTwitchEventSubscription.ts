import * as Supabase from "lib/supabase";
import * as Twitch from "lib/twitch";
import { getActiveTwitchAppToken } from "./getActiveTwitchAppToken";

export async function removeTwitchEventSubscription(
  user: Twitch.TwitchUser | Supabase.User,
  subType: Twitch.TwitchWebhookType
): Promise<boolean> {
  const token = await getActiveTwitchAppToken();

  if (token == null) {
    return false;
  }

  const sub = await Supabase.doesUserHaveWebhook(user, subType);

  if (sub) {
    const data = await Twitch.removeWebhookSubscription(token, sub.id);

    if (!data) {
      return false;
    }

    return Supabase.removeUserWebhookSubscription(sub.id);
  }

  return true;
}
