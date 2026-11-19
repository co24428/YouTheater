"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function Dot({ on }: { on: boolean }) {
  return <span className={on ? "text-emerald-400" : "text-amber-400"}>●</span>;
}

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const [status, setStatus] = useState<{ youtubeApiKey: boolean; supabase: boolean; passcode: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState<{ checked: number; available: number; unavailable: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<typeof status>("/api/status").then(setStatus).catch(() => {});
  }, []);

  async function runRefresh() {
    setBusy(true);
    setError("");
    try {
      setRefresh(await api("/api/refresh", { method: "POST" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  const card = "rounded-xl border border-zinc-800 bg-zinc-900/60 p-5";
  const btn = "rounded-lg bg-zinc-800 px-4 py-1.5 text-sm hover:bg-zinc-700 disabled:opacity-40";

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-8">
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← {t.back}
        </Link>
        <h1 className="text-2xl font-bold">{t.settingsTitle}</h1>

        <section className={card}>
          <h2 className="mb-3 font-semibold">{t.language}</h2>
          <div className="flex gap-2">
            {(["en", "ko"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`${btn} ${lang === l ? "!bg-accent" : ""}`}>
                {l === "en" ? "English" : "한국어"}
              </button>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="font-semibold">{t.refreshTitle}</h2>
          <p className="mb-3 mt-1 text-sm text-zinc-400">{t.refreshHint}</p>
          <button onClick={runRefresh} disabled={busy} className={btn}>
            {busy ? t.refreshing : t.refreshRun}
          </button>
          {refresh && (
            <p className="mt-3 text-sm text-zinc-300">
              {refresh.checked} {t.checked} · <span className="text-emerald-400">{refresh.available} OK</span> ·{" "}
              <span className="text-amber-300">
                {refresh.unavailable} {t.unavailable}
              </span>
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </section>

        <section className={card}>
          <h2 className="font-semibold">{t.exportTitle}</h2>
          <p className="mb-3 mt-1 text-sm text-zinc-400">{t.exportHint}</p>
          <div className="flex gap-2">
            <a href="/api/export?format=json" className={btn}>
              ⬇ JSON
            </a>
            <a href="/api/export?format=csv" className={btn}>
              ⬇ CSV
            </a>
          </div>
        </section>

        <section className={card}>
          <h2 className="mb-3 font-semibold">{t.status}</h2>
          {status && (
            <ul className="space-y-1.5 text-sm">
              <li>
                <Dot on={status.supabase} /> Supabase — {status.supabase ? t.connected : t.missing}
              </li>
              <li>
                <Dot on={status.youtubeApiKey} /> YouTube API key — {status.youtubeApiKey ? t.connected : t.missing}
              </li>
              <li>
                <Dot on={status.passcode} /> {t.passcode} — {status.passcode ? t.passcodeOn : t.passcodeOff}
              </li>
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
