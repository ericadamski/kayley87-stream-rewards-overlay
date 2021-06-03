import { GetServerSideProps } from "next";
import styled from "styled-components";

import { User, getUserByTwitchLogin } from "lib/supabase";
import Router from "next/router";
import { useEffect } from "react";

interface Props {
  user?: User;
}

export default function UserPage(props: Props) {
  useEffect(() => {
    if (props.user == null) {
      Router.replace("/");
    }
  }, []);

  if (props.user == null) {
    return null;
  }

  return (
    <ProgressContainer>
      <ProgressBar />
    </ProgressContainer>
  );
}

export const getServerSideProps: GetServerSideProps =
  async function getServerSideProps(context) {
    const { twitchId } = context.params as { twitchId: string };

    const redirectHome = () => {
      context.res.statusCode = 302;
      context.res.setHeader("Location", "/");
    };

    if (twitchId == null) {
      redirectHome();

      return { props: {} };
    }

    const user = await getUserByTwitchLogin(twitchId);

    if (user == null) {
      redirectHome();

      return { props: {} };
    }

    return {
      props: {
        user,
      },
    };
  };

const ProgressContainer = styled.div`
  box-sizing: border-box;
  height: 100vh;
  padding: 2rem;
`;

const ProgressBar = styled.div`
  height: 100%;
  width: 1rem;
  background-color: #a594eb;
  border-radius: 1rem;
`;
