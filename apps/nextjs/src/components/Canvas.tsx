import React, { use, useCallback, useEffect, useRef, useState } from "react";
import { GithubPicker } from "react-color";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { RoomWithColors } from "@pyxl/api/src/services/pixel.service";

import { api } from "~/utils/api";
import { getCanvasScaledValue } from "~/utils/canvas";

type CanvasProps = {
  width: number;
  height: number;
  room: RoomWithColors;
};

const PIXEL_SIZE = 1;
const SELECTED_PIXEL_BORDER_WIDTH = 2;

export default function Canvas({ width, height, room }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [shouldPlacePixel, setShouldPlacePixel] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({
    x: 0,
    y: 0,
  });
  const [selectedColor, setSelectedColor] = useState<string>(
    room?.colors[0]?.value ?? "#000000",
  );
  const [selectedPixel, setSelectedPixel] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [previousSelectedPixel, setPreviousSelectedPixel] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.current = canvas.getContext("2d");
    }
  }, [canvasRef, width, height]);

  const handlePixel = (x: number, y: number, color: string) => {
    if (!context || !context.current) {
      return;
    }

    const scaledX = Math.floor(x / multiplier);
    const scaledY = Math.floor(y / multiplier);

    context.current.fillStyle = color;
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
  const placePixel = (x: number, y: number) => {
    console.log("WE PLACED", x, y, selectedColor);
    mutatePixel.mutate(
      {
        roomId: room.id,
        x,
        y,
        color: selectedColor,
      },
      {
        onSuccess: (data) => {
          console.log("placePixel", data);
          handlePixel(x, y, selectedColor);
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

  const handleClick = (ev: MouseEvent | TouchEvent) => {
    let clientX, clientY;

    if (ev instanceof MouseEvent) {
      clientX = ev.clientX;
      clientY = ev.clientY;
    } else if (ev.touches.length > 0) {
      clientX = ev?.touches?.[0]?.clientX;
      clientY = ev?.touches?.[0]?.clientY;
    }

    if (!clientX || !clientY) {
      return;
    }

    if (canvasRef.current) {
      const cssScaleX = getCanvasScaledValue(
        canvasRef.current!.width,
        canvasRef.current!.offsetWidth,
      );
      const cssScaleY = getCanvasScaledValue(
        canvasRef.current!.height,
        canvasRef.current!.offsetHeight,
      );
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      const x = Math.floor((clientX - canvasRect.left) * cssScaleX);
      const y = Math.floor((clientY - canvasRect.top) * cssScaleY);

      console.log("x", x, "y", y, shouldPlacePixel);

      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (shouldPlacePixel) {
          setColorPickerPosition({ x: clientX, y: clientY });
          setShowColorPicker(true);
        } else {
          setSelectedPixel({ x, y });
          setPreviousSelectedPixel({ x, y });
          setShowColorPicker(false);
        }
      }
    }
  };

  const onMouseDown = (ev: MouseEvent) => {
    if (ev.target !== canvasRef.current) {
      return;
    }
    switch (ev.button) {
      case 0:
        setShouldPlacePixel(true);
        handleClick(ev);
        break;
    }
  };
  const onTouchStart = (ev: TouchEvent) => {
    if (ev.target !== canvasRef.current) {
      return;
    }
    setShouldPlacePixel(true);
    handleClick(ev);
  };

  useEffect(() => {
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("touchstart", onTouchStart);

    document.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
    });

    document.addEventListener("mousemove", () => {
      setShouldPlacePixel(false);
    });

    document.addEventListener("touchmove", () => {
      setShouldPlacePixel(false);
    });
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("contextmenu", (ev) => {
        ev.preventDefault();
      });
      document.removeEventListener("mousemove", () => {
        setShouldPlacePixel(false);
      });
      document.removeEventListener("touchmove", () => {
        setShouldPlacePixel(false);
      });
    };
  }, [width, height, shouldPlacePixel]);

  useEffect(() => {
    if (
      showColorPicker &&
      colorPickerRef.current &&
      typeof colorPickerRef.current.addEventListener === "function"
    ) {
      colorPickerRef.current.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
      });
      colorPickerRef.current.addEventListener("touchstart", (ev) => {
        ev.stopPropagation();
      });
    }
    return () => {
      if (
        !showColorPicker ||
        !colorPickerRef.current ||
        typeof colorPickerRef.current.addEventListener === "function"
      ) {
        return;
      }
      colorPickerRef.current?.removeEventListener("mousedown", (ev) => {
        ev.stopPropagation();
      });
      colorPickerRef.current?.removeEventListener("touchstart", (ev) => {
        ev.stopPropagation();
      });
    };
  }, [colorPickerRef]);

  const handleColorChange = (color: any) => {
    if (!selectedPixel) {
      return;
    }
    setSelectedColor(color.hex);

    placePixel(selectedPixel.x, selectedPixel.y);
    setSelectedPixel(null);
    setShowColorPicker(false);
    setShouldPlacePixel(false);
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
          {showColorPicker && (
            <div
              className="absolute z-10"
              style={{
                left: colorPickerPosition.x,
                top: colorPickerPosition.y,
              }}
            >
              <GithubPicker
                ref={colorPickerRef}
                colors={room.colors.map((color) => color.value)}
                onChange={handleColorChange}
                onClose={() => setShowColorPicker(false)}
              />
            </div>
          )}
          <TransformComponent
            wrapperStyle={{
              width,
              height,
            }}
          >
            <canvas
              ref={canvasRef}
              className="pixelated cursor-cross relative min-w-fit max-w-fit origin-top-left bg-white opacity-100"
            />
          </TransformComponent>
        </React.Fragment>
      )}
    </TransformWrapper>
  );
}
