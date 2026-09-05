import { notFound } from "next/navigation";
import { getPlaylist, listPlaylistVideos } from "@ytsort/core";
import { getServerTokenProvider } from "@/lib/token-provider";
import { PlaylistSorter } from "./playlist-sorter";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tokens = await getServerTokenProvider();

  const [playlist, videos] = await Promise.all([
    getPlaylist(tokens, id),
    listPlaylistVideos(tokens, id),
  ]);

  if (!playlist) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{playlist.title}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {videos.length} video{videos.length === 1 ? "" : "s"}
        </p>
      </div>
      <PlaylistSorter playlistId={id} initialVideos={videos} />
    </div>
  );
}
