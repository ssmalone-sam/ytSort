import Link from "next/link";
import Image from "next/image";
import { listMyPlaylists } from "@ytsort/core";
import { getServerTokenProvider } from "@/lib/token-provider";

export default async function PlaylistsPage() {
  const tokens = await getServerTokenProvider();
  const playlists = await listMyPlaylists(tokens);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your playlists</h1>
      {playlists.length === 0 && (
        <p className="text-zinc-500 dark:text-zinc-400">
          No playlists found for this channel.
        </p>
      )}
      <ul className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.145]">
        {playlists.map((playlist) => (
          <li key={playlist.id}>
            <Link
              href={`/playlists/${playlist.id}`}
              className="flex items-center gap-4 py-4 transition-colors hover:bg-black/[.02] dark:hover:bg-white/[.03]"
            >
              {playlist.thumbnailUrl ? (
                <Image
                  src={playlist.thumbnailUrl}
                  alt=""
                  width={120}
                  height={90}
                  className="h-[68px] w-[120px] rounded object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-[68px] w-[120px] rounded bg-zinc-200 dark:bg-zinc-800" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">{playlist.title}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {playlist.itemCount} video{playlist.itemCount === 1 ? "" : "s"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
