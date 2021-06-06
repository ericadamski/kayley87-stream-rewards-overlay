import { NextApiRequest, NextApiResponse } from "next";

import * as Supabase from "lib/supabase";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const { id } = req.query as { id?: string };

  if (id == null) {
    return res.status(400).end();
  }

  res.json(await Supabase.getCurrentLiveStreamForUserId(id));
};
