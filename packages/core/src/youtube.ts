import type { TokenProvider } from "./auth-types";
import type { PlaylistSummary, SortableVideo } from "./types";
import { computeReorderMoves, type ReorderMove } from "./sort";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const MAX_PAGE_SIZE = 50;
const BATCH_SIZE = 50;

/** Cost, in quota units, of a single playlistItems.update call. */
export const REORDER_UPDATE_COST = 50;

/** A non-2xx response from the YouTube API, with the reason code YouTube gave (if any). */
export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason?: string,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

async function youtubeFetch(
  tokens: TokenProvider,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const token = await tokens.getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const reason = (() => {
      try {
        return JSON.parse(bodyText)?.error?.errors?.[0]?.reason as
          | string
          | undefined;
      } catch {
        return undefined;
      }
    })();
    throw new YouTubeApiError(
      `YouTube API ${path} failed: ${res.status} ${res.statusText} ${bodyText}`,
      res.status,
      reason,
    );
  }
  if (res.status === 204) return undefined;
  return res.json();
}

async function paginate<TItem>(
  tokens: TokenProvider,
  path: string,
  params: Record<string, string>,
): Promise<TItem[]> {
  const items: TItem[] = [];
  let pageToken: string | undefined;
  do {
    const search = new URLSearchParams({
      ...params,
      maxResults: String(MAX_PAGE_SIZE),
      ...(pageToken ? { pageToken } : {}),
    });
    const page = (await youtubeFetch(tokens, `${path}?${search}`)) as {
      items: TItem[];
      nextPageToken?: string;
    };
    items.push(...page.items);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

interface RawPlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    thumbnails?: { default?: { url: string } };
  };
  contentDetails: { itemCount: number };
}

/** Lists playlists owned by the signed-in channel (the only ones that can be reordered). */
export async function listMyPlaylists(
  tokens: TokenProvider,
): Promise<PlaylistSummary[]> {
  const raw = await paginate<RawPlaylist>(tokens, "/playlists", {
    part: "snippet,contentDetails",
    mine: "true",
  });
  return raw.map((p) => ({
    id: p.id,
    title: p.snippet.title,
    description: p.snippet.description,
    thumbnailUrl: p.snippet.thumbnails?.default?.url,
    itemCount: p.contentDetails.itemCount,
    isOwned: true,
  }));
}

/** Fetches a single playlist's metadata (title, thumbnail, item count). */
export async function getPlaylist(
  tokens: TokenProvider,
  playlistId: string,
): Promise<PlaylistSummary | undefined> {
  const raw = (await youtubeFetch(
    tokens,
    `/playlists?part=snippet,contentDetails&id=${playlistId}`,
  )) as { items: RawPlaylist[] };
  const p = raw.items[0];
  if (!p) return undefined;
  return {
    id: p.id,
    title: p.snippet.title,
    description: p.snippet.description,
    thumbnailUrl: p.snippet.thumbnails?.default?.url,
    itemCount: p.contentDetails.itemCount,
    isOwned: true,
  };
}

interface RawPlaylistItem {
  id: string;
  snippet: {
    title: string;
    position: number;
    publishedAt: string;
    resourceId: { videoId: string };
  };
}

interface RawVideo {
  id: string;
  snippet: { publishedAt: string };
  contentDetails: { duration: string };
  statistics: { viewCount?: string };
}

/** Parses an ISO 8601 duration (e.g. "PT1H2M10S") into whole seconds. */
export function parseIsoDuration(duration: string): number {
  const match = duration.match(
    /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/,
  );
  if (!match) return 0;
  const [, hours, minutes, seconds] = match;
  return (
    (Number(hours) || 0) * 3600 +
    (Number(minutes) || 0) * 60 +
    (Number(seconds) || 0)
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Loads every item in a playlist plus the video metadata (original publish
 * date, duration, view count) needed to sort by criteria YouTube doesn't
 * offer natively.
 */
export async function listPlaylistVideos(
  tokens: TokenProvider,
  playlistId: string,
): Promise<SortableVideo[]> {
  const items = await paginate<RawPlaylistItem>(tokens, "/playlistItems", {
    part: "snippet",
    playlistId,
  });

  const videoMeta = new Map<string, RawVideo>();
  const videoIds = items.map((item) => item.snippet.resourceId.videoId);
  for (const batch of chunk(videoIds, BATCH_SIZE)) {
    const raw = (await youtubeFetch(
      tokens,
      `/videos?part=snippet,contentDetails,statistics&id=${batch.join(",")}`,
    )) as { items: RawVideo[] };
    for (const video of raw.items) {
      videoMeta.set(video.id, video);
    }
  }

  return items.map((item) => {
    const videoId = item.snippet.resourceId.videoId;
    const meta = videoMeta.get(videoId);
    return {
      playlistItemId: item.id,
      videoId,
      title: item.snippet.title,
      position: item.snippet.position,
      addedAt: item.snippet.publishedAt,
      publishedAt: meta?.snippet.publishedAt ?? item.snippet.publishedAt,
      durationSeconds: meta
        ? parseIsoDuration(meta.contentDetails.duration)
        : 0,
      viewCount: Number(meta?.statistics.viewCount ?? 0),
    };
  });
}

async function putPlaylistItemPosition(
  tokens: TokenProvider,
  playlistId: string,
  playlistItemId: string,
  videoId: string,
  position: number,
): Promise<void> {
  await youtubeFetch(tokens, "/playlistItems?part=snippet", {
    method: "PUT",
    body: JSON.stringify({
      id: playlistItemId,
      snippet: {
        playlistId,
        position,
        resourceId: { kind: "youtube#video", videoId },
      },
    }),
  });
}

/**
 * Applies the minimal set of moves needed to turn the playlist's current
 * order into `targetOrder` (a full list of playlistItem ids in the desired
 * order). Returns the moves that were applied, in the order they were sent.
 */
export async function reorderPlaylist(
  tokens: TokenProvider,
  playlistId: string,
  currentVideos: SortableVideo[],
  targetOrder: string[],
): Promise<ReorderMove[]> {
  const videoIdByPlaylistItemId = new Map(
    currentVideos.map((v) => [v.playlistItemId, v.videoId]),
  );
  const currentOrder = currentVideos.map((v) => v.playlistItemId);
  const moves = computeReorderMoves(currentOrder, targetOrder);

  for (const move of moves) {
    const videoId = videoIdByPlaylistItemId.get(move.playlistItemId);
    if (!videoId) {
      throw new Error(`Unknown playlistItemId ${move.playlistItemId}`);
    }
    await putPlaylistItemPosition(tokens, playlistId, move.playlistItemId, videoId, move.toPosition);
  }
  return moves;
}

/**
 * Checks whether a playlist's "Sort by" is set to Manually on YouTube -
 * the only mode that allows position-based reordering via the API. There's
 * no field for this on the playlist resource, so the only way to find out
 * is to attempt a real update. Re-applying a video's own current position
 * doesn't work as a test: YouTube treats that as a no-op and accepts it
 * without ever validating the sort-order constraint, so this requests an
 * actually different position (a neighboring slot) and, if that succeeds,
 * immediately moves it back so the check doesn't itself change the order.
 * That means it costs 50 quota units when Manual sort is off (the first
 * call fails, nothing to revert) but 100 when it's on (move + move back) -
 * callers should only invoke this once per playlist visit, not on every
 * render, and only when the playlist has at least 2 videos to test with.
 */
export async function isManualSortEnabled(
  tokens: TokenProvider,
  playlistId: string,
  sampleVideo: SortableVideo,
): Promise<boolean> {
  const testPosition = sampleVideo.position === 0 ? 1 : sampleVideo.position - 1;
  try {
    await putPlaylistItemPosition(
      tokens,
      playlistId,
      sampleVideo.playlistItemId,
      sampleVideo.videoId,
      testPosition,
    );
  } catch (error) {
    if (error instanceof YouTubeApiError && error.reason === "manualSortRequired") {
      return false;
    }
    throw error;
  }
  await putPlaylistItemPosition(
    tokens,
    playlistId,
    sampleVideo.playlistItemId,
    sampleVideo.videoId,
    sampleVideo.position,
  );
  return true;
}

/** Cost, in quota units, of renaming one video (1 unit to read its current snippet + 50 to write it). */
export const RENAME_UPDATE_COST = 51;

interface RawVideoSnippet {
  title: string;
  [key: string]: unknown;
}

/**
 * Renames a video by editing its actual title on YouTube - this isn't a
 * per-playlist label (YouTube doesn't have those), so it changes the
 * video everywhere it appears, not just in the playlist it was renamed
 * from. videos.update requires the full snippet object back, not just the
 * changed field, so this re-fetches it first (1 unit) before writing the
 * new title (50 units).
 */
export async function updateVideoTitle(
  tokens: TokenProvider,
  videoId: string,
  newTitle: string,
): Promise<void> {
  const raw = (await youtubeFetch(tokens, `/videos?part=snippet&id=${videoId}`)) as {
    items: { id: string; snippet: RawVideoSnippet }[];
  };
  const video = raw.items[0];
  if (!video) {
    throw new Error(`Video ${videoId} not found`);
  }

  await youtubeFetch(tokens, "/videos?part=snippet", {
    method: "PUT",
    body: JSON.stringify({
      id: videoId,
      snippet: { ...video.snippet, title: newTitle },
    }),
  });
}
