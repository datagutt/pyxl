import React, { useEffect, useRef } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { api } from "~/utils/api";

type CanvasProps = {
  width: number;
  height: number;
  room: string;
};

export default function Canvas({ width, height, room }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.current = canvas.getContext("2d");
    }
    for (let i = 0; i < 100; i++) {
      const color = Math.floor(Math.random() * 16777215).toString(16);
      const w = Math.floor(Math.random() * width);
      const h = Math.floor(Math.random() * height);
      for (let j = 0; j < 100; j++) {
        handlePixel(w + j, h + j, color);
      }
    }
  }, [canvasRef, width, height]);

  const handlePixel = (x: number, y: number, color: string) => {
    if (!context || !context.current) {
      return;
    }
    console.log("handlePixel", x, y, color, context);
    context.current.fillStyle = `#${color}`;
    context.current?.fillRect(x, y, 1, 1);
  };

  const mutatePixel = api.room.place.useMutation();
  const placePixel = (x: number, y: number, color: string) => {
    mutatePixel.mutate(
      {
        roomId: room,
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

  api.room.onJoin.useSubscription(
    {
      id: room,
    },
    {
      onData: (data) => {
        console.log("onJoin", data);
      },
      onError: (error) => {
        console.error("onJoin", error);
      },
    },
  );

  window.oncontextmenu = () => false;
  document.onmousedown = ({ button, pageX, pageY, target }) => {
    switch (button) {
      case 0:
        handleClick(pageX, pageY, target);
        break;
    }
  };

  document.ontouchstart = ({ touches: [{ pageX, pageY, target }] }) =>
    handleClick(pageX, pageY, target, true);

  const handleClick = (
    pageX: number,
    pageY: number,
    target: any,
    touch = false,
  ) => {
    console.log(target, canvasRef.current);
    if (target !== canvasRef.current) return;
    if (touch) return;

    const x = pageX - (canvasRef?.current?.offsetLeft ?? 0);
    const y = pageY - (canvasRef?.current?.offsetTop ?? 0);
    const color = Math.floor(Math.random() * 16777215).toString(16);

    handlePixel(x, y, color);
  };

  return (
    <TransformWrapper
      initialScale={1}
      initialPositionX={width / 2}
      initialPositionY={height / 2}
      limitToBounds
      centerOnInit
      centerZoomedOut
    >
      {({ zoomIn, zoomOut, resetTransform }) => (
        <React.Fragment>
          <div className="absolute top-0 z-10 mx-auto flex h-24 w-full max-w-xl">
            <div className="my-2 flex flex-col justify-center gap-2">
              <button
                onClick={() => zoomIn(0.1)}
                className="rounded-md bg-gray-200 p-1"
              >
                +
              </button>
              <button
                onClick={() => zoomOut(0.1)}
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
              style={{
                imageRendering: "pixelated",
                cursor: "hand",
              }}
            />
          </TransformComponent>
        </React.Fragment>
      )}
    </TransformWrapper>
  );
}
