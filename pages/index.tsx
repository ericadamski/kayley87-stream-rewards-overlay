import { GetServerSideProps } from "next";
import { v4 as uuidv4 } from "uuid";

import * as Twitch from "lib/twitch";
import { useEffect } from "react";

interface Props {
  twitchAuthUrl: string;
  state: string;
}

export default function Home(props: Props) {
  useEffect(() => {
    if (typeof window !== undefined) {
      localStorage.setItem("__twRw", props.state);
    }
  }, [props.state]);

  return (
    <a href={props.twitchAuthUrl}>
      <button>log in with Twitch</button>
    </a>
  );
}

export const getServerSideProps: GetServerSideProps<Props> =
  async function getServerSideProps() {
    const state = uuidv4();

    return {
      props: {
        twitchAuthUrl: Twitch.getOAuthUrl(state),
        state,
      },
    };
  };
