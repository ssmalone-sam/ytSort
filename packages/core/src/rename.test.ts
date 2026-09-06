import { describe, expect, it } from "vitest";
import { previewRegexRename, type SortableVideo } from "./index";

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

describe("previewRegexRename", () => {
  it("zero-pads a single leading digit in parens, e.g. (1) -> (01)", () => {
    const videos = [
      video({ videoId: "a", title: "(1) Game one" }),
      video({ videoId: "b", title: "(10) Game ten" }),
      video({ videoId: "c", title: "(2) Game two" }),
    ];
    const result = previewRegexRename(videos, "^\\((\\d)\\)", "(0$1)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toEqual([
      { videoId: "a", playlistItemId: "pi", oldTitle: "(1) Game one", newTitle: "(01) Game one" },
      { videoId: "c", playlistItemId: "pi", oldTitle: "(2) Game two", newTitle: "(02) Game two" },
    ]);
  });

  it("excludes videos whose title doesn't change", () => {
    const videos = [video({ videoId: "a", title: "no digits here" })];
    const result = previewRegexRename(videos, "^\\((\\d)\\)", "(0$1)");
    expect(result).toEqual({ ok: true, changes: [] });
  });

  it("returns an error for an invalid pattern instead of throwing", () => {
    const videos = [video({ videoId: "a", title: "anything" })];
    const result = previewRegexRename(videos, "(unclosed", "x");
    expect(result.ok).toBe(false);
  });

  it("treats an empty pattern as no changes", () => {
    const videos = [video({ videoId: "a", title: "anything" })];
    expect(previewRegexRename(videos, "", "x")).toEqual({ ok: true, changes: [] });
  });
});
