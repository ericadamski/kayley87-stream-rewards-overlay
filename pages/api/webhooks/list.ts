import { NextApiRequest, NextApiResponse } from "next";
import { until } from "@open-draft/until";

import * as Supabase from "lib/supabase";
import { getUserFromCookies } from "utils/getUserFromCookies";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const [authorizationError, user] = await until(() =>
    getUserFromCookies(req.cookies)
  );

  if (authorizationError != null || user == null) {
    return res.status(401).end();
  }

  const { id } = req.query as { id?: string };

  if (id == null) {
    return res.status(400).end();
  }

  res.json(await Supabase.listAllWebhooksForUser(id));
};
