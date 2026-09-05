"use server";

import { revalidatePath } from "next/cache";
import {
  listPlaylistVideos,
  reorderPlaylist,
  YouTubeApiError,
} from "@ytsort/core";
import { getServerTokenProvider } from "@/lib/token-provider";

export type ApplyReorderResult =
  | { ok: true; movedCount: number }
  | { ok: false; error: "manual-sort-required" | "unknown"; message: string };

/**
 * Re-fetches the playlist's live order server-side (rather than trusting
 * whatever the client last saw) and applies the minimal set of moves needed
 * to reach `targetOrder` (a full list of playlistItem ids).
 */
export async function applyReorder(
  playlistId: string,
  targetOrder: string[],
): Promise<ApplyReorderResult> {
  const tokens = await getServerTokenProvider();
  const currentVideos = await listPlaylistVideos(tokens, playlistId);

  try {
    const moves = await reorderPlaylist(tokens, playlistId, currentVideos, targetOrder);
    revalidatePath(`/playlists/${playlistId}`);
    return { ok: true, movedCount: moves.length };
  } catch (error) {
    if (error instanceof YouTubeApiError && error.reason === "manualSortRequired") {
      return {
        ok: false,
        error: "manual-sort-required",
        message:
          "This playlist's sort order is set by YouTube (e.g. \"Date added\") rather than Manual, so the API can't reorder it. Open the playlist on YouTube, change \"Sort by\" to Manually, then try again.",
      };
    }
    return {
      ok: false,
      error: "unknown",
      message: error instanceof Error ? error.message : "Failed to apply sort.",
    };
  }
}
