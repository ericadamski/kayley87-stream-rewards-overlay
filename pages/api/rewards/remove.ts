import { NextApiRequest, NextApiResponse } from "next";

import * as Supabase from "lib/supabase";
import { until } from "@open-draft/until";
import { getUserFromCookies } from "utils/getUserFromCookies";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "DELETE") {
    return res.status(405).end();
  }

  const [authorizationError, user] = await until(() =>
    getUserFromCookies(req.cookies)
  );

  if (authorizationError != null || user == null) {
    return res.status(401).end();
  }

  const { id, all } = req.query as { id?: string; all?: false };

  if (id == null && all == null) {
    return res.status(404).end();
  }

  if (id) {
    const success = await Supabase.removeRewardForUser(user, id);

    if (!success) {
      return res.status(500).end();
    }
  } else if (all) {
    const success = await Supabase.removeAllRewardsForUser(user);

    if (!success) {
      return res.status(500).end();
    }
  }

  res.end();
};
