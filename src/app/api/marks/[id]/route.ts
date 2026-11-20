import { fail, handle, ok } from "@/lib/http";
import { db } from "@/lib/supabase";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/marks/[id]">) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if ("label" in body) patch.label = String(body.label ?? "").trim();
  if ("seconds" in body) {
    const s = Math.floor(Number(body.seconds));
    if (!Number.isFinite(s) || s < 0) return fail("Invalid time");
    patch.seconds = s;
  }
  const { error } = await db().from("marks").update(patch).eq("id", id);
  if (error) throw error;
  return ok({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/marks/[id]">) => {
  const { id } = await ctx.params;
  const { error } = await db().from("marks").delete().eq("id", id);
  if (error) throw error;
  return ok({ ok: true });
});
