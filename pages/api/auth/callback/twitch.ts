import { NextApiRequest, NextApiResponse } from "next";
import { until } from "@open-draft/until";
import ms from "ms";
import * as Cookie from "cookie";

import * as Supabase from "lib/supabase";
import * as Twitch from "lib/twitch";
import { createUserStreamWebhooks } from "utils/createUserStreamWebhooks";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const { code } = req.query as { code: string };

  const [authError, authResponse] = await until(() =>
    Twitch.getOAuthToken(code)
  );

  if (authError == null && authResponse.ok) {
    const { access_token } = await authResponse.json();

    const [userGetError, twitchUser] = await until(() =>
      Twitch.getUser(access_token)
    );

    if (userGetError == null && twitchUser != null) {
      const user = await Supabase.getUserById(twitchUser.id);

      if (user == null) {
        await Supabase.addNewUser(twitchUser);
        await createUserStreamWebhooks(twitchUser, access_token);
      }

      res.setHeader("access-control-expose-headers", "Set-Cookie");
      res.setHeader("Set-Cookie", [
        Cookie.serialize("__twRw", JSON.stringify(twitchUser), {
          expires: new Date(Date.now() + ms("1y")),
          path: "/",
        }),
        Cookie.serialize("__twtk", JSON.stringify({ t: access_token }), {
          expires: new Date(Date.now() + ms("2d")),
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        }),
      ]);

      res.json(twitchUser);

      return;
    }
  }

  res.end();
};
