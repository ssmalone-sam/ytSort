"use server";

import {
  listPlaylistVideos,
  reorderPlaylist,
  isManualSortEnabled,
  YouTubeApiError,
  type SortableVideo,
} from "@ytsort/core";
import { getServerTokenProvider } from "@/lib/token-provider";

const MANUAL_SORT_MESSAGE =
  "This playlist's sort order is set by YouTube (e.g. \"Date added\") rather than Manual, so the API can't reorder it. Open the playlist on YouTube, change \"Sort by\" to Manually, then try again.";

export type ApplyReorderResult =
  | { ok: true; movedCount: number }
  | { ok: false; error: "manual-sort-required" | "unknown"; message: string };

/**
 * Checks up front whether this playlist accepts position-based reordering,
 * so the UI can warn before the user picks moves apart, rather than only
 * finding out when they click Apply. Costs the same quota as one move
 * (50 units) since there's no cheaper way to read this setting - callers
 * should only call this once per playlist visit.
 */
export async function checkManualSort(
  playlistId: string,
  sampleVideo: SortableVideo,
): Promise<{ enabled: boolean; message?: string }> {
  const tokens = await getServerTokenProvider();
  try {
    const enabled = await isManualSortEnabled(tokens, playlistId, sampleVideo);
    return enabled ? { enabled: true } : { enabled: false, message: MANUAL_SORT_MESSAGE };
  } catch {
    // Don't block the user over an unrelated failure here - Apply will
    // surface the real error if there is one.
    return { enabled: true };
  }
}

/**
 * Re-fetches the playlist's live order server-side (rather than trusting
 * whatever the client last saw) and applies the minimal set of moves needed
 * to reach `targetOrder` (a full list of playlistItem ids). The caller
 * already updates its own view of the order optimistically on success, so
 * this deliberately doesn't revalidate/refresh the route - that triggered
 * an extra round-trip after every apply, which is one more thing to time
 * out or drop over a flaky connection (e.g. a dev tunnel) for no benefit.
 */
export async function applyReorder(
  playlistId: string,
  targetOrder: string[],
): Promise<ApplyReorderResult> {
  const tokens = await getServerTokenProvider();
  const currentVideos = await listPlaylistVideos(tokens, playlistId);

  try {
    const moves = await reorderPlaylist(tokens, playlistId, currentVideos, targetOrder);
    return { ok: true, movedCount: moves.length };
  } catch (error) {
    if (error instanceof YouTubeApiError && error.reason === "manualSortRequired") {
      return { ok: false, error: "manual-sort-required", message: MANUAL_SORT_MESSAGE };
    }
    return {
      ok: false,
      error: "unknown",
      message: error instanceof Error ? error.message : "Failed to apply sort.",
    };
  }
}
