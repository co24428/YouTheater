import { fail, handle, ok } from "@/lib/http";
import { addToLibrary } from "@/lib/repo";
import { db } from "@/lib/supabase";

/** Add existing videos (by row id) to this library. */
export const POST = handle(async (req: Request, ctx: RouteContext<"/api/libraries/[id]/videos">) => {
  const { id } = await ctx.params;
  const { videoIds } = await req.json();
  if (!Array.isArray(videoIds)) return fail("videoIds must be an array");
  return ok({ added: await addToLibrary(id, videoIds) });
});

/** Remove videos from this library (they stay in the archive). */
export const DELETE = handle(async (req: Request, ctx: RouteContext<"/api/libraries/[id]/videos">) => {
  const { id } = await ctx.params;
  const { videoIds } = await req.json();
  if (!Array.isArray(videoIds)) return fail("videoIds must be an array");
  const { error } = await db().from("library_videos").delete().eq("library_id", id).in("video_id", videoIds);
  if (error) throw error;
  return ok({ ok: true });
});
