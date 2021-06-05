import { until } from "@open-draft/until";

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2";
const TWITCH_API_URL = "https://api.twitch.tv/helix";

const BASE_URI =
  process.env.NODE_ENV === "production"
    ? "https://twitch-rewards.vercel.app"
    : "https://03b6b2d097d9.ngrok.io";

const REDIRECT_URI = encodeURIComponent(
  process.env.NODE_ENV === "production"
    ? "https://twitch-rewards.vercel.app/auth/twitch"
    : "http://localhost:3000/auth/twitch"
);

export enum TwitchWebhookType {
  Subscribe = "channel.subscribe",
  Follow = "channel.follow",
  Online = "stream.online",
  Offline = "stream.offline",
}

export interface TwitchUser {
  displayName: string;
  imageUrl: string;
  id: string;
  login: string;
}

export function getOAuthUrl(state?: string) {
  const scopes = ["user:read:email", "channel:read:subscriptions"];

  return `${TWITCH_AUTH_URL}/authorize?client_id=${
    process.env.TWITCH_CLIENT_ID
  }&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes.join(" ")}${
    state ? `&state=${state}` : ""
  }`;
}

export function getOAuthToken(code: string) {
  return fetch(
    `${TWITCH_AUTH_URL}/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}`,
    {
      method: "POST",
    }
  );
}

export async function getAppAccessToken() {
  const scopes: string[] = ["channel:read:subscriptions"];

  const [error, response] = await until(() =>
    fetch(
      `${TWITCH_AUTH_URL}/token?client_id=${
        process.env.TWITCH_CLIENT_ID
      }&client_secret=${
        process.env.TWITCH_CLIENT_SECRET
      }&grant_type=client_credentials&scope=${encodeURIComponent(
        scopes.join(" ")
      )}`,
      {
        method: "POST",
      }
    )
  );

  if (error != null) {
    return undefined;
  }

  const { access_token, expires_in } = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string[];
    token_type: "bearer";
  };

  return { token: access_token, expiresIn: expires_in };
}

export function getUser(token: string): Promise<TwitchUser | undefined> {
  return fetch(`${TWITCH_API_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    },
  }).then(async (response) => {
    if (response.ok) {
      const { data } = await response.json();
      const [{ displayName, offline_image_url, profile_image_url, id, login }] =
        data;

      return {
        displayName,
        imageUrl:
          profile_image_url.length > 0 ? profile_image_url : offline_image_url,
        id,
        login,
      };
    }
  });
}

export async function verifyUserToken(token: string): Promise<boolean> {
  const [validateError, response] = await until(() =>
    fetch("https://id.twitch.tv/oauth2/validate", {
      headers: {
        Authorization: `OAuth ${token}`,
      },
    })
  );

  if (validateError != null || !response.ok) {
    return false;
  }

  const [parseError, validateData] = await until(() => response.json());

  if (parseError != null || validateData == null) {
    return false;
  }

  return validateData.expires_in > 0;
}

export async function removeWebhookSubscription(
  token: string,
  subscriptionId: string
) {
  const [deleteRequestError, response] = await until(() =>
    fetch(`${TWITCH_API_URL}/eventsub/subscriptions?id=${subscriptionId}`, {
      method: "DELETE",
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
      },
    })
  );

  return deleteRequestError == null && response.ok;
}

export async function createWebhookSubscription(
  token: string,
  userId: string,
  type: TwitchWebhookType = TwitchWebhookType.Subscribe
) {
  const [createRequestError, response] = await until(() =>
    fetch(`${TWITCH_API_URL}/eventsub/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-ID": process.env.TWITCH_CLIENT_ID!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        version: "1",
        condition: {
          broadcaster_user_id: userId,
        },
        transport: {
          method: "webhook",
          callback: `${BASE_URI}/api/webhooks/callbacks/subscription`,
          secret: process.env.SECRET,
        },
      }),
    })
  );

  if (createRequestError != null || !response.ok) {
    console.log({
      createRequestError,
      response,
      b: await response.text(),
      userId,
      token,
      id: process.env.TWITCH_CLIENT_ID,
      type,
    });
    return false;
  }

  const [parseError, body] = await until(() => response.json());

  if (parseError != null || body == null) {
    console.log({ parseError, body });
    return false;
  }

  const {
    data: [hook],
  } = body;

  return {
    id: hook.id,
    sub_type: hook.type,
  };
}
