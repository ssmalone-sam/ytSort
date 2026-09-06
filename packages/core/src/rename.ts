import type { SortableVideo } from "./types";

export interface TitleRenamePreview {
  videoId: string;
  playlistItemId: string;
  oldTitle: string;
  newTitle: string;
}

export type RegexRenamePreviewResult =
  | { ok: true; changes: TitleRenamePreview[] }
  | { ok: false; error: string };

/**
 * Pure preview of a find/replace regex rename across a set of videos - no
 * network calls. Useful for e.g. zero-padding numbered titles ("(1)" ->
 * "(01)") so a name sort orders them numerically instead of lexically.
 * Only videos whose title actually changes are included in the result.
 */
export function previewRegexRename(
  videos: SortableVideo[],
  pattern: string,
  replacement: string,
  flags: string = "g",
): RegexRenamePreviewResult {
  if (!pattern) return { ok: true, changes: [] };

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid regular expression",
    };
  }

  const changes = videos
    .map((video) => ({
      videoId: video.videoId,
      playlistItemId: video.playlistItemId,
      oldTitle: video.title,
      newTitle: video.title.replace(regex, replacement),
    }))
    .filter((change) => change.newTitle !== change.oldTitle);

  return { ok: true, changes };
}
