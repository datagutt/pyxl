import {createHTTPServer} from "@trpc/server/adapters/standalone";
import {applyWSSHandler} from "@trpc/server/adapters/ws";
import dotenv from "dotenv";
import {WebSocketServer} from "ws";
import cors from 'cors';

import {appRouter, createTRPCContext} from "@pyxl/api";

dotenv.config();

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";


// WS server
const wss = new WebSocketServer({noServer: true});
const handler = applyWSSHandler({
  wss,
  // Enable heartbeat messages to keep connection open (disabled by default)
  keepAlive: {
    enabled: true,
    // server ping message interval in milliseconds
    pingMs: 30000,
    // connection is terminated if pong message is not received in this many milliseconds
    pongWaitMs: 5000,
  },
  router: appRouter,
  createContext: createTRPCContext,
});

// HTTP server
const server = createHTTPServer({
  middleware: cors(),
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

server?.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket as any, head, (client) => {
    wss.emit('connection', client, request);
  });
});


server.listen(port);
