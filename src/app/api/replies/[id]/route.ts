import { handle, ok } from "@/lib/http";
import { db } from "@/lib/supabase";

export const DELETE = handle(async (_req: Request, ctx: RouteContext<"/api/replies/[id]">) => {
  const { id } = await ctx.params;
  const { error } = await db().from("mark_replies").delete().eq("id", id);
  if (error) throw error;
  return ok({ ok: true });
});
