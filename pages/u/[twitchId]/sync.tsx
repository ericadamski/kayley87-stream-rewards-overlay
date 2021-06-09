import * as Cookie from "cookie";
import { GetServerSideProps } from "next";

import {
  verifyUserToken,
  getLast100SubsForUser,
  TwitchWebhookType,
} from "lib/twitch";
import {
  TwitchUserEvent,
  getAllUserEventDataFor,
  getCurrentLiveStreamForUserId,
  bulkAddUserEvents,
} from "lib/supabase";

export default function Sync() {
  return "Sync-ing subs with twitch, when done will re-direct.";
}

export const getServerSideProps: GetServerSideProps =
  async function getServerSideProps({ params, req, res }) {
    const {
      headers: { cookie },
    } = req;

    const redirectHome = () => {
      res.statusCode = 302;
      res.setHeader("Location", "/");
    };

    if (cookie == null) {
      redirectHome();

      return { props: {} };
    }

    if (params?.twitchId == null) {
      redirectHome();

      return { props: {} };
    }

    const { __twRw: userString, __twtk } = Cookie.parse(cookie);

    let user = null;
    let token = null;

    try {
      const { t } = JSON.parse(__twtk);

      const login = await verifyUserToken(t);

      if (params.twitchId !== login) {
        redirectHome();

        return { props: {} };
      }

      token = t;

      user = JSON.parse(userString);
    } catch {
      // Do nothing it's all good.
    }

    if (user == null) {
      redirectHome();

      return { props: {} };
    }

    // get all subs from twitch
    const subs = await getLast100SubsForUser(token, user);
    const stream = await getCurrentLiveStreamForUserId(user.id);

    if (stream == null) {
      redirectHome();

      return { props: {} };
    }
    // get all subs from out db
    const { events } = await getAllUserEventDataFor(
      user.id,
      stream.id,
      TwitchWebhookType.Subscribe
    );

    if (events == null) {
      redirectHome();

      return { props: {} };
    }

    const alreadyCountedSubIds = events.map(
      ({ event_user_id }) => event_user_id
    );
    let subsToAdd: Omit<TwitchUserEvent, "id">[] = [];

    console.log({ subs, events });

    // get all of the subs in subs that are not in userEvents
    for (const sub of subs) {
      if (!alreadyCountedSubIds.includes(sub.user_id)) {
        subsToAdd.push({
          user_id: user.id,
          stream_id: stream.id,
          event_user_id: sub.user_id,
          event_user_login: sub.user_login,
          event_user_name: sub.user_name,
          event_type: TwitchWebhookType.Subscribe,
          created_at: new Date().toISOString(),
        });
      }
    }

    // update them!
    await bulkAddUserEvents(subsToAdd);

    return {
      props: {},
    };
  };
