import { NextApiRequest, NextApiResponse } from "next";
import { until } from "@open-draft/until";

import { getUserFromCookies } from "utils/getUserFromCookies";
import { createUserStreamWebhooks } from "utils/createUserStreamWebhooks";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const [authorizationError, user] = await until(() =>
    getUserFromCookies(req.cookies)
  );

  if (authorizationError != null || user == null || user.token == null) {
    return res.status(401).end();
  }

  const success = await createUserStreamWebhooks(user);

  if (!success) {
    return res.status(500).end();
  }

  res.end();
};
