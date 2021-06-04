import { NextApiRequest, NextApiResponse } from "next";

import * as Supabase from "lib/supabase";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const { login } = req.query as { login?: string };

  if (login == null) {
    return res.status(404).end();
  }

  res.json(await Supabase.listRewardsForTwitchLogin(login));
};
