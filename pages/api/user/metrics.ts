import { NextApiRequest, NextApiResponse } from "next";

import * as Supabase from "lib/supabase";
import { TwitchWebhookType } from "lib/twitch";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const { userId, streamId, eventType } = req.query as {
    userId?: string;
    streamId?: string;
    eventType?: TwitchWebhookType;
  };

  if (userId == null || streamId == null || eventType == null) {
    return res.status(400).end();
  }

  res.json(await Supabase.getAllUserEventsFor(userId, streamId, eventType));
};
