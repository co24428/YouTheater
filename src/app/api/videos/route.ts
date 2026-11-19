import { fail, handle, ok } from "@/lib/http";
import { addToLibrary, existingByYoutubeId, listVideos, upsertVideos } from "@/lib/repo";
import { ALL } from "@/lib/types";
import { parseVideoId } from "@/lib/youtube-url";
import { fetchVideos } from "@/lib/youtube";
import { db } from "@/lib/supabase";

export const GET = handle(async (req: Request) => {
  const lib = new URL(req.url).searchParams.get("library");
  return ok(await listVideos(!lib || lib === ALL ? null : lib));
});

/** Save a video from a link, optionally into a library. */
export const POST = handle(async (req: Request) => {
  const { url, libraryId } = await req.json();
  const youtubeId = parseVideoId(String(url ?? ""));
  if (!youtubeId) return fail("That doesn't look like a YouTube video link.");

  let rowId = (await existingByYoutubeId([youtubeId])).get(youtubeId);
  const duplicate = Boolean(rowId);
  if (!rowId) {
    const { found } = await fetchVideos([youtubeId]);
    if (!found.length) return fail("Video not found — it may be private or deleted.", 404);
    rowId = (await upsertVideos(found)).get(youtubeId)!;
  }
  if (libraryId && libraryId !== ALL) await addToLibrary(libraryId, [rowId]);

  const { data, error } = await db().from("videos").select("*, library_videos(library_id)").eq("id", rowId).single();
  if (error) throw error;
  const { library_videos, ...rest } = data;
  return ok({ duplicate, video: { ...rest, library_ids: (library_videos ?? []).map((l: { library_id: string }) => l.library_id) } });
});

/** Permanently delete videos from the archive (and every library). */
export const DELETE = handle(async (req: Request) => {
  const { videoIds } = await req.json();
  if (!Array.isArray(videoIds)) return fail("videoIds must be an array");
  const { error } = await db().from("videos").delete().in("id", videoIds);
  if (error) throw error;
  return ok({ ok: true });
});
