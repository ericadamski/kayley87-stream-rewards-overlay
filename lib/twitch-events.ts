import { TwitchWebhookType } from "./twitch";
import * as Supabase from "./supabase";

interface Subscription<Type = TwitchWebhookType> {
  /**
   * The id of the webhook subscription
   */
  id: string;
  type: Type;
  version: "1";
  status: "enabled";
  cost: number;
  condition: {
    broadcaster_user_id: string;
  };
  transport: {
    method: "webhook";
    callback: string;
  };
  /**
   * The date that the webhook was created as a ISO string.
   */
  created_at: string;
}

interface TwitchWebhookEvent<T, Type> {
  subscription: Subscription<Type>;
  event: T;
}

interface UserStreamOnline {
  /**
   * Event id
   */
  id: string;
  /**
   * Twitch user id
   */
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  type: "live";
  /**
   * The time the stream started at as an ISO date string.
   */
  started_at: string;
}

export function handleUserStreamOnlineEvent(
  event: TwitchWebhookEvent<UserStreamOnline, TwitchWebhookType.Online>
) {
  return Supabase.addNewUserLiveStream(event.event.broadcaster_user_id, {
    id: event.event.id,
    start_time: event.event.started_at,
  });
}

interface UserStreamOffline {
  /**
   * Twitch user id
   */
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
}

export function handleUserStreamOfflineEvent(
  event: TwitchWebhookEvent<UserStreamOffline, TwitchWebhookType.Offline>
) {
  return Supabase.markLiveStreamComplete(event.event.broadcaster_user_id);
}

interface UserFollow {
  /**
   * Twitch user id
   */
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  /**
   * Twitch user id of the person who followed
   */
  user_id: string;
  /**
   * Twitch user login of the person who followed
   */
  user_login: string;
  user_name: string;
  /**
   * A ISO Date string that represents when the user followed
   */
  followed_at: string;
}

export async function handleUserFollowEvent(
  event: TwitchWebhookEvent<UserFollow, TwitchWebhookType.Follow>
) {
  // check to make sure we are live.
  const currentStream = await Supabase.getCurrentLiveStreamForUserId(
    event.event.broadcaster_user_id
  );

  // if we are, add the follow to the twitch_user_events table with the twitch user info
  // the current_stream_id and the user_id of the broadcaster and the type of the event.
}

interface UserSubscribe {
  /**
   * Twitch user id
   */
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  /**
   * Twitch user id of the person who followed
   */
  user_id: string;
  /**
   * Twitch user login of the person who followed
   */
  user_login: string;
  user_name: string;
  tier: string;
  is_gift: boolean;
}

export async function handleUserSubscribeEvent(
  event: TwitchWebhookEvent<UserSubscribe, TwitchWebhookType.Subscribe>
) {
  // check to make sure we are live.
  // if we are, add the follow to the twitch_user_events table with the twitch user info
  // the current_stream_id and the user_id of the broadcaster
}
