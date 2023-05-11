import { type NextPageContext } from "next";
import {
  createWSClient,
  httpBatchLink,
  loggerLink,
  wsLink,
} from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import superjson from "superjson";

import type { AppRouter } from "@pyxl/api";

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url

  return `http://localhost:3000`; // dev SSR should use localhost
};

function getEndingLink(ctx: NextPageContext | undefined) {
  if (typeof window === "undefined") {
    return httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers() {
        if (!ctx?.req?.headers) {
          return {};
        }
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          connection: _connection,
          ...headers
        } = ctx.req.headers;
        // on ssr, forward client's headers to the server
        return {
          ...headers,
          "x-ssr": "1",
        };
      },
    });
  }
  const client = createWSClient({
    url:
      process.env.NODE_ENV === "production"
        ? "wss://ws.pyxl.place"
        : "ws://localhost:3001",
  });
  return wsLink<AppRouter>({
    client,
  });
}

export const api = createTRPCNext<AppRouter>({
  config({ ctx }) {
    return {
      transformer: superjson,
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
  ssr: false,
});

export { type RouterInputs, type RouterOutputs } from "@pyxl/api";
