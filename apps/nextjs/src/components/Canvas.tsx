import React, { useEffect, useRef } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

type CanvasProps = {
  children?: React.ReactNode;
  width: number;
  height: number;
};

export default function Canvas({ children, width, height }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
  }, [canvasRef, width, height]);

  return (
    <TransformWrapper
      initialScale={1}
      initialPositionX={width / 2}
      initialPositionY={height / 2}
      limitToBounds
    >
      {({ zoomIn, zoomOut, resetTransform }) => (
        <React.Fragment>
          <div className="mb-2 flex justify-center space-x-2">
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
          <TransformComponent>
            <div
              className="bg-gray-100"
              ref={canvasRef}
              style={{
                width: width,
                height: height,
              }}
            >
              {children}
            </div>
          </TransformComponent>
        </React.Fragment>
      )}
    </TransformWrapper>
  );
}
