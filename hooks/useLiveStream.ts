import { until } from "@open-draft/until";
import { useState, useEffect } from "react";
import useSWR from "swr";

import { UserLiveStream } from "lib/supabase";

async function fetcher(
  route: string,
  userId: string | undefined
): Promise<UserLiveStream | undefined> {
  if (userId == null) {
    throw new Error("Require user id to fetch");
  }

  const [fetchError, response] = await until(() =>
    fetch(`${route}?id=${userId}`)
  );

  if (fetchError != null || !response.ok) {
    return undefined;
  }

  const [parseError, data] = await until(() => response.json());

  if (parseError != null || data == null) {
    return undefined;
  }

  return data;
}

export function useLiveStreamId(
  userId: string | undefined
): string | undefined {
  const [streamId, setStreamId] = useState<string>();
  const { data } = useSWR<UserLiveStream | undefined>(
    ["/api/user/stream", userId],
    fetcher
  );

  useEffect(() => {
    if (data != null) {
      setStreamId(data.id);
    }
  }, [data]);

  return streamId;
}
