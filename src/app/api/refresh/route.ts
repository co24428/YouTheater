import { handle, ok } from "@/lib/http";
import { upsertVideos } from "@/lib/repo";
import { db } from "@/lib/supabase";
import { fetchVideos } from "@/lib/youtube";

export const maxDuration = 60;

/** Re-fetch metadata for every saved video and flag ones that disappeared from YouTube. */
export const POST = handle(async () => {
  const ids: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from("videos").select("youtube_id").range(from, from + 999);
    if (error) throw error;
    ids.push(...(data ?? []).map((r) => r.youtube_id));
    if (!data || data.length < 1000) break;
  }
  const { found, missing } = await fetchVideos(ids);
  await upsertVideos(found);
  // Keep the saved title/thumbnail so you still know what it was.
  for (let i = 0; i < missing.length; i += 200) {
    const { error } = await db()
      .from("videos")
      .update({ status: "unavailable", checked_at: new Date().toISOString() })
      .in("youtube_id", missing.slice(i, i + 200));
    if (error) throw error;
  }
  return ok({ checked: ids.length, available: found.length, unavailable: missing.length });
});
