import { TwitchWebhookType } from "lib/twitch";

export function getTwitchEventFriendlyName(eventType: TwitchWebhookType) {
  switch (eventType) {
    case TwitchWebhookType.Follow:
      return "Follows";
    case TwitchWebhookType.Subscribe:
      return "subs";
  }
}
