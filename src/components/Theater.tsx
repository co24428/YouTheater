"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatRuntime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ALL, type Library, type Video } from "@/lib/types";
import { LibraryBar } from "./LibraryBar";
import { NavBar } from "./NavBar";
import { Player } from "./Player";
import { useToast } from "./Toast";
import { VideoStrip } from "./VideoStrip";

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  return { lib: p.get("lib") || ALL, v: p.get("v") };
}

function writeUrl(lib: string, v: string | null) {
  const p = new URLSearchParams();
  if (lib !== ALL) p.set("lib", lib);
  if (v) p.set("v", v);
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `/?${qs}` : "/");
}

export function Theater() {
  const { t } = useI18n();
  const toast = useToast();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [libId, setLibId] = useState<string | null>(null); // null until URL is read
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Video | null>(null);
  const [wantYoutubeId, setWantYoutubeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const showToast = toast.show;
  const fail = useCallback((e: unknown) => showToast(e instanceof Error ? e.message : t.error, true), [showToast, t.error]);

  const loadLibraries = useCallback(async () => {
    const res = await api<{ libraries: Library[]; totalVideos: number }>("/api/libraries");
    setLibraries(res.libraries);
    setTotalCount(res.totalVideos);
  }, []);

  // Initial load: read ?lib=&v= from the URL.
  useEffect(() => {
    const { lib, v } = readUrl();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time init from the URL */
    setLibId(lib);
    setWantYoutubeId(v);
    /* eslint-enable react-hooks/set-state-in-effect */
    loadLibraries().catch(fail);
  }, [loadLibraries, fail]);

  // Load videos whenever the selected library changes.
  useEffect(() => {
    if (!libId) return;
    let cancelled = false;
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    api<Video[]>(`/api/videos?library=${encodeURIComponent(libId)}`)
      .then((list) => {
        if (cancelled) return;
        setVideos(list);
        if (libId === ALL) setTotalCount(list.length);
        setCurrent((cur) => {
          if (wantYoutubeId) return list.find((v) => v.youtube_id === wantYoutubeId) ?? cur ?? list[0] ?? null;
          return cur && list.some((v) => v.id === cur.id) ? cur : (list[0] ?? cur);
        });
        setWantYoutubeId(null);
      })
      .catch((e) => !cancelled && fail(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wantYoutubeId is consumed once per load
  }, [libId, fail]);

  useEffect(() => {
    if (libId) writeUrl(libId, current?.youtube_id ?? null);
  }, [libId, current]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) =>
      [v.title, v.channel_title, v.note].some((s) => s?.toLowerCase().includes(q)),
    );
  }, [videos, search]);

  const idx = current ? filtered.findIndex((v) => v.id === current.id) : -1;
  const selectedLib = libraries.find((l) => l.id === libId);

  // Keep the player's copy and the strip's copy of a video in sync.
  const patchVideo = (id: string, patch: (v: Video) => Video) => {
    setVideos((list) => list.map((v) => (v.id === id ? patch(v) : v)));
    setCurrent((c) => (c?.id === id ? patch(c) : c));
  };

  async function addVideo(url: string) {
    try {
      const target = libId && libId !== ALL ? libId : null;
      const res = await api<{ duplicate: boolean; video: Video }>("/api/videos", { method: "POST", body: { url, libraryId: target } });
      const v = res.video;
      setVideos((list) => {
        const without = list.filter((x) => x.id !== v.id);
        return libId === ALL ? [v, ...without] : [...without, v];
      });
      setCurrent(v);
      toast.show(res.duplicate ? `${t.alreadySaved}: ${v.title}` : `${t.savedTo} ${selectedLib?.name ?? t.allVideos}: ${v.title}`);
      loadLibraries().catch(() => {});
    } catch (e) {
      fail(e);
    }
  }

  async function reorderLibraries(next: Library[]) {
    setLibraries(next);
    await api("/api/libraries/order", { method: "PUT", body: { ids: next.map((l) => l.id) } }).catch(fail);
  }

  async function reorderVideos(next: Video[]) {
    if (!libId || libId === ALL) return;
    setVideos(next);
    await api(`/api/libraries/${libId}/videos/order`, { method: "PUT", body: { videoIds: next.map((v) => v.id) } }).catch(fail);
  }

  async function createLibrary(name: string) {
    try {
      const lib = await api<Library>("/api/libraries", { method: "POST", body: { name } });
      setLibraries((l) => [...l, lib]);
      setLibId(lib.id);
    } catch (e) {
      fail(e);
    }
  }

  async function renameLibrary(id: string, name: string) {
    try {
      await api(`/api/libraries/${id}`, { method: "PATCH", body: { name } });
      setLibraries((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)));
    } catch (e) {
      fail(e);
    }
  }

  async function deleteLibrary(id: string) {
    try {
      await api(`/api/libraries/${id}`, { method: "DELETE" });
      setLibraries((ls) => ls.filter((l) => l.id !== id));
      patchAll((v) => ({ ...v, library_ids: v.library_ids.filter((x) => x !== id) }));
      if (libId === id) setLibId(ALL);
    } catch (e) {
      fail(e);
    }
  }

  function patchAll(fn: (v: Video) => Video) {
    setVideos((list) => list.map(fn));
    setCurrent((c) => (c ? fn(c) : c));
  }

  async function toggleLibrary(v: Video, libraryId: string, inLib: boolean) {
    try {
      await api(`/api/libraries/${libraryId}/videos`, { method: inLib ? "DELETE" : "POST", body: { videoIds: [v.id] } });
      patchVideo(v.id, (x) => ({
        ...x,
        library_ids: inLib ? x.library_ids.filter((id) => id !== libraryId) : [...x.library_ids, libraryId],
      }));
      if (inLib && libId === libraryId) setVideos((list) => list.filter((x) => x.id !== v.id));
      if (!inLib && libId === libraryId) setVideos((list) => [...list, { ...v, library_ids: [...v.library_ids, libraryId] }]);
      setLibraries((ls) =>
        ls.map((l) =>
          l.id === libraryId
            ? {
                ...l,
                video_count: l.video_count + (inLib ? -1 : 1),
                total_seconds: l.total_seconds + (inLib ? -1 : 1) * (v.duration_seconds ?? 0),
              }
            : l,
        ),
      );
    } catch (e) {
      fail(e);
    }
  }

  const saveNote = useCallback(
    (v: Video, note: string) => {
      api(`/api/videos/${v.id}`, { method: "PATCH", body: { note } })
        .then(() => {
          setVideos((list) => list.map((x) => (x.id === v.id ? { ...x, note } : x)));
          setCurrent((c) => (c?.id === v.id ? { ...c, note } : c));
        })
        .catch(fail);
    },
    [fail],
  );

  async function deleteVideo(v: Video) {
    try {
      await api("/api/videos", { method: "DELETE", body: { videoIds: [v.id] } });
      const i = filtered.findIndex((x) => x.id === v.id);
      const nextCur = filtered[i + 1] ?? filtered[i - 1] ?? null;
      setVideos((list) => list.filter((x) => x.id !== v.id));
      setCurrent(nextCur);
      loadLibraries().catch(() => {});
    } catch (e) {
      fail(e);
    }
  }

  const sortable = libId !== ALL && !search.trim();

  return (
    <>
      <NavBar onAdd={addVideo} search={search} onSearch={setSearch} />
      <LibraryBar
        libraries={libraries}
        selected={libId ?? ALL}
        totalCount={totalCount}
        onSelect={(id) => {
          if (id !== libId) setLibId(id);
        }}
        onReorder={reorderLibraries}
        onCreate={createLibrary}
        onRename={renameLibrary}
        onDelete={deleteLibrary}
      />
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 pt-2 text-xs text-zinc-500">
        <span>
          {filtered.length} {t.videos}
          {selectedLib ? ` · ${t.totalRuntime} ${formatRuntime(selectedLib.total_seconds)}` : ""}
        </span>
        <span>{sortable ? `↔ ${t.dragHint}` : libId === ALL ? t.sortedNewest : ""}</span>
      </div>
      <VideoStrip
        videos={filtered}
        selectedId={current?.id ?? null}
        onSelect={setCurrent}
        onReorder={reorderVideos}
        sortable={sortable}
        loading={loading}
        emptyText={search.trim() ? t.noResults : t.noVideos}
      />
      <main className="flex-1 px-4 py-6">
        <Player
          video={current}
          libraries={libraries}
          onPrev={idx > 0 ? () => setCurrent(filtered[idx - 1]) : undefined}
          onNext={idx >= 0 && idx < filtered.length - 1 ? () => setCurrent(filtered[idx + 1]) : undefined}
          onToggleLibrary={toggleLibrary}
          onSaveNote={saveNote}
          onDelete={deleteVideo}
        />
      </main>
      {toast.node}
    </>
  );
}
