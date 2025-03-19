import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { api } from "~/utils/api";
import Canvas from "~/components/Canvas";

const Room = () => {
  const router = useRouter();
  const { room } = router.query;

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

  if (!room) {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-gray-900">
      <Head>
        <title>{roomData?.name} | pyxl.place</title>
      </Head>

      <div className="relative m-0 h-full w-full touch-none select-none overflow-hidden p-0">
        <div className="relative flex flex-col items-center justify-center py-2">
          {roomData && <Canvas room={roomData} />}

          {status === "pending" && (
            <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center text-white">
              <h1 className="text-6xl font-bold">Loading...</h1>
            </main>
          )}
          {status === "error" && (
            <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center text-white">
              <h1 className="text-6xl font-bold">Error</h1>
              <p>{error?.message}</p>
            </main>
          )}
        </div>
      </div>
      <footer className="absolute bottom-0 flex h-24 w-full items-center justify-center">
        <div className="text-sm text-white">
          <p>
            <a href="https://pyxl.place" rel="noopener noreferrer">
              pyxl.place
            </a>{" "}
            was hacked together by{" "}
            <a
              href="https://x.com/datagutt"
              className="underline-offset-3 underline decoration-green-500 decoration-wavy decoration-2  hover:text-gray-400 focus:text-gray-400"
              rel="noopener noreferrer"
            >
              datagutt
            </a>
            .
          </p>
          <p className="mt-2 text-center">
            <Link
              href="/"
              className="underline hover:text-gray-400 focus:text-gray-400"
            >
              Want to create your own room?
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
};
export default Room;
