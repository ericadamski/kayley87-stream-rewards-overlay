import { NextApiRequest, NextApiResponse } from "next";

import * as Twitch from "lib/twitch";
import * as Supabase from "lib/supabase";
import { getActiveTwitchAppToken } from "utils/getActiveTwitchAppToken";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const { u: broadcasterLogin, s: resubUserLogin } = req.query as {
    u?: string;
    s?: string;
  };

  if (
    broadcasterLogin == null ||
    resubUserLogin == null ||
    broadcasterLogin.toLowerCase() === resubUserLogin.toLowerCase()
  ) {
    return res.end("NotLikeThis Hmm, that doesn't look right");
  }

  const token = await getActiveTwitchAppToken();

  if (!token) {
    return res.end("FailFish Something went wrong. Try again pls. FailFish");
  }

  const broadcaster = await Supabase.getUserByTwitchLogin(broadcasterLogin);

  if (broadcaster == null) {
    return res.end(
      `FailFish ${broadcasterLogin} doesn't use stream-rewards! FailFish`
    );
  }

  const currentStream = await Supabase.getCurrentLiveStreamForUserId(
    broadcaster.id
  );

  if (currentStream == null) {
    return res.end(`NotLikeThis ${broadcaster.login} isn't even streaming!`);
  }

  const isTrackingSubs = await Supabase.doesUserHaveWebhook(
    broadcaster,
    Twitch.TwitchWebhookType.Subscribe
  );

  if (!isTrackingSubs) {
    return res.end(
      `FailFish ${broadcasterLogin} I just can't do that. FailFish`
    );
  }

  const resubUser = await Twitch.getUserByLogin(token, resubUserLogin);

  if (resubUser == null) {
    return res.end(
      `Who's this CoolCat ${resubUserLogin} you speak of. FailFish`
    );
  }

  const trackedMetric = await Supabase.addTwitchUserEvent(
    broadcaster.id,
    currentStream.id,
    {
      event_user_id: resubUser.id,
      event_user_login: resubUser.login,
      event_user_name: resubUser.displayName,
      event_type: Twitch.TwitchWebhookType.Subscribe,
    }
  );

  if (!trackedMetric) {
    return res.end(`NotLikeThis It's our fault that it didn't work.`);
  }

  res.end(
    `TwitchLit ${resubUserLogin} thank you! Your resub counts toward our rewards!`
  );
};
