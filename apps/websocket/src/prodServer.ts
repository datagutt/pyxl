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

var whitelist = ['https://pyxl.place', 'https://www.pyxl.place', 'https://api.pyxl.place', 'https://ws.pyxl.place', 'http://localhost:3000', 'http://localhost:3001'];
var corsOptions = {
  methods: ["GET", "POST", "OPTIONS"],
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`))
    }
  }
}
// HTTP server
const server = createHTTPServer({
  middleware: cors(corsOptions),
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
