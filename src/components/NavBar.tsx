"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function NavBar({
  onAdd,
  search,
  onSearch,
}: {
  onAdd?: (url: string) => Promise<void>;
  search?: string;
  onSearch?: (q: string) => void;
}) {
  const { t, lang, setLang } = useI18n();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!onAdd || !url.trim()) return;
    setBusy(true);
    try {
      await onAdd(url.trim());
      setUrl("");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api("/api/logout", { method: "POST" });
    // Full reload so the proxy re-checks the session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          <span className="text-accent">▶</span> {t.appName}
        </Link>

        {onAdd && (
          <form onSubmit={submit} className="flex min-w-[240px] flex-1 gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t.pasteLink}
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <button
              disabled={busy || !url.trim()}
              className="shrink-0 rounded-lg bg-accent px-4 py-1.5 text-sm font-medium disabled:opacity-40"
            >
              {busy ? t.adding : `+ ${t.add}`}
            </button>
          </form>
        )}

        {onSearch && (
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={`🔍 ${t.search}`}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 sm:w-56"
          />
        )}

        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/import" className="rounded-md px-2.5 py-1.5 text-zinc-300 hover:bg-zinc-800">
            {t.import}
          </Link>
          <Link href="/settings" className="rounded-md px-2.5 py-1.5 text-zinc-300 hover:bg-zinc-800">
            {t.settings}
          </Link>
          <button
            onClick={() => setLang(lang === "en" ? "ko" : "en")}
            className="rounded-md px-2.5 py-1.5 text-zinc-400 hover:bg-zinc-800"
            title="Language / 언어"
          >
            {lang === "en" ? "한국어" : "EN"}
          </button>
          <button onClick={logout} className="rounded-md px-2.5 py-1.5 text-zinc-500 hover:bg-zinc-800" title={t.logout}>
            ⎋
          </button>
        </nav>
      </div>
    </header>
  );
}
