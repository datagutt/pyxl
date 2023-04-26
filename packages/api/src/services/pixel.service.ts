import { open, type Database, type RootDatabase } from "lmdb";

import { prisma, type Color, type Room } from "@pyxl/db";

import eventEmitter from "../eventEmitter";

export type Pixel = {
  x: number;
  y: number;
  color: string;
  userId: string;
  room: Room;
};

export type RoomWithColors = Room & {
  colors: { color: Color }[];
};

export class PixelService {
  private db: RootDatabase;

  private constructor() {
    this.db = open({
      path: "./data",
      mapSize: 1024 * 1024 * 1024,
      pageSize: 8192,
      useVersions: true,
      strictAsyncOrder: true,
      cache: true,
      compression: true,
    });
  }

  private static instance: PixelService;

  public static getInstance(): PixelService {
    if (!PixelService.instance) {
      PixelService.instance = new PixelService();
    }
    return PixelService.instance;
  }

  public async getRoom(roomId: string): Promise<RoomWithColors> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { colors: { select: { color: true } } },
    });
    if (!room) {
      throw new Error("Room not found");
    }
    return room;
  }

  public async getPixel(x: number, y: number, roomId: number): Promise<Pixel> {
    const room = await this.getRoom(roomId);
    const db = this.db.openDB({ name: room.id.toString() });
    return db.transaction(() => {
      const value = this.db.getBinary(`${x}:${y}`);
      if (value) {
        const [color, userId] = value?.toString().split(":");
        return { x, y, color, userId, room } as Pixel;
      }
      return { x, y, color: "white", userId: "", room };
    });
  }

  public async getPixels(roomId: number): Promise<Pixel[]> {
    const room = await this.getRoom(roomId);
    const db = this.db.openDB({ name: room.id.toString() });
    return db.transaction(() => {
      const pixels = [];
      for (const { key, value } of this.db.getRange()) {
        const [x, y] = key.toString().split(":");
        const [color, userId] = value?.toString().split(":");
        pixels.push({
          x: Number(x),
          y: Number(y),
          color,
          userId,
          room,
        } as Pixel);
      }
      return pixels;
    });
  }

  public async setPixel(
    x: number,
    y: number,
    color: string,
    userId: string,
    roomId: string,
  ): Promise<Pixel> {
    const room = await this.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // check if  color is valid for room
    const dbColor = room.colors.find(({ color }) => color === color);
    if (!dbColor) {
      throw new Error("Invalid color");
    }

    const db = this.db.openDB({ name: room.id.toString() });
    await db.transaction(() => {
      db.put(`${x}:${y}`, `${color}:${userId}`);
      eventEmitter.emit("room.pixel", { x, y, color, userId, room });
    });
    return { x, y, color, userId, room };
  }
}
