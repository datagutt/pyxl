import {type NextPageContext} from "next";
import {
  createTRPCClient,
  createTRPCClientProxy,
  createWSClient,
  loggerLink,
  unstable_httpBatchStreamLink,
  wsLink,
} from "@trpc/client";
import {ssrPrepass} from '@trpc/next/ssrPrepass'
import {createTRPCNext} from "@trpc/next";
import superjson from "superjson";

import type {AppRouter} from "@pyxl/api";
import {getToken} from "next-auth/jwt";

const getBaseUrl = () => {
  if (process.env.NODE_ENV === "production") return `https://api.pyxl.place`; // prod should use pyxl.place (or your domain)
  //if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}/api/trpc`; // SSR should use vercel url

  return `http://localhost:3000/api/trpc`; // dev SSR should use localhost
};

function getEndingLink(ctx: NextPageContext | undefined) {
  if (typeof window === "undefined") {
    return unstable_httpBatchStreamLink({
      url: `${getBaseUrl()}`,
      transformer: superjson,
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

  return wsLink<AppRouter>({
    transformer: superjson,
    client: createWSClient({
      url: async () => {
        console.log("ctx", ctx);
        // get next auth session cookie
        const cookie = ctx?.req?.headers.cookie
          ?.split(";")
          .find((c) => c.trim().startsWith("__Secure-next-auth.session-token") || c.trim().startsWith("next-auth.session-token"));
        const sessionToken = cookie?.split("=")[1];
        return `${process.env.NODE_ENV === "production" ? "wss://ws.pyxl.place" : "ws://localhost:3001"}?sessionToken=${sessionToken}`;

      },
    }),
  });
}

export const proxy = createTRPCClient<AppRouter>({
  links: [
    unstable_httpBatchStreamLink({
      url: `${getBaseUrl()}`,
      transformer: superjson,
    }),
  ],
});

export const api = createTRPCNext<AppRouter>({
  config({ctx}) {
    return {
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
  transformer: superjson,
  ssrPrepass,
  ssr: true,
});

export {type RouterInputs, type RouterOutputs} from "@pyxl/api";
