import Head from "next/head";
import { GetStaticProps } from "next";

type Props = {
  buildId: string;
};

export default function Custom500({ buildId }: Props) {
  return (
    <>
      <Head>
        <title>Server Error</title>
      </Head>
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#0b0b0f",
          color: "#f5f5f5",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div>
          <p style={{ fontSize: "1rem", letterSpacing: "0.08em", opacity: 0.7 }}>
            Error 500
          </p>
          <h1 style={{ fontSize: "2.5rem", margin: "0.5rem 0 1rem" }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: "34rem", margin: "0 auto" }}>
            We hit an unexpected error. Please refresh the page or try again in a moment.
          </p>
          <p style={{ marginTop: "1.5rem", opacity: 0.5, fontSize: "0.9rem" }}>
            Build: {buildId}
          </p>
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  return {
    props: {
      buildId: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    },
  };
};
