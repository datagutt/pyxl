import { useRouter } from "next/router";

import { api, type RouterOutputs } from "~/utils/api";
import Canvas from "~/components/Canvas";

export const Room = () => {
  const router = useRouter();
  const { room } = router.query;

  if (!room) {
    return null;
  }

  const { data: roomData } = api.room.byId.useQuery(room as string, {
    enabled: !!room,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
        <h1 className="text-6xl font-bold">{roomData?.name}</h1>

        <div
          id="canvas"
          className="bg-gray-100"
          style={{ width: 400, height: 400 }}
        >
          <Canvas width={400} height={400}>
            <div className="h-10 w-10 bg-red-500"></div>
          </Canvas>
        </div>
      </main>

      <footer className="absolute bottom-0 flex h-24 w-full items-center justify-center border-t">
        <div className="text-sm text-white">
          <p>Footer</p>
        </div>
      </footer>
    </div>
  );
};
