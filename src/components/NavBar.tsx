"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { parseVideoId } from "@/lib/youtube-url";

/**
 * Desktop: logo · link box · search · links.
 * Phone: one row — logo · link box (with Paste) · 🔍 · ☰. Search opens in place of the link box.
 */
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [canPaste, setCanPaste] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCanPaste(typeof navigator !== "undefined" && Boolean(navigator.clipboard?.readText)); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  async function add(link: string) {
    if (!onAdd || !link.trim()) return;
    setBusy(true);
    try {
      await onAdd(link.trim());
      setUrl("");
    } finally {
      setBusy(false);
    }
  }

  // One tap: read the clipboard, and if it's a YouTube video link, save it right away.
  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      const link = text.match(/https?:\/\/\S+/)?.[0] ?? text;
      if (parseVideoId(link)) await add(link);
      else setUrl(text);
    } catch {
      alert(t.pasteFailed);
    }
  }

  async function logout() {
    await api("/api/logout", { method: "POST" });
    // Full reload so the proxy re-checks the session cookie.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  const iconBtn = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-800";

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight" aria-label={t.appName}>
          <span className="text-accent">▶</span>
          <span className="hidden sm:inline"> {t.appName}</span>
        </Link>

        {onAdd && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add(url);
            }}
            className={`${searchOpen ? "hidden sm:flex" : "flex"} min-w-0 flex-1 gap-2`}
          >
            <div className="relative min-w-0 flex-1">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t.pasteLink}
                inputMode="url"
                className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-900 pl-3 pr-20 text-base outline-none focus:border-accent sm:text-sm"
              />
              {canPaste && !url && (
                <button
                  type="button"
                  onClick={paste}
                  disabled={busy}
                  className="absolute right-1 top-1 h-7 rounded-md bg-zinc-800 px-2.5 text-xs text-zinc-200 hover:bg-zinc-700"
                >
                  📋 {t.paste}
                </button>
              )}
            </div>
            <button
              disabled={busy || !url.trim()}
              className="h-9 shrink-0 rounded-lg bg-accent px-3 text-sm font-medium disabled:opacity-40 sm:px-4"
              aria-label={t.add}
            >
              {busy ? "…" : (
                <>
                  +<span className="hidden sm:inline"> {t.add}</span>
                </>
              )}
            </button>
          </form>
        )}

        {onSearch && (
          <div className={`${searchOpen ? "flex" : "hidden sm:flex"} min-w-0 flex-1 items-center gap-1 sm:w-56 sm:flex-none`}>
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={`🔍 ${t.search}`}
              ref={searchRef}
              className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-base outline-none focus:border-zinc-500 sm:text-sm"
            />
            <button
              onClick={() => {
                onSearch("");
                setSearchOpen(false);
              }}
              className={`${iconBtn} sm:hidden`}
              aria-label={t.closeSearch}
            >
              ✕
            </button>
          </div>
        )}

        {!onAdd && <span className="flex-1 sm:hidden" />}

        {onSearch && !searchOpen && (
          <button
            onClick={() => {
              // Show the box and focus it inside the same tap, so iOS opens the keyboard.
              flushSync(() => setSearchOpen(true));
              searchRef.current?.focus();
            }}
            className={`${iconBtn} sm:hidden`}
            aria-label={t.search}
          >
            🔍
          </button>
        )}

        {/* Desktop links */}
        <nav className="ml-auto hidden items-center gap-1 text-sm sm:flex">
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

        {/* Phone menu */}
        {!searchOpen && (
          <div ref={menuRef} className="relative sm:hidden">
            <button onClick={() => setMenuOpen((o) => !o)} className={iconBtn} aria-label={t.menu} aria-expanded={menuOpen}>
              ☰
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 w-48 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 py-1 text-[15px] shadow-2xl">
                <Link href="/import" className="block px-4 py-2.5 hover:bg-zinc-800">
                  {t.import}
                </Link>
                <Link href="/settings" className="block px-4 py-2.5 hover:bg-zinc-800">
                  {t.settings}
                </Link>
                <button
                  onClick={() => {
                    setLang(lang === "en" ? "ko" : "en");
                    setMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2.5 text-left hover:bg-zinc-800"
                >
                  {lang === "en" ? "한국어" : "English"}
                </button>
                <button onClick={logout} className="block w-full px-4 py-2.5 text-left text-zinc-400 hover:bg-zinc-800">
                  {t.logout}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
