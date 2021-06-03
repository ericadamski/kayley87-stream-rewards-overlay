import { NextApiRequest, NextApiResponse } from "next";

import * as Supabase from "lib/supabase";
import type { TwitchWebhookType } from "lib/twitch";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    const { headers } = req;

    if (
      headers["Twitch-Eventsub-Message-Type"] ===
      "webhook_callback_verification"
    ) {
      const {
        challenge,
        subscription: {
          id,
          type,
          condition: { broadcaster_user_id },
        },
      } = req.body as {
        challenge: string;
        subscription: {
          id: string;
          type: TwitchWebhookType;
          condition: {
            broadcaster_user_id: string;
          };
        };
      };

      const hook = await Supabase.doesUserHaveWebhook(
        { id: broadcaster_user_id },
        type
      );

      if (hook && hook.id === id) {
        return res.end(challenge);
      }
    }
  }

  //   do somethiong with the subs

  res.end();
};
