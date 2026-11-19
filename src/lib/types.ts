export type VideoStatus = "available" | "unavailable";

export interface Video {
  id: string;
  youtube_id: string;
  title: string;
  channel_title: string | null;
  channel_id: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number | null;
  description: string | null;
  note: string | null;
  status: VideoStatus;
  added_at: string;
  checked_at: string | null;
  library_ids: string[];
}

export interface Library {
  id: string;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
  video_count: number;
  total_seconds: number;
}

/** Metadata fetched from YouTube, before it's saved. */
export interface VideoMeta {
  youtube_id: string;
  title: string;
  channel_title: string | null;
  channel_id: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number | null;
  description: string | null;
  status: VideoStatus;
}

export const ALL = "all";
