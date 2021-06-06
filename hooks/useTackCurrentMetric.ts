import { until } from "@open-draft/until";
import useSWR from "swr";

import type { TwitchUserEvent } from "lib/supabase";
import { TwitchWebhookType } from "lib/twitch";
import ms from "ms";

async function fetcher(
  route: string,
  userId: string | undefined,
  streamId: string | undefined,
  eventType: string | undefined
): Promise<{ count: number; latestEvent?: TwitchUserEvent | undefined }> {
  if (userId == null || streamId == null || eventType == null) {
    throw new Error("Fetch requirements are missing");
  }

  const [fetchError, response] = await until(() =>
    fetch(
      `${route}?userId=${userId}&streamId=${streamId}&eventType=${eventType}`
    )
  );

  if (fetchError != null || !response.ok) {
    return { count: 0 };
  }

  const [parseError, data] = await until(() => response.json());

  if (parseError != null || data == null) {
    return { count: 0 };
  }

  return data;
}

export function useTackCurrentMetric(
  userId: string | undefined,
  streamId: string | undefined,
  eventType: TwitchWebhookType | undefined
): [count: number, latestEvent: TwitchUserEvent | undefined] {
  const { data } = useSWR<{
    count: number;
    latestEvent?: TwitchUserEvent | undefined;
  }>(["/api/user/metrics", userId, streamId, eventType], fetcher, {
    refreshInterval: ms("2s"),
  });

  return [data?.count ?? 0, data?.latestEvent];
}
