import { authRouter } from "./router/auth";
import { roomRouter } from "./router/room";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  room: roomRouter,
  auth: authRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
