"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  computeReorderMoves,
  sortVideos,
  REORDER_UPDATE_COST,
  type SortableVideo,
  type SortDirection,
  type SortKey,
} from "@ytsort/core";
import { applyReorder, checkManualSort, renameVideo } from "./actions";

type SortMode = "current" | SortKey;

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "current", label: "Current order" },
  { key: "name", label: "Name" },
  { key: "addedAt", label: "Date added" },
  { key: "publishedAt", label: "Date published" },
  { key: "viewCount", label: "View count" },
  { key: "duration", label: "Duration" },
];

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const numberFormatter = new Intl.NumberFormat();

export function PlaylistSorter({
  playlistId,
  initialVideos,
}: {
  playlistId: string;
  initialVideos: SortableVideo[];
}) {
  const [videos, setVideos] = useState(initialVideos);
  const [sortMode, setSortMode] = useState<SortMode>("current");
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Whether this playlist's YouTube "Sort by" is set to Manually - the only
  // mode the API can reorder. Checked lazily (costs quota) the first time a
  // real sort is picked, then cached for the rest of this visit.
  const [manualSort, setManualSort] = useState<
    | { status: "unknown" | "checking" }
    | { status: "enabled" }
    | { status: "disabled"; message: string }
  >({ status: "unknown" });
  const [isCheckingSort, startCheckTransition] = useTransition();

  function handleSortModeChange(mode: SortMode) {
    setSortMode(mode);
    if (mode !== "current" && manualSort.status === "unknown" && videos.length > 1) {
      setManualSort({ status: "checking" });
      startCheckTransition(async () => {
        const result = await checkManualSort(playlistId, videos[0]);
        setManualSort(
          result.enabled
            ? { status: "enabled" }
            : { status: "disabled", message: result.message ?? "" },
        );
      });
    }
  }

  const sortedVideos = useMemo(
    () => (sortMode === "current" ? videos : sortVideos(videos, sortMode, direction)),
    [videos, sortMode, direction],
  );

  const moves = useMemo(
    () =>
      computeReorderMoves(
        videos.map((v) => v.playlistItemId),
        sortedVideos.map((v) => v.playlistItemId),
      ),
    [videos, sortedVideos],
  );

  // Renaming edits the video's actual title on YouTube, not just how it
  // shows up here, so it applies everywhere that video appears.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [renamingVideoId, setRenamingVideoId] = useState<string | null>(null);
  const [, startRenameTransition] = useTransition();
  const suppressBlurRef = useRef(false);

  function startEditingTitle(video: SortableVideo) {
    setEditingId(video.playlistItemId);
    setDraftTitle(video.title);
  }

  function cancelEditingTitle(video: SortableVideo) {
    suppressBlurRef.current = true;
    setDraftTitle(video.title);
    setEditingId(null);
  }

  function submitRename(video: SortableVideo) {
    if (suppressBlurRef.current) {
      suppressBlurRef.current = false;
      return;
    }
    const trimmed = draftTitle.trim();
    setEditingId(null);
    if (!trimmed || trimmed === video.title) return;

    setRenamingVideoId(video.videoId);
    startRenameTransition(async () => {
      const result = await renameVideo(video.videoId, trimmed);
      setRenamingVideoId(null);
      if (!result.ok) {
        setMessage({ text: result.message, isError: true });
        return;
      }
      setVideos((prev) =>
        prev.map((v) => (v.videoId === video.videoId ? { ...v, title: trimmed } : v)),
      );
    });
  }

  function handleApply() {
    setMessage(null);
    startTransition(async () => {
      const targetOrder = sortedVideos.map((v) => v.playlistItemId);
      const result = await applyReorder(playlistId, targetOrder);
      if (!result.ok) {
        setMessage({ text: result.message, isError: true });
        return;
      }
      setVideos(sortedVideos.map((v, i) => ({ ...v, position: i })));
      setMessage({
        text: `Moved ${result.movedCount} video${result.movedCount === 1 ? "" : "s"}.`,
        isError: false,
      });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Sort by
          <select
            value={sortMode}
            onChange={(e) => handleSortModeChange(e.target.value as SortMode)}
            className="rounded border border-black/[.08] bg-transparent px-2 py-1 dark:border-white/[.145]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as SortDirection)}
          disabled={sortMode === "current"}
          className="rounded border border-black/[.08] bg-transparent px-2 py-1 text-sm disabled:opacity-40 dark:border-white/[.145]"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {isCheckingSort
              ? "Checking playlist's sort setting..."
              : moves.length === 0
                ? "Already in this order"
                : `${moves.length} of ${videos.length} will move (~${moves.length * REORDER_UPDATE_COST} quota units)`}
          </span>
          <button
            onClick={handleApply}
            disabled={moves.length === 0 || isPending || isCheckingSort || manualSort.status === "disabled"}
            className="rounded-full bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-40 dark:hover:bg-[#ccc]"
          >
            {isPending ? "Applying..." : "Apply sort"}
          </button>
        </div>
      </div>

      {manualSort.status === "disabled" && (
        <div className="flex items-start gap-3 rounded-lg border-2 border-yellow-400 bg-yellow-100 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-500 dark:bg-yellow-900/60 dark:text-yellow-100">
          <span aria-hidden className="text-base leading-none">⚠️</span>
          <p>
            {manualSort.message}{" "}
            <a
              href={`https://www.youtube.com/playlist?list=${playlistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Open on YouTube
            </a>
          </p>
        </div>
      )}

      {message && (
        <p
          className={`text-sm ${
            message.isError
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {message.text}{" "}
          {message.isError && (
            <a
              href={`https://www.youtube.com/playlist?list=${playlistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Open on YouTube
            </a>
          )}
        </p>
      )}

      <ol className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.145]">
        {sortedVideos.map((video, index) => (
          <li key={video.playlistItemId} className="flex items-center gap-4 py-3">
            <span className="w-6 shrink-0 text-right text-sm text-zinc-400">
              {index + 1}
            </span>
            <span className="flex flex-1 items-center gap-2 overflow-hidden">
              {editingId === video.playlistItemId ? (
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    } else if (e.key === "Escape") {
                      cancelEditingTitle(video);
                    }
                  }}
                  onBlur={() => submitRename(video)}
                  className="w-full rounded border border-black/[.08] bg-transparent px-1 py-0.5 text-sm dark:border-white/[.145]"
                />
              ) : (
                <>
                  <span className="truncate">{video.title}</span>
                  <button
                    type="button"
                    onClick={() => startEditingTitle(video)}
                    disabled={renamingVideoId === video.videoId}
                    className="shrink-0 text-zinc-400 hover:text-zinc-600 disabled:opacity-40 dark:text-zinc-500 dark:hover:text-zinc-300"
                    aria-label={`Rename "${video.title}"`}
                    title="Rename video"
                  >
                    {renamingVideoId === video.videoId ? "Saving..." : "✏️"}
                  </button>
                </>
              )}
            </span>
            <span className="w-28 shrink-0 text-right text-sm text-zinc-500 dark:text-zinc-400">
              {formatDate(video.addedAt)}
            </span>
            <span className="w-28 shrink-0 text-right text-sm text-zinc-500 dark:text-zinc-400">
              {formatDate(video.publishedAt)}
            </span>
            <span className="w-20 shrink-0 text-right text-sm text-zinc-500 dark:text-zinc-400">
              {numberFormatter.format(video.viewCount)} views
            </span>
            <span className="w-16 shrink-0 text-right text-sm text-zinc-500 dark:text-zinc-400">
              {formatDuration(video.durationSeconds)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
