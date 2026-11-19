"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Library } from "@/lib/types";

interface Result {
  libraryId: string | null;
  libraryName: string | null;
  total: number;
  newVideos: number;
  alreadySaved: number;
  unavailable: number;
  addedToLibrary: number;
  invalid: string[];
}

export default function ImportPage() {
  const { t } = useI18n();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [hasKey, setHasKey] = useState(true);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [links, setLinks] = useState("");
  const [target, setTarget] = useState("new");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const pre = new URLSearchParams(window.location.search).get("playlist");
    if (pre) setPlaylistUrl(pre); // eslint-disable-line react-hooks/set-state-in-effect -- prefill from share link
    api<{ libraries: Library[] }>("/api/libraries").then((r) => setLibraries(r.libraries)).catch(() => {});
    api<{ youtubeApiKey: boolean }>("/api/status").then((s) => setHasKey(s.youtubeApiKey)).catch(() => {});
  }, []);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await api<Result>("/api/import", {
        method: "POST",
        body: {
          playlistUrl: playlistUrl.trim() || undefined,
          links: links.trim() || undefined,
          libraryId: target === "new" ? undefined : target,
          newLibraryName: target === "new" ? newName.trim() || (playlistUrl.trim() ? undefined : "Imported") : undefined,
        },
      });
      setResult(r);
      setPlaylistUrl("");
      setLinks("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-accent";

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← {t.back}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">{t.importTitle}</h1>

        <form onSubmit={run} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t.importPlaylist}</span>
            <input
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              disabled={!hasKey}
              placeholder="https://www.youtube.com/playlist?list=…"
              className={`${field} disabled:opacity-40`}
            />
            <span className="mt-1 block text-xs text-zinc-500">{hasKey ? t.importPlaylistHint : t.needsKey}</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t.importLinks}</span>
            <textarea
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              rows={6}
              placeholder={"https://youtu.be/…\nhttps://www.youtube.com/watch?v=…"}
              className={`${field} font-mono`}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t.importInto}</span>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={field}>
                <option value="new">{t.importNewLibrary}</option>
                {libraries.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            {target === "new" && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{t.libraryName}</span>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t.importNewLibraryHint} className={field} />
              </label>
            )}
          </div>

          <button
            disabled={busy || (!playlistUrl.trim() && !links.trim())}
            className="rounded-lg bg-accent px-5 py-2 font-medium disabled:opacity-40"
          >
            {busy ? t.importing : t.importStart}
          </button>
        </form>

        {error && <p className="mt-5 rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-200">{error}</p>}

        {result && (
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm">
            <h2 className="mb-2 font-semibold">✓ {t.importDone}</h2>
            <ul className="space-y-1 text-zinc-300">
              <li>
                {result.newVideos} {t.importNew}
              </li>
              <li>
                {result.alreadySaved} {t.importAlready}
              </li>
              {result.libraryId && (
                <li>
                  {result.addedToLibrary} {t.importAddedToLib}
                </li>
              )}
              {result.unavailable > 0 && (
                <li className="text-amber-300">
                  {result.unavailable} {t.importUnavailable}
                </li>
              )}
              {result.invalid.length > 0 && (
                <li className="text-amber-300">
                  {result.invalid.length} {t.importInvalid}
                </li>
              )}
            </ul>
            {result.libraryId && (
              <Link href={`/?lib=${result.libraryId}`} className="mt-4 inline-block rounded-lg bg-accent px-4 py-1.5 font-medium">
                {t.openLibrary} {result.libraryName ? `“${result.libraryName}”` : ""} →
              </Link>
            )}
          </div>
        )}
      </main>
    </>
  );
}
