import { fail, handle, ok } from "@/lib/http";
import { db } from "@/lib/supabase";

export const POST = handle(async (req: Request, ctx: RouteContext<"/api/marks/[id]/replies">) => {
  const { id } = await ctx.params;
  const { body } = await req.json();
  const text = String(body ?? "").trim();
  if (!text) return fail("Reply is empty");
  const { data, error } = await db().from("mark_replies").insert({ mark_id: id, body: text }).select("*").single();
  if (error) throw error;
  return ok(data);
});
