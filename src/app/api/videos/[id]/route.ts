import { handle, ok } from "@/lib/http";
import { db } from "@/lib/supabase";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/videos/[id]">) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if ("note" in body) patch.note = body.note || null;
  const { error } = await db().from("videos").update(patch).eq("id", id);
  if (error) throw error;
  return ok({ ok: true });
});
