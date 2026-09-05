"use server";

import { revalidatePath } from "next/cache";
import { listPlaylistVideos, reorderPlaylist } from "@ytsort/core";
import { getServerTokenProvider } from "@/lib/token-provider";

/**
 * Re-fetches the playlist's live order server-side (rather than trusting
 * whatever the client last saw) and applies the minimal set of moves needed
 * to reach `targetOrder` (a full list of playlistItem ids).
 */
export async function applyReorder(playlistId: string, targetOrder: string[]) {
  const tokens = await getServerTokenProvider();
  const currentVideos = await listPlaylistVideos(tokens, playlistId);
  const moves = await reorderPlaylist(tokens, playlistId, currentVideos, targetOrder);
  revalidatePath(`/playlists/${playlistId}`);
  return { movedCount: moves.length };
}
