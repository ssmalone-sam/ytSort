"use client";

import { useMemo, useState, useTransition } from "react";
import {
  computeReorderMoves,
  sortVideos,
  previewRegexRename,
  REORDER_UPDATE_COST,
  RENAME_UPDATE_COST,
  type SortableVideo,
  type SortDirection,
  type SortKey,
} from "@ytsort/core";
import { applyReorder, applyRegexRename, checkManualSort } from "./actions";

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

  // Batch regex rename, offered only while sorting by Name - e.g. turning
  // "(1)" into "(01)" so a name sort orders numbers numerically instead of
  // lexically. This edits the actual video title on YouTube, not a
  // per-playlist label (YouTube doesn't have those).
  const [findPattern, setFindPattern] = useState("");
  const [replacePattern, setReplacePattern] = useState("");
  const [isRenaming, startRenameTransition] = useTransition();
  const [renameMessage, setRenameMessage] = useState<{ text: string; isError: boolean } | null>(
    null,
  );

  const renamePreview = useMemo(
    () => previewRegexRename(videos, findPattern, replacePattern),
    [videos, findPattern, replacePattern],
  );

  function handleApplyRename() {
    if (!renamePreview.ok || renamePreview.changes.length === 0) return;
    setRenameMessage(null);
    startRenameTransition(async () => {
      const result = await applyRegexRename(renamePreview.changes);
      if (result.succeededVideoIds.length > 0) {
        const succeeded = new Set(result.succeededVideoIds);
        const newTitleByVideoId = new Map(
          renamePreview.changes.map((c) => [c.videoId, c.newTitle]),
        );
        setVideos((prev) =>
          prev.map((v) =>
            succeeded.has(v.videoId) ? { ...v, title: newTitleByVideoId.get(v.videoId)! } : v,
          ),
        );
      }
      if (result.failed.length === 0) {
        setRenameMessage({
          text: `Renamed ${result.succeededVideoIds.length} video${result.succeededVideoIds.length === 1 ? "" : "s"}.`,
          isError: false,
        });
      } else {
        setRenameMessage({
          text: `Renamed ${result.succeededVideoIds.length}, failed on ${result.failed.length} (e.g. "${result.failed[0].oldTitle}": ${result.failed[0].message}).`,
          isError: true,
        });
      }
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

      {sortMode === "name" && (
        <div className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
          <p className="text-sm font-medium">Batch rename (regex find/replace)</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Edits the actual title on YouTube for every match, e.g. pattern{" "}
            <code className="rounded bg-black/[.05] px-1 dark:bg-white/[.1]">^\((\d)\)</code> with
            replacement{" "}
            <code className="rounded bg-black/[.05] px-1 dark:bg-white/[.1]">(0$1)</code> turns
            &quot;(1) ...&quot; into &quot;(01) ...&quot; so Name sorts numerically. Check the
            preview below before applying - there&apos;s no undo.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={findPattern}
              onChange={(e) => setFindPattern(e.target.value)}
              placeholder="Find (regex)"
              className="min-w-[160px] flex-1 rounded border border-black/[.08] bg-transparent px-2 py-1 font-mono text-sm dark:border-white/[.145]"
            />
            <input
              value={replacePattern}
              onChange={(e) => setReplacePattern(e.target.value)}
              placeholder="Replace with"
              className="min-w-[160px] flex-1 rounded border border-black/[.08] bg-transparent px-2 py-1 font-mono text-sm dark:border-white/[.145]"
            />
            <button
              onClick={handleApplyRename}
              disabled={!renamePreview.ok || renamePreview.changes.length === 0 || isRenaming}
              className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background transition-colors hover:bg-[#383838] disabled:opacity-40 dark:hover:bg-[#ccc]"
            >
              {isRenaming ? "Renaming..." : "Apply renames"}
            </button>
          </div>

          {!renamePreview.ok && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Invalid regex: {renamePreview.error}
            </p>
          )}

          {renamePreview.ok && renamePreview.changes.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {renamePreview.changes.length} video
                {renamePreview.changes.length === 1 ? "" : "s"} will be renamed (~
                {renamePreview.changes.length * RENAME_UPDATE_COST} quota units):
              </p>
              <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs">
                {renamePreview.changes.map((change) => (
                  <li key={change.videoId} className="truncate text-zinc-600 dark:text-zinc-300">
                    <span className="line-through opacity-60">{change.oldTitle}</span>
                    {" → "}
                    <span>{change.newTitle}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {renameMessage && (
            <p
              className={`text-sm ${
                renameMessage.isError
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {renameMessage.text}
            </p>
          )}
        </div>
      )}

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
            <span className="flex-1 truncate">{video.title}</span>
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
