"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { SortableItem, SortableList } from "@/components/Sortable";
import { useToast } from "@/components/Toast";
import { VideoCard } from "@/components/VideoCard";
import { api } from "@/lib/api";
import { formatRuntime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ALL, type Library, type Video } from "@/lib/types";

type SortKey = "title" | "duration" | "published" | "added" | "channel";
const sorters: Record<SortKey, (a: Video, b: Video) => number> = {
  title: (a, b) => a.title.localeCompare(b.title),
  duration: (a, b) => (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0),
  published: (a, b) => (a.published_at ?? "").localeCompare(b.published_at ?? ""),
  added: (a, b) => a.added_at.localeCompare(b.added_at),
  channel: (a, b) => (a.channel_title ?? "").localeCompare(b.channel_title ?? "") || a.title.localeCompare(b.title),
};

export default function LibraryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { show, node } = useToast();
  const isAll = id === ALL;

  const [libraries, setLibraries] = useState<Library[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fail = useCallback((e: unknown) => show(e instanceof Error ? e.message : t.error, true), [show, t.error]);
  const lib = libraries.find((l) => l.id === id);

  const load = useCallback(async () => {
    const [libs, vids] = await Promise.all([
      api<{ libraries: Library[] }>("/api/libraries"),
      api<Video[]>(`/api/videos?library=${encodeURIComponent(id)}`),
    ]);
    setLibraries(libs.libraries);
    setVideos(vids);
    const l = libs.libraries.find((x) => x.id === id);
    setName(l?.name ?? "");
    setDescription(l?.description ?? "");
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set after the fetch resolves
    load()
      .catch(fail)
      .finally(() => setLoading(false));
  }, [load, fail]);

  const totalSeconds = useMemo(() => videos.reduce((s, v) => s + (v.duration_seconds ?? 0), 0), [videos]);
  const others = libraries.filter((l) => l.id !== id);
  const sel = [...selected];

  function toggle(vid: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(vid)) n.delete(vid);
      else n.add(vid);
      return n;
    });
  }

  async function saveOrder(next: Video[]) {
    setVideos(next);
    await api(`/api/libraries/${id}/videos/order`, { method: "PUT", body: { videoIds: next.map((v) => v.id) } }).catch(fail);
  }

  async function saveMeta() {
    if (isAll || !lib) return;
    if (name.trim() === lib.name && (description || null) === (lib.description || null)) return;
    try {
      await api(`/api/libraries/${id}`, { method: "PATCH", body: { name, description } });
      setLibraries((ls) => ls.map((l) => (l.id === id ? { ...l, name, description } : l)));
    } catch (e) {
      fail(e);
    }
  }

  async function addTo(targetId: string, move: boolean) {
    if (!targetId || !sel.length) return;
    try {
      const r = await api<{ added: number }>(`/api/libraries/${targetId}/videos`, { method: "POST", body: { videoIds: sel } });
      if (move && !isAll) {
        await api(`/api/libraries/${id}/videos`, { method: "DELETE", body: { videoIds: sel } });
        setVideos((vs) => vs.filter((v) => !selected.has(v.id)));
      }
      const target = libraries.find((l) => l.id === targetId);
      show(`${target?.name}: +${r.added}`);
      setSelected(new Set());
      load().catch(() => {});
    } catch (e) {
      fail(e);
    }
  }

  async function removeSelected() {
    if (!sel.length) return;
    try {
      if (isAll) {
        if (!confirm(t.confirmDeleteMany)) return;
        await api("/api/videos", { method: "DELETE", body: { videoIds: sel } });
      } else {
        await api(`/api/libraries/${id}/videos`, { method: "DELETE", body: { videoIds: sel } });
      }
      setVideos((vs) => vs.filter((v) => !selected.has(v.id)));
      setSelected(new Set());
    } catch (e) {
      fail(e);
    }
  }

  async function deleteLibrary() {
    if (!confirm(t.confirmDeleteLibrary)) return;
    try {
      await api(`/api/libraries/${id}`, { method: "DELETE" });
      router.push("/");
    } catch (e) {
      fail(e);
    }
  }

  const selectCls = "rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm disabled:opacity-40";

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6">
        <Link href={isAll ? "/" : `/?lib=${id}`} className="text-sm text-zinc-400 hover:text-zinc-200">
          ← {t.back}
        </Link>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="min-w-0 flex-1">
            {isAll ? (
              <h1 className="text-2xl font-bold">{t.allVideos}</h1>
            ) : (
              <>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={saveMeta}
                  className="w-full bg-transparent text-2xl font-bold outline-none focus:underline"
                />
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={saveMeta}
                  placeholder={t.description}
                  className="mt-1 w-full bg-transparent text-sm text-zinc-400 outline-none"
                />
              </>
            )}
            <p className="mt-1 text-sm text-zinc-500">
              {videos.length} {t.videos} · {t.totalRuntime} {formatRuntime(totalSeconds)}
            </p>
          </div>
          {!isAll && (
            <div className="flex gap-2">
              <select
                className={selectCls}
                value=""
                onChange={(e) => {
                  const k = e.target.value as SortKey;
                  if (k) saveOrder([...videos].sort(sorters[k]));
                }}
              >
                <option value="">{t.sortBy}</option>
                <option value="title">{t.sortTitle}</option>
                <option value="channel">{t.sortChannel}</option>
                <option value="duration">{t.sortDuration}</option>
                <option value="published">{t.sortPublished}</option>
                <option value="added">{t.sortAdded}</option>
              </select>
              <button onClick={deleteLibrary} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-red-300 hover:bg-red-900/50">
                🗑 {t.delete}
              </button>
            </div>
          )}
        </div>

        {/* Bulk toolbar */}
        <div className="sticky top-[57px] z-20 sm:top-[61px] mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/95 px-3 py-2 backdrop-blur">
          <button onClick={() => setSelected(new Set(videos.map((v) => v.id)))} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">
            {t.selectAll}
          </button>
          <button onClick={() => setSelected(new Set())} disabled={!sel.length} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700 disabled:opacity-40">
            {t.clearSelection}
          </button>
          <span className="text-sm text-zinc-400">
            {sel.length} {t.selected}
          </span>
          <span className="flex-1" />
          <select className={selectCls} disabled={!sel.length} value="" onChange={(e) => addTo(e.target.value, false)}>
            <option value="">{t.addToLibrary}</option>
            {others.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {!isAll && (
            <select className={selectCls} disabled={!sel.length} value="" onChange={(e) => addTo(e.target.value, true)}>
              <option value="">{t.moveToLibrary}</option>
              {others.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={removeSelected}
            disabled={!sel.length}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-red-300 hover:bg-red-900/50 disabled:opacity-40"
          >
            {isAll ? `🗑 ${t.deleteFromArchive}` : t.removeFromLibrary}
          </button>
        </div>

        {loading ? (
          <p className="mt-10 text-center text-zinc-500">…</p>
        ) : !videos.length ? (
          <p className="mt-10 text-center text-zinc-500">{t.noVideos}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            <SortableList items={videos} onReorder={saveOrder} disabled={isAll} layout="grid">
              {videos.map((v, i) => (
                <SortableItem key={v.id} id={v.id} className="relative">
                  <VideoCard video={v} active={selected.has(v.id)} onClick={() => toggle(v.id)} />
                  <span
                    className={`pointer-events-none absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded border text-xs ${
                      selected.has(v.id) ? "border-accent bg-accent" : "border-zinc-400 bg-black/50"
                    }`}
                  >
                    {selected.has(v.id) ? "✓" : ""}
                  </span>
                  {!isAll && <span className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/70 px-1 text-[10px]">#{i + 1}</span>}
                  <Link
                    href={`/?${isAll ? "" : `lib=${id}&`}v=${v.youtube_id}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="mt-1 inline-block text-xs text-accent hover:underline"
                  >
                    ▶ {t.play}
                  </Link>
                </SortableItem>
              ))}
            </SortableList>
          </div>
        )}
      </main>
      {node}
    </>
  );
}
