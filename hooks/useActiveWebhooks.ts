import { until } from "@open-draft/until";
import useSWR from "swr";

async function fetcher(route: string, userId?: string) {
  if (userId == null) {
    throw new Error("Require user id to fetch");
  }

  const [fetchError, response] = await until(() =>
    fetch(`${route}?id=${userId}`)
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

export function useActiveWebhooks(userId?: string) {
  return useSWR(["/api/webhooks/list", userId], fetcher);
}
