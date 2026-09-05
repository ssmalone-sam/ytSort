export interface PlaylistSummary {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  itemCount: number;
  /** True only for playlists the signed-in channel owns and can reorder. */
  isOwned: boolean;
}

/** One row of a playlist, current YouTube order plus enough video metadata to sort by. */
export interface SortableVideo {
  /** playlistItem id - required to move/update this row via the API. */
  playlistItemId: string;
  videoId: string;
  title: string;
  /** Current 0-based position in the playlist. */
  position: number;
  /** When the video was added to this playlist. */
  addedAt: string;
  /** When the video was originally published on YouTube. */
  publishedAt: string;
  durationSeconds: number;
  viewCount: number;
}
