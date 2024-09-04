import {observable} from "@trpc/server/observable";
import {z} from "zod";

import ee from "../eventEmitter";
import {PixelService, type Pixel} from "../services/pixel.service";
import {createTRPCRouter, protectedProcedure, publicProcedure} from "../trpc";

const defaultColors = [
  "#000000",
  "#FFFFFF",
  "#E4E4E4",
  "#888888",
  "#22234A",
  "#FFA7D1",
  "#E50000",
  "#E59500",
  "#A06A42",
  "#E5D900",
  "#94E044",
  "#02BE01",
  "#00E5F0",
  "#0083C7",
  "#0000EA",
  "#E04AFF",
];

export const roomRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ctx}) => {
    return await ctx.prisma.room.findMany({
      orderBy: {id: "desc"},
      include: {colors: {select: {value: true}}},
    });
  }),
  byName: publicProcedure
    .input(z.object({name: z.string()}))
    .query(({ctx, input}) => {
      return ctx.prisma.room.findFirst({
        where: {name: input.name},
        include: {colors: {select: {value: true}}},
      });
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ctx, input}) => {
      return await ctx.prisma.room.create({
        data: {
          ...input,
          ownerId: ctx.session?.user?.id,
          colors: {
            create: defaultColors.map((value) => ({value})),
          },
        },
      });
    }),
  delete: protectedProcedure.input(z.string()).mutation(({ctx, input}) => {
    const pixelService = PixelService.getInstance();
    if (!ctx.session?.user) {
      throw new Error("User not authenticated");
    }
    return pixelService.deleteRoom(input, ctx.session.user.id);
  }),
  getPixels: publicProcedure
    .input(z.object({id: z.string()}))
    .query(({input}) => {
      const pixelService = PixelService.getInstance();
      const pixels = pixelService.getPixels(input.id);
      return pixels;
    }),
  onBatchPixels: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .subscription(({input}) => {
      return observable<Pixel[]>((emit) => {
        const onBatchPixels = (data: Pixel[]) => {
          // emit data to client
          emit.next(
            data
              .filter((pixel) => pixel.room.id === input.id)
              .map(
                (pixel) => ({...pixel, room: undefined} as unknown as Pixel),
              ),
          );
        };
        ee.on("room.batchPixels", onBatchPixels);
        // unsubscribe function when client disconnects or stops subscribing
        return () => {
          ee.off("room.batchPixels", onBatchPixels);
        };
      });
    }),
  onPlace: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .subscription(({input}) => {
      return observable<Pixel>((emit) => {
        const onAdd = (data: Pixel) => {
          if (data?.room.id !== input.id) {
            return;
          }
          // emit data (without room) to client
          emit.next({...data, room: undefined} as unknown as Pixel);
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
        roomId: z.string().min(1),
        x: z.number().min(0),
        y: z.number().min(0),
        color: z.string().min(1),
      }),
    )
    .mutation(async ({ctx, input}) => {
      const pixelService = PixelService.getInstance();
      // the service emits an event
      await pixelService.setPixel(
        input.x,
        input.y,
        input.color,
        ctx?.session?.user?.id,
        input.roomId,
      );
    }),
});
