import { handle } from "@/lib/http";
import { listLibraries, listVideos } from "@/lib/repo";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET = handle(async (req: Request) => {
  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const [libraries, videos] = await Promise.all([listLibraries(), listVideos(null)]);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const libs = await Promise.all(
      libraries.map(async (l) => ({
        name: l.name,
        description: l.description,
        videos: (await listVideos(l.id)).map((v) => v.youtube_id),
      })),
    );
    const body = JSON.stringify({ exported_at: new Date().toISOString(), libraries: libs, videos }, null, 2);
    return new Response(body, {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="youtheater-${stamp}.json"`,
      },
    });
  }

  const names = new Map(libraries.map((l) => [l.id, l.name]));
  const cols = ["youtube_id", "url", "title", "channel_title", "duration_seconds", "published_at", "view_count", "status", "added_at", "note", "libraries"];
  const lines = [cols.join(",")];
  for (const v of videos) {
    lines.push(
      [
        v.youtube_id,
        `https://www.youtube.com/watch?v=${v.youtube_id}`,
        v.title,
        v.channel_title,
        v.duration_seconds,
        v.published_at,
        v.view_count,
        v.status,
        v.added_at,
        v.note,
        v.library_ids.map((id) => names.get(id)).join(" | "),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="youtheater-${stamp}.csv"`,
    },
  });
});
