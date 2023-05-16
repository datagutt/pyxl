import React, { useEffect, useRef, useState } from "react";
import { Router } from "next/router";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { Room } from "@pyxl/db";

import { RouterOutputs, api } from "~/utils/api";
import { getCanvasScaledValue } from "~/utils/canvas";

type CanvasProps = {
  width: number;
  height: number;
  room: Room;
};

const PIXEL_SIZE = 1;

export default function Canvas({ width, height, room }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [shouldPlacePixel, setShouldPlacePixel] = useState(false);
  const shouldColorPickTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.current = canvas.getContext("2d");
    }
    /*for (let i = 0; i < 100; i++) {
      const color = Math.floor(Math.random() * 16777215).toString(16);
      const w = Math.floor(Math.random() * width);
      const h = Math.floor(Math.random() * height);
      for (let j = 0; j < 100; j++) {
        handlePixel(w + j, h + j, color);
      }
    }*/
  }, [canvasRef, width, height]);

  const handlePixel = (x: number, y: number, color: string) => {
    if (!context || !context.current) {
      return;
    }

    const scaledX = Math.floor(x / multiplier);
    const scaledY = Math.floor(y / multiplier);

    context.current.fillStyle = `#${color}`;
    context.current?.fillRect(scaledX, scaledY, PIXEL_SIZE, PIXEL_SIZE);
  };

  const mutatePixel = api.room.place.useMutation();
  api.room.getPixels.useQuery(
    {
      id: room.id,
    },
    {
      onSuccess: (data) => {
        console.log("getPixels", data);
        data.forEach((pixel) => {
          handlePixel(pixel.x, pixel.y, pixel.color);
        });
      },
      onError: (error) => {
        console.error("getPixels", error);
      },
    },
  );
  const placePixel = (x: number, y: number, color: string) => {
    mutatePixel.mutate(
      {
        roomId: room.id,
        x,
        y,
        color,
      },
      {
        onSuccess: (data) => {
          console.log("placePixel", data);
          handlePixel(x, y, color);
        },
        onError: (error) => {
          console.error("placePixel", error);
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

  window.oncontextmenu = () => false;
  document.onmousedown = (ev) => {
    switch (ev.button) {
      case 0:
        setShouldPlacePixel(true);
        handleClick(ev.clientX, ev.clientY, ev.target);
        break;
    }
  };

  document.onmousemove = (ev) => {
    clearTimeout(shouldColorPickTimeout?.current);
    setShouldPlacePixel(false);
  };

  document.ontouchstart = (ev) => {
    if (!ev?.touches?.[0]) return;
    clearTimeout(shouldColorPickTimeout?.current);
    handleClick(
      ev?.touches?.[0]?.clientX,
      ev?.touches?.[0].clientY,
      ev.target,
      true,
    );
  };

  document.ontouchmove = (ev) => {
    setShouldPlacePixel(false);
  };

  const handleClick = (x: number, y: number, target: any, touch = false) => {
    if (target !== canvasRef.current) {
      return;
    }

    if (touch) {
      shouldColorPickTimeout.current = setTimeout(() => {
        setShouldPlacePixel(false);

        document.ontouchend = null;
        document.ontouchmove = null;
      }, 500);
    }

    if (shouldPlacePixel) {
      const color = Math.floor(Math.random() * 16777215).toString(16);
      const cssScaleX = getCanvasScaledValue(
        canvasRef.current!.width,
        canvasRef.current!.offsetWidth,
      );
      const cssScaleY = getCanvasScaledValue(
        canvasRef.current!.height,
        canvasRef.current!.offsetHeight,
      );
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      const newX = Math.floor((x - canvasRect.left) * cssScaleX);
      const newY = Math.floor((y - canvasRect.top) * cssScaleY);

      placePixel(newX, newY, color);
    }
  };

  if (!room) {
    return null;
  }

  return (
    <TransformWrapper
      initialScale={1}
      centerOnInit
      centerZoomedOut
      wheel={{ step: 0.08 }}
      doubleClick={{ disabled: true }}
      ref={transformWrapperRef}
      limitToBounds
      disablePadding
      onZoom={(zoom) => {
        setMultiplier(zoom.state.scale);
      }}
    >
      {({ zoomIn, zoomOut, resetTransform }) => (
        <React.Fragment>
          <div className="absolute left-5 top-5 z-10 mx-auto flex h-24">
            <div className="my-2 flex flex-col justify-center gap-2">
              <button
                onClick={() => zoomIn(0.9, 200)}
                className="rounded-md bg-gray-200 p-1"
              >
                +
              </button>
              <button
                onClick={() => zoomOut(0.9, 200)}
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
          </div>
          <TransformComponent
            wrapperStyle={{
              width,
              height,
            }}
          >
            <canvas
              ref={canvasRef}
              className="pixelated relative min-w-fit max-w-fit origin-top-left bg-white opacity-100"
            />
          </TransformComponent>
        </React.Fragment>
      )}
    </TransformWrapper>
  );
}
