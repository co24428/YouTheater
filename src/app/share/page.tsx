"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { VideoCard } from "@/components/VideoCard";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Library, Video } from "@/lib/types";
import { parsePlaylistId, parseVideoId } from "@/lib/youtube-url";

/** Pull the first YouTube URL out of whatever the share sheet sent (url, text or title). */
function findLink(parts: (string | null)[]) {
  for (const p of parts) {
    if (!p) continue;
    const urls = p.match(/https?:\/\/\S+/g) ?? [p];
    for (const u of urls) {
      if (parseVideoId(u)) return { video: u };
      if (parsePlaylistId(u) && /youtu/.test(u)) return { playlist: u };
    }
  }
  return null;
}

type State =
  | { kind: "saving" }
  | { kind: "saved"; video: Video; duplicate: boolean }
  | { kind: "playlist"; url: string }
  | { kind: "error"; message: string };

/** Target of the PWA share sheet (Android) — saves the shared video in one tap. */
export default function SharePage() {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ kind: "saving" });
  const [libraries, setLibraries] = useState<Library[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const q = new URLSearchParams(window.location.search);
    const found = findLink([q.get("url"), q.get("text"), q.get("title")]);
    api<{ libraries: Library[] }>("/api/libraries")
      .then((r) => setLibraries(r.libraries))
      .catch(() => {});
    if (!found) {
      setState({ kind: "error", message: t.shareNoLink }); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    if ("playlist" in found) {
      setState({ kind: "playlist", url: found.playlist! });
      return;
    }
    api<{ duplicate: boolean; video: Video }>("/api/videos", { method: "POST", body: { url: found.video } })
      .then((r) => setState({ kind: "saved", video: r.video, duplicate: r.duplicate }))
      .catch((e) => setState({ kind: "error", message: e instanceof Error ? e.message : t.error }));
  }, [t]);

  async function toggle(lib: Library) {
    if (state.kind !== "saved") return;
    const v = state.video;
    const inLib = v.library_ids.includes(lib.id);
    try {
      await api(`/api/libraries/${lib.id}/videos`, { method: inLib ? "DELETE" : "POST", body: { videoIds: [v.id] } });
      setState({
        ...state,
        video: { ...v, library_ids: inLib ? v.library_ids.filter((x) => x !== lib.id) : [...v.library_ids, lib.id] },
      });
    } catch {
      /* ignore; the button state simply doesn't change */
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        {state.kind === "saving" && <p className="mt-16 text-center text-zinc-400">{t.shareSaving}</p>}

        {state.kind === "error" && (
          <div className="mt-10 space-y-4 text-center">
            <p className="text-red-300">{state.message}</p>
            <Link href="/" className="inline-block rounded-lg bg-zinc-800 px-4 py-2 text-sm">
              {t.back}
            </Link>
          </div>
        )}

        {state.kind === "playlist" && (
          <div className="mt-10 space-y-4 text-center">
            <p className="text-zinc-300">{t.sharePlaylist}</p>
            <Link href={`/import?playlist=${encodeURIComponent(state.url)}`} className="inline-block rounded-lg bg-accent px-4 py-2 font-medium">
              {t.sharePlaylistImport} →
            </Link>
          </div>
        )}

        {state.kind === "saved" && (
          <div className="space-y-5">
            <p className="text-center font-medium text-emerald-400">✓ {state.duplicate ? t.shareAlready : t.shareSaved}</p>
            <VideoCard video={state.video} />
            {libraries.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{t.shareAddTo}</p>
                <div className="flex flex-wrap gap-2">
                  {libraries.map((l) => {
                    const on = state.video.library_ids.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() => toggle(l)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm ${
                          on ? "border-accent bg-accent/20 text-white" : "border-zinc-700 text-zinc-300"
                        }`}
                      >
                        {on ? "✓ " : "+ "}
                        {l.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <Link href={`/?v=${state.video.youtube_id}`} className="block rounded-lg bg-accent py-2.5 text-center font-medium">
              ▶ {t.shareOpen}
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
