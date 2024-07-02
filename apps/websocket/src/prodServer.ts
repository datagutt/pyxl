import {createHTTPServer} from "@trpc/server/adapters/standalone";
import {applyWSSHandler} from "@trpc/server/adapters/ws";
import dotenv from "dotenv";
import {WebSocketServer} from "ws";

import {appRouter, createTRPCContext} from "@pyxl/api";

dotenv.config();

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
// HTTP server
const server = createHTTPServer({
  router: appRouter,
  createContext: createTRPCContext,
});

// WS server
const wss = new WebSocketServer({port: port + 1});
const handler = applyWSSHandler({
  wss,
  router: appRouter,
  createContext: createTRPCContext,
});
console.log(
  `✅ WebSocket Server listening on http://localhost:${port} as ${dev ? "development" : process.env.NODE_ENV
  }`,
);

process.on("SIGTERM", () => {
  console.log("SIGTERM");
  handler.broadcastReconnectNotification();
  wss.close();
});

server.listen(port);
