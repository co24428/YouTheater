import { fail, handle, ok } from "@/lib/http";
import { db } from "@/lib/supabase";

export const PATCH = handle(async (req: Request, ctx: RouteContext<"/api/libraries/[id]">) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    if (!body.name.trim()) return fail("Name is required");
    patch.name = body.name.trim();
  }
  if ("description" in body) patch.description = body.description || null;
  const { data, error } = await db().from("libraries").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return ok(data);
});

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/libraries/[id]">) => {
  const { id } = await ctx.params;
  const { error } = await db().from("libraries").delete().eq("id", id);
  if (error) throw error;
  return ok({ ok: true });
});
