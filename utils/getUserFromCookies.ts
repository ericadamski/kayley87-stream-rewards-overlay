import { NextApiRequest } from "next";

import * as Twitch from "lib/twitch";

export async function getUserFromCookies(cookies: NextApiRequest["cookies"]) {
  const { __twtk, __twRw } = cookies;

  if (__twtk == null || __twRw === null) {
    throw new Error("Unauthorized");
  }

  let token = null;
  let user: (Twitch.TwitchUser & { token?: string }) | null = null;

  try {
    const { t } = JSON.parse(__twtk);
    token = t;
    const u = JSON.parse(__twRw);
    user = u;

    if (t == null || user == null) {
      throw new Error("Unauthorized");
    }

    user.token = t;
  } catch {
    throw new Error("Something didn't go well here.");
  }

  const valid = await Twitch.verifyUserToken(token);

  if (!valid) {
    throw new Error("Unauthorized");
  }

  return user;
}
