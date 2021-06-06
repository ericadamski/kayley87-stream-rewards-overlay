import { useState, useEffect } from "react";

import { TwitchWebhookType } from "lib/twitch";
import { useActiveWebhooks } from "./useActiveWebhooks";

type TrackableWebhookType =
  | TwitchWebhookType.Follow
  | TwitchWebhookType.Subscribe;

export function useTrackingMetric(
  userId: string | undefined
): TrackableWebhookType | undefined {
  const { data: activeWebhooks = [] } = useActiveWebhooks(userId);
  const [trackingMetric, setTrackingMetric] = useState<TrackableWebhookType>();

  useEffect(() => {
    const trackingMetric = activeWebhooks.filter(({ sub_type }) =>
      [TwitchWebhookType.Follow, TwitchWebhookType.Subscribe].includes(
        sub_type as TwitchWebhookType
      )
    )[0];

    if (trackingMetric != null) {
      setTrackingMetric(trackingMetric.sub_type as TrackableWebhookType);
    }
  }, [activeWebhooks]);

  return trackingMetric;
}
