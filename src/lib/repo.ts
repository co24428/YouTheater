import "server-only";
import { db } from "./supabase";
import type { Library, Video, VideoMeta } from "./types";

type Row = Record<string, unknown>;

/** Supabase caps responses at 1000 rows; page through everything. */
async function selectAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>) {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < size) break;
  }
  return out;
}

function toVideo(r: Row): Video {
  const links = (r.library_videos as { library_id: string }[] | undefined) ?? [];
  const { library_videos: _ignored, ...rest } = r;
  void _ignored;
  return { ...(rest as unknown as Omit<Video, "library_ids">), library_ids: links.map((l) => l.library_id) };
}

export async function listLibraries(): Promise<Library[]> {
  const { data: libs, error } = await db().from("libraries").select("*").order("position").order("created_at");
  if (error) throw error;
  const links = await selectAll<{ library_id: string; videos: { duration_seconds: number | null } | null }>((a, b) =>
    db().from("library_videos").select("library_id, videos(duration_seconds)").range(a, b),
  );
  const stats = new Map<string, { n: number; s: number }>();
  for (const l of links) {
    const st = stats.get(l.library_id) ?? { n: 0, s: 0 };
    st.n += 1;
    st.s += l.videos?.duration_seconds ?? 0;
    stats.set(l.library_id, st);
  }
  return (libs ?? []).map((l) => ({
    ...l,
    video_count: stats.get(l.id)?.n ?? 0,
    total_seconds: stats.get(l.id)?.s ?? 0,
  }));
}

export async function listVideos(libraryId: string | null): Promise<Video[]> {
  if (!libraryId) {
    const rows = await selectAll<Row>((a, b) =>
      db().from("videos").select("*, library_videos(library_id)").order("added_at", { ascending: false }).range(a, b),
    );
    return rows.map(toVideo);
  }
  const rows = await selectAll<{ video: Row | null }>((a, b) =>
    db()
      .from("library_videos")
      .select("position, video:videos(*, library_videos(library_id))")
      .eq("library_id", libraryId)
      .order("position")
      .order("added_at")
      .range(a, b),
  );
  return rows.filter((r) => r.video).map((r) => toVideo(r.video!));
}

/** Insert or refresh metadata. Never touches note / added_at. Returns youtube_id → row id. */
export async function upsertVideos(metas: VideoMeta[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const now = new Date().toISOString();
  for (let i = 0; i < metas.length; i += 500) {
    const chunk = metas.slice(i, i + 500).map((m) => ({ ...m, checked_at: now }));
    const { data, error } = await db().from("videos").upsert(chunk, { onConflict: "youtube_id" }).select("id, youtube_id");
    if (error) throw error;
    for (const r of data ?? []) map.set(r.youtube_id, r.id);
  }
  return map;
}

export async function existingByYoutubeId(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db().from("videos").select("id, youtube_id").in("youtube_id", ids.slice(i, i + 200));
    if (error) throw error;
    for (const r of data ?? []) map.set(r.youtube_id, r.id);
  }
  return map;
}

/** Append videos to the end of a library, skipping ones already in it. Returns how many were added. */
export async function addToLibrary(libraryId: string, videoIds: string[]): Promise<number> {
  if (!videoIds.length) return 0;
  const { data: existing, error } = await db()
    .from("library_videos")
    .select("video_id, position")
    .eq("library_id", libraryId)
    .order("position", { ascending: false })
    .limit(100000);
  if (error) throw error;
  const have = new Set((existing ?? []).map((r) => r.video_id));
  let pos = existing?.[0]?.position ?? 0;
  const rows = [...new Set(videoIds)].filter((id) => !have.has(id)).map((video_id) => ({ library_id: libraryId, video_id, position: ++pos }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error: e } = await db().from("library_videos").insert(rows.slice(i, i + 500));
    if (e) throw e;
  }
  return rows.length;
}

export async function createLibrary(name: string, description?: string | null) {
  const { data: last } = await db().from("libraries").select("position").order("position", { ascending: false }).limit(1);
  const position = (last?.[0]?.position ?? 0) + 1;
  const { data, error } = await db()
    .from("libraries")
    .insert({ name: name.trim() || "Untitled", description: description ?? null, position })
    .select("*")
    .single();
  if (error) throw error;
  return data as Omit<Library, "video_count" | "total_seconds">;
}
