import * as Supabase from "lib/supabase";
import * as Twitch from "lib/twitch";

export async function createUserStreamWebhooks(
  twitchUser: Twitch.TwitchUser | Supabase.User,
  access_token: string
): Promise<boolean> {
  // Sub to streamer online events
  if (
    !(await Supabase.doesUserHaveWebhook(
      twitchUser,
      Twitch.TwitchWebhookType.Online
    ))
  ) {
    const onlineData = await Twitch.createWebhookSubscription(
      access_token,
      twitchUser.id,
      Twitch.TwitchWebhookType.Online
    );

    if (!onlineData) {
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
      access_token,
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
