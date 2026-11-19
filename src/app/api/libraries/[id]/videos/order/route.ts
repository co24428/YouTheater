import { fail, handle, ok } from "@/lib/http";
import { db } from "@/lib/supabase";

export const PUT = handle(async (req: Request, ctx: RouteContext<"/api/libraries/[id]/videos/order">) => {
  const { id } = await ctx.params;
  const { videoIds } = await req.json();
  if (!Array.isArray(videoIds)) return fail("videoIds must be an array");
  const { error } = await db().rpc("reorder_library_videos", { lib: id, ids: videoIds });
  if (error) throw error;
  return ok({ ok: true });
});
