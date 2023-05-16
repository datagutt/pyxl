import EventEmitter from "eventemitter3";

import { type Pixel } from "./services/pixel.service";

interface ServerEventEmitter extends EventEmitter {
  "room.info": (info: string) => void;
  "room.pixel": (pixel: Pixel) => void;
  "room.batchPixels": (pixels: Pixel[]) => void;
}
const ee = new EventEmitter<ServerEventEmitter>();

export default ee;
