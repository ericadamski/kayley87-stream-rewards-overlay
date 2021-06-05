import * as Supabase from "lib/supabase";
import * as Twitch from "lib/twitch";
import { getActiveTwitchAppToken } from "./getActiveTwitchAppToken";

export async function createUserStreamWebhooks(
  twitchUser: Twitch.TwitchUser | Supabase.User
): Promise<boolean> {
  const token = await getActiveTwitchAppToken();

  if (token == null) {
    return false;
  }

  // Sub to streamer online events
  // TODO: Maybe user: createTwitchEventSubscription, here?
  if (
    !(await Supabase.doesUserHaveWebhook(
      twitchUser,
      Twitch.TwitchWebhookType.Online
    ))
  ) {
    const onlineData = await Twitch.createWebhookSubscription(
      token,
      twitchUser.id,
      Twitch.TwitchWebhookType.Online
    );

    if (!onlineData) {
      console.log({ onlineData });
      return false;
    }

    await Supabase.addNewUserWebhookSubscription(twitchUser, onlineData);
  }

  // Sub to streamer offline events
  if (
    !(await Supabase.doesUserHaveWebhook(
      twitchUser,
      Twitch.TwitchWebhookType.Offline
    ))
  ) {
    const offlineData = await Twitch.createWebhookSubscription(
      token,
      twitchUser.id,
      Twitch.TwitchWebhookType.Offline
    );

    if (!offlineData) {
      return false;
    }

    await Supabase.addNewUserWebhookSubscription(twitchUser, offlineData);
  }

  return true;
}
