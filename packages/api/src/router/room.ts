import { observable } from "@trpc/server/observable";
import { z } from "zod";

import { type Room } from "@pyxl/db";

import ee from "../eventEmitter";
import { PixelService, type Pixel } from "../services/pixel.service";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const roomRouter = createTRPCRouter({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.room.findMany({ orderBy: { id: "desc" } });
  }),
  byName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.room.findFirst({ where: { name: input.name } });
    }),
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.room.create({ data: input });
    }),
  delete: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return ctx.prisma.room.delete({ where: { id: input } });
  }),
  onJoin: publicProcedure
    .input(
      z.object({
        id: z.string().nonempty(),
      }),
    )
    .subscription(() => {
      return observable<Room>((emit) => {
        const onAdd = (data: Room) => {
          // emit data to client
          emit.next(data);
        };
        ee.on("room.info", onAdd);
        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("room.info", onAdd);
        };
      });
    }),
  onPlace: publicProcedure
    .input(
      z.object({
        id: z.string().nonempty(),
      }),
    )
    .subscription(() => {
      return observable<Pixel>((emit) => {
        const onAdd = (data: Pixel) => {
          // emit data to client
          emit.next(data);
        };
        ee.on("room.pixel", onAdd);
        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("room.pixel", onAdd);
        };
      });
    }),
  place: protectedProcedure
    .input(
      z.object({
        roomId: z.string().nonempty(),
        x: z.number().min(0),
        y: z.number().min(0),
        color: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pixelService = PixelService.getInstance();
      // the service emits an event
      await pixelService.setPixel(
        input.x,
        input.y,
        input.color,
        ctx?.user?.id,
        input.roomId,
      );
    }),
});
