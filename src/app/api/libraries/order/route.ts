import { fail, handle, ok } from "@/lib/http";
import { db } from "@/lib/supabase";

export const PUT = handle(async (req: Request) => {
  const { ids } = await req.json();
  if (!Array.isArray(ids)) return fail("ids must be an array");
  const { error } = await db().rpc("reorder_libraries", { ids });
  if (error) throw error;
  return ok({ ok: true });
});
