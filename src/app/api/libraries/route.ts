import { fail, handle, ok } from "@/lib/http";
import { createLibrary, listLibraries } from "@/lib/repo";
import { db } from "@/lib/supabase";

export const GET = handle(async () => {
  const [libraries, count] = await Promise.all([
    listLibraries(),
    db().from("videos").select("id", { count: "exact", head: true }),
  ]);
  if (count.error) throw count.error;
  return ok({ libraries, totalVideos: count.count ?? 0 });
});

export const POST = handle(async (req: Request) => {
  const { name, description } = await req.json();
  if (!name || typeof name !== "string") return fail("Name is required");
  const lib = await createLibrary(name, description);
  return ok({ ...lib, video_count: 0, total_seconds: 0 });
});
