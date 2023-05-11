import { useRouter } from "next/router";

import { api, type RouterOutputs } from "~/utils/api";
import Canvas from "~/components/Canvas";

const Room = () => {
  const router = useRouter();
  const { room } = router.query;

  if (!room) {
    return null;
  }

  const {
    data: roomData,
    status,
    error,
  } = api.room.byName.useQuery(
    {
      name: room as string,
    },
    {
      enabled: !!room,
    },
  );

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-2">
        <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
          <h1 className="text-6xl font-bold">Loading...</h1>
        </main>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-2">
        <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
          <h1 className="text-6xl font-bold">Error</h1>
          <p>{error?.message}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <div className="absolute top-0 flex h-24 w-full items-center justify-center">
        <h1 className="text-6xl font-bold">{roomData?.name}</h1>
      </div>

      <div className="absolute top-0 flex w-full items-center justify-center">
        <div
          id="canvas"
          className="h-full w-full border-2 border-gray-200 bg-gray-100"
        >
          <Canvas width={960} height={540} room={room as string} />
        </div>
      </div>

      <div className="absolute bottom-0 flex h-24 w-full items-center justify-center">
        <footer className="absolute bottom-0 flex h-24 w-full items-center justify-center border-t">
          <div className="text-sm text-white">
            <p>Footer</p>
          </div>
        </footer>
      </div>
    </div>
  );
};
export default Room;
