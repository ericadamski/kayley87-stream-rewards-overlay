import { NextApiRequest, NextApiResponse } from "next";
import { until } from "@open-draft/until";
import * as Cookie from "cookie";

import * as Supabase from "lib/supabase";
import * as Twitch from "lib/twitch";

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

  const { __twtk, __twRw } = req.cookies;

  if (__twtk == null || __twRw === null) {
    return res.status(401).end();
  }

  let token = null;
  let user = null;

  try {
    const { t } = JSON.parse(__twtk);
    token = t;
    const u = JSON.parse(__twRw);
    user = u;

    if (t == null || u == null) {
      return res.status(401).end();
    }
  } catch {
    return res.status(500).end();
  }

  const valid = await Twitch.verifyUserToken(token);

  if (!valid) {
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
