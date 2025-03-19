import { useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";

import { api, type RouterOutputs } from "~/utils/api";

const RoomCard: React.FC<{
  room: RouterOutputs["room"]["all"][number];
  onDelete?: () => void;
  canDelete?: boolean;
}> = ({ room, onDelete, canDelete }) => {
  return (
    <Link
      className="flex flex-row rounded-lg bg-white/10 p-4 transition-all hover:scale-[101%]"
      href={`/${room.name}`}
    >
      <div className="flex-grow">
        <h2 className="text-2xl font-bold text-green-400">{room.name}</h2>
      </div>
      {canDelete && (
        <div>
          <span
            className="cursor-pointer text-sm font-bold uppercase text-green-400"
            onClick={onDelete}
          >
            Delete
          </span>
        </div>
      )}
    </Link>
  );
};

const CreateRoomForm: React.FC = () => {
  const utils = api.useUtils();

  const [name, setName] = useState("");

  const { mutate, error } = api.room.create.useMutation({
    async onSuccess() {
      setName("");
      await utils.room.all.invalidate();
    },
  });

  return (
    <div className="flex w-full max-w-2xl flex-col p-4">
      <input
        className="mb-2 rounded bg-white/10 p-2 text-white"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      {error?.data?.zodError?.fieldErrors.name && (
        <span className="mb-2 text-red-500">
          {error.data.zodError.fieldErrors.title}
        </span>
      )}
      <button
        className="rounded bg-green-500 p-2 font-bold"
        onClick={() => {
          mutate({
            name,
          });
        }}
      >
        Create
      </button>
    </div>
  );
};

const Rooms = ({ rooms }: { rooms: RouterOutputs["room"]["all"] }) => {
  const roomQuery = api.room.all.useQuery(undefined, {
    initialData: rooms,
  });
  const session = api.auth.getSession.useQuery().data;
  const deleteRoomMutation = api.room.delete.useMutation({
    onSettled: () => roomQuery.refetch(),
  });
  if (roomQuery.isLoading) {
    return <span>Loading...</span>;
  }
  if (roomQuery.error) {
    return <span>Error: {roomQuery.error.message}</span>;
  }

  return (
    <div className="w-full max-w-2xl">
      {roomQuery.data?.length === 0 ? (
        <span>There are no rooms!</span>
      ) : (
        <div className="flex h-[40vh] justify-center overflow-y-scroll px-4 text-2xl">
          <div className="flex w-full flex-col gap-4">
            {roomQuery.data?.map((r) => {
              return (
                <RoomCard
                  key={r.id}
                  room={r}
                  onDelete={() => deleteRoomMutation.mutate(r.id)}
                  canDelete={r.ownerId === session?.user?.id}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const Home: NextPage = () => {
  const roomQuery = api.room.all.useQuery();
  return (
    <>
      <Head>
        <title>pyxl.place</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex h-screen w-full flex-col items-center bg-gray-900 text-white">
        <div className="container mt-12 flex flex-col items-center justify-center gap-4 px-4 py-8">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            pyxl.place
          </h1>
          <AuthShowcase />

          <CreateRoomForm />

          <Rooms rooms={roomQuery.data ?? []} />
        </div>
      </main>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: session } = api.auth.getSession.useQuery();

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {session?.user && (
        <p className="text-center text-2xl text-white">
          {session && <span>Logged in as {session?.user?.name}</span>}
        </p>
      )}
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={session ? () => void signOut() : () => void signIn()}
      >
        {session ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};
