import * as Cookie from "cookie";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";

import { TwitchUser, verifyUserToken } from "lib/twitch";
import { SubmitHandler, useForm } from "react-hook-form";
import { listRewardsForUser, UserSubReward } from "lib/supabase";
import { useRewards } from "hooks/useRewards";
import { useActiveWebhooks } from "hooks/useActiveWebhooks";

type Inputs = {
  subCount: number;
  reward: string;
};

interface Props {
  user?: TwitchUser;
  rewards?: UserSubReward[];
}

// TODO: allow switching between listening on followers and subscribers
// TODO: make sure user has subs for turning on and off streams
export default function EditGoals(props: Props) {
  const router = useRouter();
  const { register, handleSubmit } = useForm<Inputs>();
  const { data: activeWebhooks } = useActiveWebhooks(props.user?.id);
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

  console.log(activeWebhooks);
  // should have at least online and offline subs.
  //    if one of the above is missing we can update them
  // then one or none of Subscribe | Follow
  //    can toggling between these

  return (
    <div>
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
      {/* list all the current rewards in order of subCount */}
      <ul>
        {data?.map(
          (reward) => (
            console.log(reward),
            (
              <li key={reward.id}>
                For {reward.sub_count} subs you will give {reward.reward}
              </li>
            )
          )
        )}
      </ul>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps =
  async function getServerSideProps(context) {
    const {
      headers: { cookie },
    } = context.req;

    const redirectHome = () => {
      context.res.statusCode = 302;
      context.res.setHeader("Location", "/");
    };

    if (cookie == null) {
      redirectHome();

      return { props: {} };
    }

    const { __twRw: userString, __twtk } = Cookie.parse(cookie);

    let user = null;

    try {
      const { t } = JSON.parse(__twtk);

      const valid = await verifyUserToken(t);

      if (!valid) {
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
