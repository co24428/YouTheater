import { fail, handle, ok } from "@/lib/http";
import { db } from "@/lib/supabase";

/** All marks of a video, by time, each with its replies (oldest first). */
export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/videos/[id]/marks">) => {
  const { id } = await ctx.params;
  const { data, error } = await db()
    .from("marks")
    .select("*, replies:mark_replies(*)")
    .eq("video_id", id)
    .order("seconds")
    .order("created_at", { referencedTable: "mark_replies" });
  if (error) throw error;
  return ok(data ?? []);
});

export const POST = handle(async (req: Request, ctx: RouteContext<"/api/videos/[id]/marks">) => {
  const { id } = await ctx.params;
  const { seconds, label } = await req.json();
  const s = Math.floor(Number(seconds));
  if (!Number.isFinite(s) || s < 0) return fail("Invalid time");
  const { data, error } = await db()
    .from("marks")
    .insert({ video_id: id, seconds: s, label: String(label ?? "").trim() })
    .select("*")
    .single();
  if (error) throw error;
  return ok({ ...data, replies: [] });
});
