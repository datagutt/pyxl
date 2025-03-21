import { type NextPageContext } from "next";
import {
  createTRPCClient,
  createWSClient,
  httpBatchLink,
  loggerLink,
  wsLink,
} from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import { ssrPrepass } from "@trpc/next/ssrPrepass";
import superjson from "superjson";

import type { AppRouter } from "@pyxl/api";

const getBaseUrl = () => {
  if (process.env.NODE_ENV == "development") return `http://localhost:3001`; // dev SSR should use localhost

  return `https://api.pyxl.place`; // prod should use pyxl.place (or your domain)
};

function getEndingLink(ctx: NextPageContext | undefined) {
  if (typeof window === "undefined") {
    return httpBatchLink({
      url: `${getBaseUrl()}`,
      transformer: superjson,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
      headers() {
        if (!ctx?.req?.headers) {
          return {};
        }
        // on ssr, forward client's headers to the server
        return {
          cookie: ctx.req.headers.cookie,
          authorization: ctx.req.headers.authorization,
          "x-forwarded-for": ctx.req.headers["x-forwarded-for"],
          "x-forwarded-proto": ctx.req.headers["x-forwarded-proto"],
          "x-forwarded-host": ctx.req.headers["x-forwarded-host"],
          "x-real-ip": ctx.req.headers["x-real-ip"],
          "x-ssr": "1",
        };
      },
    });
  }

  return wsLink<AppRouter>({
    transformer: superjson,
    client: createWSClient({
      url: () => {
        return `${
          process.env.NODE_ENV === "production"
            ? "wss://ws.pyxl.place"
            : "ws://localhost:3001"
        }`;
      },
      connectionParams: async () => {
        const session = await proxy.auth.getSession.query();
        console.log(session, ctx?.req?.headers);
        console.log("token", session?.user?.access_token);
        // get next auth session cookie
        const cookie = ctx?.req?.headers.cookie
          ?.split(";")
          .find(
            (c) =>
              c.trim().startsWith("__Secure-next-auth.session-token") ||
              c.trim().startsWith("next-auth.session-token"),
          );
        const sessionToken =
          session?.user?.access_token ?? cookie?.split("=")[1];
        return {
          sessionToken,
        };
      },
    }),
  });
}

export const proxy = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
      transformer: superjson,
    }),
  ],
});

export const api = createTRPCNext<AppRouter>({
  config({ ctx }) {
    return {
      /**
       * @link https://tanstack.com/query/v4/docs/react/reference/QueryClient
       */
      queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
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

export { type RouterInputs, type RouterOutputs } from "@pyxl/api";
