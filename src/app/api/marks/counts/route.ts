import { handle, ok } from "@/lib/http";
import { db } from "@/lib/supabase";

/** { videoId: number of marks } — for the 🔖 badge on video cards. */
export const GET = handle(async () => {
  const counts: Record<string, number> = {};
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from("marks").select("video_id").range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) counts[r.video_id] = (counts[r.video_id] ?? 0) + 1;
    if (!data || data.length < 1000) break;
  }
  return ok(counts);
});
