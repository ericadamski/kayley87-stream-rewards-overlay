import { TwitchWebhookType } from "./twitch";
import * as Supabase from "./supabase";

interface Subscription<T = TwitchWebhookType> {
  /**
   * The id of the webhook subscription
   */
  id: string;
  type: T;
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

interface WebhookEventData extends Record<string, any> {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
}

export interface TwitchWebhookEvent<
  T = WebhookEventData,
  S = TwitchWebhookType
> {
  subscription: Subscription<S>;
  event: T;
}

interface UserStreamOnline extends WebhookEventData {
  /**
   * Event id
   */
  id: string;
  /**
   * Twitch user id
   */
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

interface UserStreamOffline extends WebhookEventData {}

export function handleUserStreamOfflineEvent(
  event: TwitchWebhookEvent<UserStreamOffline, TwitchWebhookType.Offline>
) {
  return Supabase.markLiveStreamComplete(event.event.broadcaster_user_id);
}

interface UserFollow extends WebhookEventData {
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
  const userId = event.event.broadcaster_user_id;
  const currentStream = await Supabase.getCurrentLiveStreamForUserId(userId);

  if (currentStream != null) {
    return Supabase.addTwitchUserEvent(userId, currentStream.id, {
      event_user_id: event.event.user_id,
      event_user_login: event.event.user_login,
      event_user_name: event.event.user_name,
      event_type: TwitchWebhookType.Follow,
    });
  }

  return false;
}

interface UserSubscribe extends WebhookEventData {
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
  const userId = event.event.broadcaster_user_id;
  const currentStream = await Supabase.getCurrentLiveStreamForUserId(userId);

  if (currentStream != null) {
    return Supabase.addTwitchUserEvent(userId, currentStream.id, {
      event_user_id: event.event.user_id,
      event_user_login: event.event.user_login,
      event_user_name: event.event.user_name,
      event_type: TwitchWebhookType.Subscribe,
    });
  }

  return false;
}

type WebhookEventDataByType = {
  [TwitchWebhookType.Online]: UserStreamOnline;
  [TwitchWebhookType.Offline]: UserStreamOffline;
  [TwitchWebhookType.Follow]: UserFollow;
  [TwitchWebhookType.Subscribe]: UserSubscribe;
};

type WebhookEventHandler<D, S> = (
  event: TwitchWebhookEvent<D, S>
) => Promise<boolean>;

const EVENT_HANDLERS: {
  [k in TwitchWebhookType]: WebhookEventHandler<WebhookEventDataByType[k], k>;
} = {
  [TwitchWebhookType.Online]: handleUserStreamOnlineEvent,
  [TwitchWebhookType.Offline]: handleUserStreamOfflineEvent,
  [TwitchWebhookType.Follow]: handleUserFollowEvent,
  [TwitchWebhookType.Subscribe]: handleUserSubscribeEvent,
};

export function handleWebhookEvent(body: TwitchWebhookEvent) {
  const {
    subscription: { type },
  } = body;

  const handler = EVENT_HANDLERS[type];

  if (handler != null) {
    // @ts-ignore There is a valid type error here, not sure I should fuddle with it?
    return handler(body);
  }

  return false;
}
