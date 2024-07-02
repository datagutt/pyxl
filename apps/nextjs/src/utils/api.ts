import {type NextPageContext} from "next";
import {
  createWSClient,
  loggerLink,
  unstable_httpBatchStreamLink,
  wsLink,
} from "@trpc/client";
import {createTRPCNext} from "@trpc/next";
import superjson from "superjson";

import type {AppRouter} from "@pyxl/api";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url

  return `http://localhost:3000`; // dev SSR should use localhost
};

function getEndingLink(ctx: NextPageContext | undefined) {
  if (typeof window === "undefined") {
    return unstable_httpBatchStreamLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers() {
        if (!ctx?.req?.headers) {
          return {};
        }
        // on ssr, forward client's headers to the server
        return {
          ...ctx.req.headers,
          'x-ssr': '1',
        };
      },
    });
  }
  const client = customWsClient(() => {
    // get next auth session cookie
    const cookie = ctx?.req?.headers.cookie
      ?.split(";")
      .find((c) => c.trim().startsWith("__Secure-next-auth.session-token") || c.trim().startsWith("next-auth.session-token"));
    const sessionToken = cookie?.split("=")[1];
    return `${process.env.NODE_ENV === "production" ? "wss://ws.pyxl.place" : "ws://localhost:3001"}?sessionToken=${sessionToken}`;
  }
  );
  return wsLink<AppRouter>({
    client,
  });
}
const customWsClient = (getUrl: () => string): ReturnType<typeof createWSClient> => {
  let client: ReturnType<typeof createWSClient> | undefined;
  let prevUrl: string;
  return {
    close() {
      client?.close();
      client = undefined;
    },
    getConnection: () => {
      if (!client) {
        throw new Error('No connection');
      } else {
        return client.getConnection();
      }
    },
    request(query, subscriber) {
      const url = getUrl();
      if (!client || prevUrl !== url) {
        client?.close();
        prevUrl = url;
        client = createWSClient({url});
      }
      return client.request(query, subscriber);
    },
  };
};

export const api = createTRPCNext<AppRouter>({
  config({ctx}) {
    return {
      transformer: superjson,
      /**
       * @link https://tanstack.com/query/v4/docs/react/reference/QueryClient
       */
      queryClientConfig: {defaultOptions: {queries: {staleTime: 60}}},
      links: [
        // adds pretty logs to your console in development and logs errors in production
        loggerLink({
          enabled: (opts) =>
            (process.env.NODE_ENV === "development" &&
              typeof window !== "undefined") ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        getEndingLink(ctx),
      ],
    };
  },
  ssr: true,
});

export {type RouterInputs, type RouterOutputs} from "@pyxl/api";
