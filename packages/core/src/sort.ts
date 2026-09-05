import type { SortableVideo } from "./types";

export type SortKey =
  | "name"
  | "addedAt"
  | "publishedAt"
  | "viewCount"
  | "duration";

export type SortDirection = "asc" | "desc";

const keyValue = (video: SortableVideo, key: SortKey): string | number => {
  switch (key) {
    case "name":
      return video.title.toLowerCase();
    case "addedAt":
      return video.addedAt;
    case "publishedAt":
      return video.publishedAt;
    case "viewCount":
      return video.viewCount;
    case "duration":
      return video.durationSeconds;
  }
};

/** Returns a new, sorted array - never mutates the input. */
export function sortVideos(
  videos: SortableVideo[],
  key: SortKey,
  direction: SortDirection,
): SortableVideo[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...videos].sort((a, b) => {
    const av = keyValue(a, key);
    const bv = keyValue(b, key);
    if (av < bv) return -1 * sign;
    if (av > bv) return 1 * sign;
    // Stable, deterministic tie-break so re-sorting is idempotent.
    return a.position - b.position;
  });
}

export interface ReorderMove {
  playlistItemId: string;
  /** Target 0-based position to move this item to. */
  toPosition: number;
}

/**
 * Finds the smallest set of "move item X to position Y" operations that
 * turns `currentIds` into `targetIds`, using the fact that YouTube's
 * playlistItems.update (like a normal array splice-and-insert) shifts every
 * other item automatically. Items already in relatively correct order
 * relative to each other (the longest increasing subsequence, mapped
 * through target position) are left untouched.
 */
export function computeReorderMoves(
  currentIds: string[],
  targetIds: string[],
): ReorderMove[] {
  const targetIndex = new Map(targetIds.map((id, i) => [id, i]));
  const seq = currentIds.map((id) => {
    const idx = targetIndex.get(id);
    if (idx === undefined) {
      throw new Error(`id ${id} present in currentIds but not targetIds`);
    }
    return idx;
  });

  const keepPositions = longestIncreasingSubsequenceIndices(seq);
  const keep = new Set(keepPositions.map((i) => currentIds[i]));

  const moves: ReorderMove[] = [];
  for (let toPosition = 0; toPosition < targetIds.length; toPosition++) {
    const id = targetIds[toPosition];
    if (!keep.has(id)) {
      moves.push({ playlistItemId: id, toPosition });
    }
  }
  return moves;
}

/** Returns the indices (into `seq`) of one longest strictly-increasing subsequence. */
function longestIncreasingSubsequenceIndices(seq: number[]): number[] {
  const n = seq.length;
  if (n === 0) return [];

  // piles[k] = index into seq of the smallest possible tail value for an
  // increasing subsequence of length k + 1.
  const piles: number[] = [];
  const predecessors: number[] = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    const value = seq[i];
    let lo = 0;
    let hi = piles.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (seq[piles[mid]] < value) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    if (lo > 0) predecessors[i] = piles[lo - 1];
    if (lo === piles.length) {
      piles.push(i);
    } else {
      piles[lo] = i;
    }
  }

  const result: number[] = [];
  let cursor = piles[piles.length - 1];
  while (cursor !== -1) {
    result.push(cursor);
    cursor = predecessors[cursor];
  }
  return result.reverse();
}
