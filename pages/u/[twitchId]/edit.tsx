import * as Cookie from "cookie";
import { GetServerSideProps } from "next";
import useSWR from "swr";
import { until } from "@open-draft/until";

import { TwitchUser, verifyUserToken } from "lib/twitch";
import { SubmitHandler, useForm } from "react-hook-form";
import { listRewardsForUser, UserSubReward } from "lib/supabase";

type Inputs = {
  subCount: number;
  reward: string;
};

async function fetcher(route: string) {
  const [fetchError, response] = await until(() => fetch(route));

  if (fetchError != null || !response.ok) {
    return [];
  }

  const [parseError, data] = await until(() => response.json());

  if (parseError != null || data == null) {
    return [];
  }

  return data;
}

interface Props {
  user?: TwitchUser;
  rewards?: UserSubReward[];
}

export default function EditGoals(props: Props) {
  const { register, handleSubmit } = useForm<Inputs>();
  const { data, mutate } = useSWR<UserSubReward>("/api/rewards/list", fetcher, {
    initialData: props.rewards,
  });
  const onSubmit: SubmitHandler<Inputs> = (data) => {
    fetch("/api/rewards/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    mutate(
      (currentData) => [
        { reward: data.reward, sub_count: data.subCount, id: Date.now() },
        ...(currentData ?? []),
      ],
      true
    );
  };

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
