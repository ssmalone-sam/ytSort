import { describe, expect, it } from "vitest";
import { computeReorderMoves, sortVideos, type SortableVideo } from "./index";

const video = (overrides: Partial<SortableVideo>): SortableVideo => ({
  playlistItemId: overrides.playlistItemId ?? "pi",
  videoId: overrides.videoId ?? "v",
  title: overrides.title ?? "Title",
  position: overrides.position ?? 0,
  addedAt: overrides.addedAt ?? "2024-01-01T00:00:00Z",
  publishedAt: overrides.publishedAt ?? "2024-01-01T00:00:00Z",
  durationSeconds: overrides.durationSeconds ?? 0,
  viewCount: overrides.viewCount ?? 0,
  ...overrides,
});

describe("sortVideos", () => {
  it("sorts by name ascending, case-insensitively", () => {
    const videos = [
      video({ playlistItemId: "a", title: "banana", position: 0 }),
      video({ playlistItemId: "b", title: "Apple", position: 1 }),
      video({ playlistItemId: "c", title: "cherry", position: 2 }),
    ];
    const sorted = sortVideos(videos, "name", "asc");
    expect(sorted.map((v) => v.playlistItemId)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const videos = [
      video({ playlistItemId: "a", title: "b" }),
      video({ playlistItemId: "b", title: "a" }),
    ];
    const original = [...videos];
    sortVideos(videos, "name", "asc");
    expect(videos).toEqual(original);
  });

  it("sorts by view count descending", () => {
    const videos = [
      video({ playlistItemId: "a", viewCount: 10 }),
      video({ playlistItemId: "b", viewCount: 100 }),
      video({ playlistItemId: "c", viewCount: 1 }),
    ];
    const sorted = sortVideos(videos, "viewCount", "desc");
    expect(sorted.map((v) => v.playlistItemId)).toEqual(["b", "a", "c"]);
  });
});

describe("computeReorderMoves", () => {
  it("returns no moves when already sorted", () => {
    const ids = ["a", "b", "c", "d"];
    expect(computeReorderMoves(ids, ids)).toEqual([]);
  });

  it("finds the minimal moves for a reversed list", () => {
    const current = ["a", "b", "c", "d"];
    const target = ["d", "c", "b", "a"];
    const moves = computeReorderMoves(current, target);
    // A fully reversed order still has a length-1 increasing subsequence
    // (any single item), so only n - 1 items need to move.
    expect(moves.length).toBe(3);
  });

  it("only moves the items that are actually out of place", () => {
    const current = ["a", "b", "c", "d", "e"];
    // Only a and b are out of relative order; c, d, e already sit correctly.
    const target = ["c", "b", "a", "d", "e"];
    const moves = computeReorderMoves(current, target);
    expect(moves.length).toBe(2);
  });

  it("produces a move sequence that reconstructs the exact target order", () => {
    const current = ["A", "B", "C", "D", "E"];
    const target = ["C", "A", "E", "B", "D"];
    const moves = computeReorderMoves(current, target);

    // Simulate applying the moves the way YouTube's API would: each move
    // removes the item from wherever it currently sits and re-inserts it at
    // `toPosition`, shifting everything else.
    let simulated = [...current];
    for (const move of moves) {
      simulated = simulated.filter((id) => id !== move.playlistItemId);
      simulated.splice(move.toPosition, 0, move.playlistItemId);
    }
    expect(simulated).toEqual(target);
  });
});
