import { NextApiRequest, NextApiResponse } from "next";
import { sha256 } from "js-sha256";

import * as Supabase from "lib/supabase";
import type { TwitchWebhookType } from "lib/twitch";
import { handleWebhookEvent, TwitchWebhookEvent } from "lib/twitch-events";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).end();
  }
  const { headers } = req;

  // We turned off body parsing with Next.js so we could verify the
  // request source was Twitch. So we need to absorb the body now.
  const body = await webhookPayloadParser(req);

  try {
    verifyRequestFromTwitch(req, body);
  } catch {
    return res.status(403).end();
  }

  const messageId = headers["Twitch-Eventsub-Message-Id"] as string;
  const timestamp = headers["Twitch-Eventsub-Message-Timestamp"] as string;

  // Store the record in the DB to make sure we avoid dups.
  const alreadySeen = !(await Supabase.trackRecievedTwitchWebhook(
    messageId,
    timestamp
  ));

  if (alreadySeen) {
    return res.end();
  }

  const contentType = headers["Content-Type"];

  if (contentType !== "application/json") {
    return res.status(400).end();
  }

  let bodyAsObj = {};

  try {
    bodyAsObj = JSON.parse(body);
  } catch {
    // The body should be JSON, if it isn't I don't know how to handle it
    // anyway.
    return res.status(400).end();
  }

  // Verification for new subscriptions
  if (
    headers["Twitch-Eventsub-Message-Type"] === "webhook_callback_verification"
  ) {
    const {
      challenge,
      subscription: {
        id,
        type,
        condition: { broadcaster_user_id },
      },
    } = bodyAsObj as {
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

    return res.status(400).end();
  }

  // Handle Twith revoking a webhook
  if (headers["Twitch-Eventsub-Message-Type"] === "revocation") {
    const {
      subscription: { id },
    } = bodyAsObj as {
      subscription: {
        id: string;
      };
    };

    await Supabase.removeUserWebhookSubscription(id);

    return res.end();
  }

  // Finally handle the notification
  await handleWebhookEvent(bodyAsObj as TwitchWebhookEvent);

  res.end();
};

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * N.B since we turned off body parsing we need to get the bytes from the body
 * stream and translate them into utf8 text.
 */
function webhookPayloadParser(req: NextApiRequest): Promise<string> {
  return new Promise((resolve) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      resolve(Buffer.from(data).toString());
    });
  });
}

// verify header Twitch-Eventsub-Message-Signature
async function verifyRequestFromTwitch(req: NextApiRequest, body: string) {
  const twitchMessageId = req.headers["Twitch-Eventsub-Message-Id"] as string;
  const twitchMessageTimestamp = req.headers[
    "Twitch-Eventsub-Message-Timestamp"
  ] as string;
  const twitchSignatureHeader = req.headers[
    "Twitch-Eventsub-Message-Signature"
  ] as string;

  if (
    twitchMessageId == null ||
    twitchMessageTimestamp == null ||
    twitchSignatureHeader == null
  ) {
    throw new Error("Invalid request");
  }

  const message = twitchMessageId + twitchMessageTimestamp + body;
  const expectedSignature = sha256.hmac.hex(process.env.SECRET!, message);

  if (twitchSignatureHeader !== `sha256=${expectedSignature}`) {
    throw new Error("Invalid request");
  }
}
