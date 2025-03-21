import React, { useEffect, useRef, useState } from "react";
import GithubPicker from "@uiw/react-color-github";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { api, type RouterOutputs } from "~/utils/api";

type CanvasProps = {
  room: NonNullable<RouterOutputs["room"]["byName"]>;
};

type PixelPosition = {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
};

export const GAME_CONFIG = {
  PIXEL_SIZE: 30,
  PIXEL_WIDTH: 100,
  PIXEL_HEIGHT: 100,
  CANVAS_SIZE: 30 * 100,
};

export default function Canvas({ room }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const hoverPixelRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(
    room?.colors[0]?.value ?? "#000000",
  );
  const [touchID, setTouchID] = useState(0);
  const [touchStartTimestamp, setTouchStartTimestamp] = useState(0);
  const [hoverPixelPosition, setHoverPixelPosition] = useState<{
    x: number;
    y: number;
  }>({
    x: 0,
    y: 0,
  });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1; // Get the device pixel ratio (default to 1 if undefined)

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      context.current = canvas.getContext("2d");

      // Scale the context
      context?.current?.scale(dpr, dpr);
    }
  }, [canvasRef]);

  const handlePixel = (x: number, y: number, color: string) => {
    if (!context?.current) {
      return;
    }

    // Calculate the pixel position based on the pixel coordinates
    const pixelX = x * GAME_CONFIG.PIXEL_SIZE;
    const pixelY = y * GAME_CONFIG.PIXEL_SIZE;

    // Set the fill color
    context.current.fillStyle = color;

    // Fill the pixel
    context.current.fillRect(
      pixelX * dpr,
      pixelY * dpr,
      GAME_CONFIG.PIXEL_SIZE * dpr,
      GAME_CONFIG.PIXEL_SIZE * dpr,
    );
  };

  const mutatePixel = api.room.place.useMutation();
  const { data, isSuccess } = api.room.getPixels.useQuery({
    id: room.id,
  });
  useEffect(() => {
    if (isSuccess && data) {
      data.forEach((pixel) => {
        handlePixel(pixel.x, pixel.y, pixel.color);
      });
    }
  }, [data, isSuccess]);
  const placePixel = (x: number, y: number, color: string) => {
    console.log("WE PLACING", x, y, selectedColor, color);
    mutatePixel.mutate(
      {
        roomId: room.id,
        x,
        y,
        color,
      },
      {
        onSuccess: () => {
          console.log("WE PLACED");
          handlePixel(x, y, color);
        },
        onError: (error) => {
          console.error("NO PLACE", error);
        },
      },
    );
  };

  api.room.onPlace.useSubscription(
    {
      id: room.id,
    },
    {
      onData: (data) => {
        console.log("onPlace", data);
        handlePixel(data.x, data.y, data.color);
      },
      onError: (error) => {
        console.error("onPlace", error);
      },
    },
  );

  api.room.onBatchPixels.useSubscription(
    {
      id: room.id,
    },
    {
      onData: (data) => {
        console.log("onBatchPixels", data);
        data.forEach((pixel) => {
          handlePixel(pixel.x, pixel.y, pixel.color);
        });
      },
      onError: (error) => {
        console.error("onBatchPixels", error);
      },
    },
  );

  const getPixelPos = (ev: MouseEvent | TouchEvent): PixelPosition => {
    let clientX, clientY;

    // Get the clientX and clientY based on the event type
    if (ev instanceof MouseEvent) {
      clientX = ev.clientX;
      clientY = ev.clientY;
    } else if (ev.touches.length > 0) {
      clientX = ev?.touches?.[0]?.clientX;
      clientY = ev?.touches?.[0]?.clientY;
    }

    if (
      !clientX ||
      !clientY ||
      !canvasRef.current ||
      !transformWrapperRef.current
    ) {
      return { x: 0, y: 0, clientX: 0, clientY: 0 };
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const scale =
      transformWrapperRef.current.instance?.getContext().state.scale || 1;

    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;

    const canvasX = relativeX / scale;
    const canvasY = relativeY / scale;

    const x = Math.floor(canvasX / GAME_CONFIG.PIXEL_SIZE);
    const y = Math.floor(canvasY / GAME_CONFIG.PIXEL_SIZE);

    return { x, y, clientX, clientY };
  };

  const handleClick = (ev: MouseEvent | TouchEvent) => {
    ev.preventDefault();
    ev.stopPropagation(); // Add this line to stop event propagation

    const { x, y } = getPixelPos(ev);

    if (
      x >= 0 &&
      x < GAME_CONFIG.PIXEL_WIDTH &&
      y >= 0 &&
      y < GAME_CONFIG.PIXEL_HEIGHT
    ) {
      placePixel(x, y, selectedColor);
    }
  };

  const onMouseDown = (ev: MouseEvent) => {
    if (isPanning) return;
    if (ev.target !== canvasRef.current || ev.button !== 0) {
      return;
    }
    handleClick(ev);
  };

  const onTouchStart = (_ev: TouchEvent) => {
    /*if (isPanning) return;
    if (ev.target !== canvasRef.current) {
      return;
    }*/

    const thisTouch = touchID;
    setTouchStartTimestamp(new Date().getTime());

    setTimeout(() => {
      if (thisTouch == touchID) {
        navigator.vibrate(200);
      }
    }, 350);
  };

  const onTouchEnd = (ev: TouchEvent) => {
    /*if (isPanning) return;
    if (ev.target !== canvasRef.current) {
      return;
    }*/

    setTouchID(touchID + 1);
    const elapsed = new Date().getTime() - touchStartTimestamp;
    if (elapsed < 100) {
      handleClick(ev);
      navigator.vibrate(10);
    }
  };

  const onTouchMove = (_ev: TouchEvent) => {
    /*if (isPanning) return;
    if (ev.target !== canvasRef.current) {
      return;
    }*/

    setTouchID(touchID + 1);
  };

  const updateHoverPixelPosition = (ev: MouseEvent | TouchEvent) => {
    const { x, y } = getPixelPos(ev);
    setHoverPixelPosition({ x: Math.floor(x), y: Math.floor(y) });
  };

  useEffect(() => {
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("contextmenu", (ev) => ev.preventDefault());
    document.addEventListener("mousemove", updateHoverPixelPosition);
    document.addEventListener("touchmove", updateHoverPixelPosition);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("contextmenu", (ev) => ev.preventDefault());
      document.removeEventListener("mousemove", updateHoverPixelPosition);
      document.removeEventListener("touchmove", updateHoverPixelPosition);
    };
  });

  if (!room) {
    return null;
  }

  return (
    <TransformWrapper
      ref={transformWrapperRef}
      initialScale={1}
      centerZoomedOut
      minScale={0.2}
      limitToBounds
      maxScale={12}
      onPanningStart={() => setIsPanning(true)}
      onPanningStop={() => setIsPanning(false)}
      onPinchingStart={() => setIsPanning(true)}
      onPinchingStop={() => setIsPanning(false)}
    >
      {({ zoomIn, zoomOut, resetTransform, instance }) => (
        <React.Fragment>
          <div className="pointer-events-none absolute top-5 z-[11] flex w-full flex-col items-center gap-2 rounded-lg bg-white p-4 shadow">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold text-gray-800">{room.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {GAME_CONFIG.PIXEL_WIDTH}x{GAME_CONFIG.PIXEL_HEIGHT} pixels
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Coordinates: {Math.floor(hoverPixelPosition.x)},{" "}
                {Math.floor(hoverPixelPosition.y)}
              </h3>
            </div>
          </div>
          <div className="absolute bottom-5 left-5 z-10 flex flex-col gap-2 rounded-md bg-white p-4 shadow">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => zoomIn()}
                className="rounded-md bg-gray-200 p-2 text-gray-700"
              >
                Zoom In
              </button>
              <button
                onClick={() => zoomOut()}
                className="rounded-md bg-gray-200 p-2 text-gray-700"
              >
                Zoom Out
              </button>
              <button
                onClick={() => resetTransform()}
                className="rounded-md bg-gray-200 p-2 text-gray-700"
              >
                Reset Zoom
              </button>
            </div>
            <div className="mt-2">
              <GithubPicker
                colors={room.colors.map((color) => color.value)}
                color={selectedColor}
                onChange={(color) => {
                  console.log("SELECTED COLOR", color.hex);
                  setSelectedColor(color.hex);
                }}
              />
            </div>
          </div>
          {hoverPixelPosition && instance && instance.getContext()?.state && (
            <div
              ref={hoverPixelRef}
              className="pointer-events-none absolute z-10"
              style={{
                width: `${
                  GAME_CONFIG.PIXEL_SIZE * instance.getContext().state.scale
                }px`,
                height: `${
                  GAME_CONFIG.PIXEL_SIZE * instance.getContext().state.scale
                }px`,
                left: `${
                  Math.floor(hoverPixelPosition.x *
                    GAME_CONFIG.PIXEL_SIZE *
                    instance.getContext().state.scale +
                  instance.getContext().state.positionX)
                }px`,
                top: `${
                  Math.floor(hoverPixelPosition.y *
                    GAME_CONFIG.PIXEL_SIZE *
                    instance.getContext().state.scale +
                  instance.getContext().state.positionY)
                }px`,
                backgroundColor: selectedColor,
                opacity: 0.6,
                border: `1px solid rgba(0,0,0,0.8)`,
                boxSizing: "border-box", // Ensure border is inside the width and height
              }}
            />
          )}
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "calc(100vh - 96px)" }}
          >
            <canvas
              ref={canvasRef}
              className="pixelated cursor-cross relative bg-white ring-2 ring-gray-400"
              style={{
                width: `${GAME_CONFIG.PIXEL_WIDTH * GAME_CONFIG.PIXEL_SIZE}px`,
                height: `${
                  GAME_CONFIG.PIXEL_HEIGHT * GAME_CONFIG.PIXEL_SIZE
                }px`,
              }}
              width={GAME_CONFIG.PIXEL_WIDTH * GAME_CONFIG.PIXEL_SIZE * dpr}
              height={GAME_CONFIG.PIXEL_HEIGHT * GAME_CONFIG.PIXEL_SIZE * dpr}
            />
          </TransformComponent>
        </React.Fragment>
      )}
    </TransformWrapper>
  );
}
