import React, {useEffect, useRef, useState} from "react";
import GithubPicker from "@uiw/react-color-github";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import {api, type RouterOutputs} from "~/utils/api";

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

export default function Canvas({room}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const hoverPixelRef = useRef<HTMLDivElement>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>(
    room?.colors[0]?.value ?? "#000000",
  );
  const [hoverPixelPosition, setHoverPixelPosition] = useState<{
    x: number;
    y: number;
  }>({
    x: 0,
    y: 0,
  });


  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      context.current = canvas.getContext("2d");
    }
  }, [canvasRef]);

  const handlePixel = (x: number, y: number, color: string) => {
    if (!context || !context.current) {
      return;
    }

    const scaledX = Math.floor(x / multiplier);
    const scaledY = Math.floor(y / multiplier);

    context.current.fillStyle = color;
    context.current?.fillRect(
      scaledX * GAME_CONFIG.PIXEL_SIZE,
      scaledY * GAME_CONFIG.PIXEL_SIZE,
      GAME_CONFIG.PIXEL_SIZE,
      GAME_CONFIG.PIXEL_SIZE,
    );
  };

  const mutatePixel = api.room.place.useMutation();
  const {data, isSuccess} = api.room.getPixels.useQuery(
    {
      id: room.id,
    },
  );
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
    if (ev instanceof MouseEvent) {
      clientX = ev.clientX;
      clientY = ev.clientY;
    } else if (ev.touches.length > 0) {
      clientX = ev?.touches?.[0]?.clientX;
      clientY = ev?.touches?.[0]?.clientY;
    }

    if (!clientX || !clientY || !canvasRef.current) {
      return {x: 0, y: 0, clientX: 0, clientY: 0};
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const userX = clientX - rect.x;
    const userY = clientY - rect.y;

    const x = Math.floor(userX * (GAME_CONFIG.PIXEL_WIDTH / width));
    const y = Math.floor(userY * (GAME_CONFIG.PIXEL_HEIGHT / height));

    return {x, y, clientX, clientY};
  };

  const handleClick = (ev: MouseEvent | TouchEvent) => {
    ev.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
    const {x, y} = getPixelPos(ev);

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
    if (ev.target !== canvasRef.current || ev.button !== 0) {
      return;
    }
    handleClick(ev);
  };

  const onTouchStart = (ev: TouchEvent) => {
    if (ev.target !== canvasRef.current) {
      return;
    }
    handleClick(ev);
  };

  const updateHoverPixelPosition = (ev: MouseEvent | TouchEvent) => {
    const {x, y} = getPixelPos(ev);
    setHoverPixelPosition({x, y});
  };


  useEffect(() => {
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("contextmenu",
      (ev) => ev.preventDefault());
    document.addEventListener("mousemove", updateHoverPixelPosition);
    document.addEventListener("touchmove", updateHoverPixelPosition);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("contextmenu",
        (ev) => ev.preventDefault());
      document.removeEventListener("mousemove", updateHoverPixelPosition);
      document.removeEventListener("touchmove", updateHoverPixelPosition);
    };
  }, []);


  if (!room) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      <TransformWrapper
        ref={transformWrapperRef}
        initialScale={1}
        centerZoomedOut
        minScale={0.2}
        limitToBounds
        maxScale={12}
        onZoom={(zoom) => {
          setMultiplier(zoom.state.scale);
        }}
      >
        {({zoomIn, zoomOut, resetTransform}) => (
          <React.Fragment>
            <div className="pointer-events-none absolute top-10 z-[11] flex flex-col items-center gap-2 rounded-lg bg-gray-200 px-8 py-2">
              <div className="flex items-center">
                <h2 className="text-4xl font-bold text-gray-800">{room.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-gray-800">
                  {GAME_CONFIG.PIXEL_WIDTH}x{GAME_CONFIG.PIXEL_HEIGHT} pixels
                </h3>
                <span className="text-2xl">•</span>
                <h3 className="text-2xl font-bold text-gray-800">
                  3 million online
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-gray-800">
                  Coordinates:{" "}
                  {Math.floor(hoverPixelPosition.x)},{" "}
                  {Math.floor(hoverPixelPosition.y)}
                </h3>
              </div>
            </div>

            <div className="absolute left-5 top-5 z-10 mx-auto flex flex-col h-24">
              <div className="my-2 flex flex-col justify-center gap-2">
                <button
                  onClick={() => zoomIn()}
                  className="rounded-md bg-gray-200 p-1"
                >
                  +
                </button>
                <button
                  onClick={() => zoomOut()}
                  className="rounded-md bg-gray-200 p-1"
                >
                  -
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="rounded-md bg-gray-200 p-1"
                >
                  Reset
                </button>
              </div>
              <div className="flex flex-col gap-2">
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
            <TransformComponent wrapperStyle={{width: "100%", height: "calc(100vh - 96px)"}}>
              {hoverPixelPosition && (
                <div
                  ref={hoverPixelRef}
                  className="absolute left-0 top-0 z-10"
                  style={{
                    width: `${GAME_CONFIG.PIXEL_SIZE}px`,
                    height: `${GAME_CONFIG.PIXEL_SIZE}px`,
                    pointerEvents: "none",
                    transform: `translate(${hoverPixelPosition.x * 100}%, ${hoverPixelPosition.y * 100
                      }%)`,
                    backgroundColor: selectedColor,
                    outline: "solid 6px rgba(0,0,0,0.5)",
                  }}
                />
              )}
              <canvas
                ref={canvasRef}
                className="pixelated cursor-cross relative bg-white ring-2 ring-gray-200"
                style={{
                  width: GAME_CONFIG.CANVAS_SIZE,
                  height: GAME_CONFIG.CANVAS_SIZE,
                }}
                width={GAME_CONFIG.PIXEL_WIDTH * GAME_CONFIG.PIXEL_SIZE}
                height={GAME_CONFIG.PIXEL_HEIGHT * GAME_CONFIG.PIXEL_SIZE}
              />
            </TransformComponent>
          </div>
        )}
      </TransformWrapper>
    </div>
  );
}
