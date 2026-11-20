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

export interface MarkReply {
  id: string;
  mark_id: string;
  body: string;
  created_at: string;
}

/** A personal mark at a point in a video, with any number of replies. */
export interface Mark {
  id: string;
  video_id: string;
  seconds: number;
  label: string;
  created_at: string;
  replies: MarkReply[];
}

export const ALL = "all";
