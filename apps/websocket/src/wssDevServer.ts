import {createHTTPServer} from "@trpc/server/adapters/standalone";
import {applyWSSHandler} from "@trpc/server/adapters/ws";
import {WebSocketServer} from "ws";
import cors from 'cors';

import {appRouter, createTRPCContext} from "@pyxl/api";

const port = '3001';


// WS server
const wss = new WebSocketServer({noServer: true});
const handler = applyWSSHandler({
  wss,
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
  `✅ WebSocket Server listening on http://localhost:${port}`,
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
