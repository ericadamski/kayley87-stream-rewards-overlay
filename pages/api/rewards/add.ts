import { NextApiRequest, NextApiResponse } from "next";

import * as Supabase from "lib/supabase";
import * as Twitch from "lib/twitch";
import { getUserFromCookies } from "utils/getUserFromCookies";
import { until } from "@open-draft/until";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { subCount, reward } = req.body as {
    reward?: string;
    subCount?: number;
  };

  if (subCount == null || reward == null) {
    return res.status(400).end();
  }

  const [authorizationError, user] = await until(() =>
    getUserFromCookies(req.cookies)
  );

  if (authorizationError != null || user == null) {
    return res.status(401).end();
  }

  const newReward = await Supabase.createNewRewardForUser(user, {
    sub_count: subCount,
    reward,
  });

  if (newReward == null) {
    res.status(500).end();
  }

  res.json(newReward);
};
