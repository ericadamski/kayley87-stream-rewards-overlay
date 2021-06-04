import { UserSubReward } from "lib/supabase";
import { sortBy } from "ramda";

export function getNextReward(
  currentSubCount: number,
  rewards: UserSubReward[]
): [next: UserSubReward, whatsLeft: UserSubReward[]] {
  const sortedRewards = sortBy((r) => r.sub_count, rewards);
  let highest = 0;

  for (let i = 1; i <= sortedRewards.length; i++) {
    if (sortedRewards[highest].sub_count > currentSubCount) {
      break;
    }

    highest = i;
  }

  return [
    sortedRewards[highest],
    sortedRewards.slice(highest, sortedRewards.length),
  ];
}
