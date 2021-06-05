import { until } from "@open-draft/until";
import { MutatorCallback } from "swr/dist/types";
import useSWR from "swr";

import { UserSubReward } from "lib/supabase";

async function fetcher(route: string, login: string): Promise<UserSubReward[]> {
  if (login == null) {
    throw new Error("Cannot fetch rewards without login.");
  }

  const [fetchError, response] = await until(() =>
    fetch(`${route}?login=${login}`)
  );

  if (fetchError != null || !response.ok) {
    return [];
  }

  const [parseError, data] = await until(() => response.json());

  if (parseError != null || data == null) {
    return [];
  }

  return data;
}

export function useRewards(
  login?: string,
  options?: {
    initialData?: UserSubReward[];
    refreshInterval?: number;
  }
) {
  return useSWR<UserSubReward[]>(["/api/rewards/list", login], fetcher, {
    initialData: options?.initialData,
    refreshInterval: options?.refreshInterval,
  });
}
