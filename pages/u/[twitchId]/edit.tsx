import * as Cookie from "cookie";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { until } from "@open-draft/until";
import { useCallback, useMemo } from "react";

import { TwitchUser, verifyUserToken, TwitchWebhookType } from "lib/twitch";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  listRewardsForUser,
  TwitchWebhookSub,
  UserSubReward,
} from "lib/supabase";
import { useRewards } from "hooks/useRewards";
import { useActiveWebhooks } from "hooks/useActiveWebhooks";
import { getTwitchEventFriendlyName } from "utils/getTwitchEventFriendlyName";

type Inputs = {
  subCount: number;
  reward: string;
};

interface Props {
  user?: TwitchUser;
  rewards?: UserSubReward[];
}

export default function EditGoals(props: Props) {
  const router = useRouter();
  const { register, handleSubmit } = useForm<Inputs>();
  const { data: activeWebhooks = [], mutate: mutateActiveWebhooks } =
    useActiveWebhooks(props.user?.id);
  const { data, mutate } = useRewards(router.query.twitchId as string, {
    initialData: props.rewards,
  });
  const onSubmit: SubmitHandler<Inputs> = (data) => {
    fetch("/api/rewards/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async (response) => {
      if (response.ok) {
        const r = (await response.json()) as UserSubReward;

        mutate((currentData) => [r, ...(currentData ?? [])], true);
      }
    });

    mutate((currentData) => [
      {
        reward: data.reward,
        sub_count: data.subCount,
        id: Date.now(),
        user_id: props.user?.id ?? "",
      },
      ...(currentData ?? []),
    ]);
  };

  const connectToUserStreamEvents = useCallback(async () => {
    const [connectError, response] = await until(() =>
      fetch("/api/webhooks/connect", { method: "POST" })
    );

    if (connectError != null || !response.ok) {
      // TODO: display this on the screen.
      console.error("Oops, couldn't connect you to twitch events.");

      return;
    }

    mutateActiveWebhooks((whs) => whs, true);
  }, []);

  const hasRequiredWebhooks = useMemo(() => {
    return (
      activeWebhooks.filter((wh) =>
        [TwitchWebhookType.Online, TwitchWebhookType.Offline].includes(
          wh.sub_type as TwitchWebhookType
        )
      ).length === 2
    );
  }, [activeWebhooks]);

  const currentlyMeasuring: TwitchWebhookSub | undefined = useMemo(() => {
    return activeWebhooks.filter((wh) =>
      [TwitchWebhookType.Subscribe, TwitchWebhookType.Follow].includes(
        wh.sub_type as TwitchWebhookType
      )
    )[0];
  }, [activeWebhooks]);

  const trackEventsFor = (sub_type: TwitchWebhookType) => async () => {
    if (currentlyMeasuring != null) {
      const [unSubError, unSubResponse] = await until(() =>
        fetch("/api/webhooks/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sub_type: currentlyMeasuring.sub_type }),
        })
      );

      if (unSubError != null || !unSubResponse.ok) {
        // TODO: display this on the screen.
        console.error(
          `Oops, could not unsubscribe you from receiving ${currentlyMeasuring.sub_type} events. You can only subscribe to one at a time.`
        );
        return;
      }
    }

    const [subError, response] = await until(() =>
      fetch("/api/webhooks/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sub_type }),
      })
    );

    if (subError != null || !response.ok) {
      // TODO: display this on the screen.
      console.error(
        `Oops, there was an issue subscribe you to twitch events for ${sub_type}`
      );

      return;
    }

    mutateActiveWebhooks((whs) => whs, true);
  };

  const removeAllRewards = useCallback(() => {
    fetch(`/api/rewards/remove?all=true`, { method: "DELETE" });

    mutate([]);
  }, []);

  const removeReward = useCallback((reward: UserSubReward, idx: number) => {
    fetch(`/api/rewards/remove?id=${reward.id}`, { method: "DELETE" });

    mutate((currentRewards) => {
      const copy = [...(currentRewards ?? [])];

      copy.splice(idx, 1);

      return copy;
    }, true);
  }, []);

  return (
    <div>
      <div>
        <p>
          Twitch events: {hasRequiredWebhooks ? "connected" : "not connected"}
        </p>
        {!hasRequiredWebhooks ? (
          <button onClick={connectToUserStreamEvents}>
            Connect twitch events
          </button>
        ) : null}
      </div>
      {hasRequiredWebhooks && (
        <div>
          <p>What would you like to track?</p>
          {currentlyMeasuring != null ? (
            <p>
              You are currently tracking:{" "}
              {getTwitchEventFriendlyName(
                currentlyMeasuring.sub_type as TwitchWebhookType
              )}
            </p>
          ) : (
            <p>
              You are not currently tracking anything. To use the app you'll
              have to track at least on of the topics listed below.
            </p>
          )}
          <ul>
            <li>
              <button
                disabled={
                  currentlyMeasuring?.sub_type === TwitchWebhookType.Follow
                }
                onClick={trackEventsFor(TwitchWebhookType.Follow)}
              >
                Follows
              </button>
            </li>
            <li>
              <button
                disabled={
                  currentlyMeasuring?.sub_type === TwitchWebhookType.Subscribe
                }
                onClick={trackEventsFor(TwitchWebhookType.Subscribe)}
              >
                Subs
              </button>
            </li>
          </ul>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <input
          placeholder="Subs required to get the reward"
          type="number"
          {...register("subCount", { required: true })}
        />

        <input
          placeholder="The reward"
          {...register("reward", { required: true })}
        />
        <input type="submit" />
      </form>
      <button onClick={removeAllRewards}>Reset all rewards</button>
      {/* use browser dialog? to confirm delete all */}
      <ul>
        {data?.map((reward, idx) => (
          <li key={reward.id}>
            For {reward.sub_count} event you will {reward.reward}
            <button onClick={() => removeReward(reward, idx)}>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
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

    try {
      const { t } = JSON.parse(__twtk);

      const login = await verifyUserToken(t);

      if (params.twitchId !== login) {
        redirectHome();

        return { props: {} };
      }

      user = JSON.parse(userString);
    } catch {
      // Do nothing it's all good.
    }

    if (user == null) {
      redirectHome();

      return { props: {} };
    }

    const rewards = await listRewardsForUser(user);

    return {
      props: {
        user,
        rewards,
      },
    };
  };
