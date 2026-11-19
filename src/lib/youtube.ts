import "server-only";
import type { VideoMeta } from "./types";

const API = "https://www.googleapis.com/youtube/v3";

export function hasApiKey() {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

/** ISO-8601 duration (PT1H2M3S) → seconds. */
export function parseIsoDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY! });
  const res = await fetch(`${API}/${path}?${qs}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `YouTube API error ${res.status}`);
  }
  return res.json();
}

type Thumbs = Record<string, { url: string } | undefined>;
function bestThumb(t: Thumbs | undefined, id: string) {
  return t?.maxres?.url || t?.standard?.url || t?.high?.url || t?.medium?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

interface ApiVideo {
  id: string;
  snippet?: { title: string; channelTitle: string; channelId: string; publishedAt: string; description: string; thumbnails: Thumbs };
  contentDetails?: { duration: string };
  statistics?: { viewCount?: string };
  status?: { privacyStatus?: string };
}

/**
 * Fetch metadata for many ids (batched by 50). Ids YouTube doesn't return are
 * deleted or private; they're returned in `missing`.
 */
export async function fetchVideos(ids: string[]): Promise<{ found: VideoMeta[]; missing: string[] }> {
  const unique = [...new Set(ids)];
  if (!hasApiKey()) {
    const found: VideoMeta[] = [];
    const missing: string[] = [];
    await Promise.all(
      unique.map(async (id) => {
        const m = await fetchOEmbed(id);
        if (m) found.push(m);
        else missing.push(id);
      }),
    );
    return { found, missing };
  }
  const found: VideoMeta[] = [];
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const data = await api<{ items: ApiVideo[] }>("videos", {
      part: "snippet,contentDetails,statistics,status",
      id: batch.join(","),
      maxResults: "50",
    });
    for (const v of data.items) {
      found.push({
        youtube_id: v.id,
        title: v.snippet?.title ?? "",
        channel_title: v.snippet?.channelTitle ?? null,
        channel_id: v.snippet?.channelId ?? null,
        duration_seconds: parseIsoDuration(v.contentDetails?.duration),
        thumbnail_url: bestThumb(v.snippet?.thumbnails, v.id),
        published_at: v.snippet?.publishedAt ?? null,
        view_count: v.statistics?.viewCount ? Number(v.statistics.viewCount) : null,
        description: v.snippet?.description ?? null,
        status: "available",
      });
    }
  }
  const got = new Set(found.map((f) => f.youtube_id));
  return { found, missing: unique.filter((id) => !got.has(id)) };
}

/** Keyless fallback: title, channel and thumbnail only. */
async function fetchOEmbed(id: string): Promise<VideoMeta | null> {
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  const o = await res.json();
  return {
    youtube_id: id,
    title: o.title ?? "",
    channel_title: o.author_name ?? null,
    channel_id: null,
    duration_seconds: null,
    thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    published_at: null,
    view_count: null,
    description: null,
    status: "available",
  };
}

/** All video ids in a playlist, plus its title. Requires an API key. */
export async function fetchPlaylist(playlistId: string): Promise<{ title: string; videoIds: string[] }> {
  if (!hasApiKey()) throw new Error("Playlist import needs YOUTUBE_API_KEY.");
  const meta = await api<{ items: { snippet: { title: string } }[] }>("playlists", { part: "snippet", id: playlistId });
  const title = meta.items[0]?.snippet.title ?? "Imported playlist";
  const videoIds: string[] = [];
  let pageToken = "";
  do {
    const page = await api<{ items: { contentDetails: { videoId: string } }[]; nextPageToken?: string }>("playlistItems", {
      part: "contentDetails",
      playlistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const it of page.items) videoIds.push(it.contentDetails.videoId);
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && videoIds.length < 5000);
  return { title, videoIds };
}
