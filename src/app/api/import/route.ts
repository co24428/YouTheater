import { fail, handle, ok } from "@/lib/http";
import { addToLibrary, createLibrary, existingByYoutubeId, upsertVideos } from "@/lib/repo";
import { ALL } from "@/lib/types";
import { parsePlaylistId, parseVideoId } from "@/lib/youtube-url";
import { fetchPlaylist, fetchVideos } from "@/lib/youtube";

export const maxDuration = 60;

/**
 * Body: { playlistUrl?: string, links?: string, libraryId?: string, newLibraryName?: string }
 * Imports a YouTube playlist and/or a block of links (one per line) into a library.
 */
export const POST = handle(async (req: Request) => {
  const body = await req.json();
  let ids: string[] = [];
  let playlistTitle: string | null = null;

  if (body.playlistUrl) {
    const pid = parsePlaylistId(String(body.playlistUrl));
    if (!pid) return fail("That doesn't look like a YouTube playlist link (it needs a list=… part).");
    const pl = await fetchPlaylist(pid);
    playlistTitle = pl.title;
    ids.push(...pl.videoIds);
  }
  const invalid: string[] = [];
  if (body.links) {
    for (const line of String(body.links).split(/[\s,]+/)) {
      if (!line.trim()) continue;
      const id = parseVideoId(line);
      if (id) ids.push(id);
      else invalid.push(line);
    }
  }
  ids = [...new Set(ids)];
  if (!ids.length) return fail("No videos found to import.");

  const existing = await existingByYoutubeId(ids);
  const toFetch = ids.filter((id) => !existing.has(id));
  const { found, missing } = toFetch.length ? await fetchVideos(toFetch) : { found: [], missing: [] };
  const saved = await upsertVideos(found);
  const rowIds = ids.map((id) => existing.get(id) ?? saved.get(id)).filter((x): x is string => Boolean(x));

  let libraryId: string | null = body.libraryId && body.libraryId !== ALL ? body.libraryId : null;
  let libraryName: string | null = null;
  if (!libraryId && (body.newLibraryName || playlistTitle)) {
    const lib = await createLibrary(body.newLibraryName || playlistTitle!);
    libraryId = lib.id;
    libraryName = lib.name;
  }
  const addedToLibrary = libraryId ? await addToLibrary(libraryId, rowIds) : 0;

  return ok({
    libraryId,
    libraryName,
    total: ids.length,
    newVideos: saved.size,
    alreadySaved: existing.size,
    unavailable: missing.length,
    addedToLibrary,
    invalid,
  });
});
