"use client";
import { useEffect, useState } from "react";
import { formatCount, formatDate, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Library, Video } from "@/lib/types";

export function Player({
  video,
  libraries,
  onPrev,
  onNext,
  onToggleLibrary,
  onSaveNote,
  onDelete,
}: {
  video: Video | null;
  libraries: Library[];
  onPrev?: () => void;
  onNext?: () => void;
  onToggleLibrary: (v: Video, libraryId: string, inLib: boolean) => void;
  onSaveNote: (v: Video, note: string) => void;
  onDelete: (v: Video) => void;
}) {
  const { t, lang } = useI18n();

  if (!video) {
    return (
      <div className="mx-auto flex aspect-video w-full max-w-[min(64rem,calc((100vh-340px)*1.7778))] items-center justify-center rounded-xl border border-dashed border-zinc-800 text-zinc-500">
        {t.pickVideo}
      </div>
    );
  }

  const gone = video.status === "unavailable";
  return (
    <div className="mx-auto w-full max-w-[min(64rem,max(40rem,calc((100vh-340px)*1.7778)))]">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black shadow-2xl shadow-black/50">
        {/* Not autoplaying: the video is cued and ready to play. */}
        <iframe
          key={video.youtube_id}
          src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}?rel=0&modestbranding=1&playsinline=1`}
          title={video.title}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>

      <div className="mt-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold leading-snug">{video.title || video.youtube_id}</h1>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-400">
            {video.channel_title && (
              <a
                href={video.channel_id ? `https://www.youtube.com/channel/${video.channel_id}` : undefined}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-zinc-200 hover:underline"
              >
                {video.channel_title}
              </a>
            )}
            <span>⏱ {formatDuration(video.duration_seconds)}</span>
            <span>
              👁 {formatCount(video.view_count)} {t.views}
            </span>
            <span>
              {t.published} {formatDate(video.published_at, lang)}
            </span>
            <span>
              {t.added} {formatDate(video.added_at, lang)}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={onPrev} disabled={!onPrev} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm disabled:opacity-30" title={t.prev}>
            ⏮
          </button>
          <button onClick={onNext} disabled={!onNext} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm disabled:opacity-30" title={t.next}>
            ⏭
          </button>
        </div>
      </div>

      {gone && <p className="mt-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">{t.unavailableHint}</p>}

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
        <NoteBox key={video.id} video={video} onSave={onSaveNote} />

        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">{t.inLibraries}</p>
            <div className="flex flex-wrap gap-1.5">
              {libraries.map((l) => {
                const inLib = video.library_ids.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => onToggleLibrary(video, l.id, inLib)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      inLib ? "border-accent bg-accent/20 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {inLib ? "✓ " : "+ "}
                    {l.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <a
              href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700"
            >
              ↗ {t.openOnYoutube}
            </a>
            <button
              onClick={() => confirm(t.confirmDeleteVideo) && onDelete(video)}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-red-300 hover:bg-red-900/50"
            >
              🗑 {t.deleteFromArchive}
            </button>
          </div>
        </div>
      </div>

      {video.description && (
        <details className="mt-4 rounded-lg bg-zinc-900/60 p-3 text-sm text-zinc-400">
          <summary className="cursor-pointer text-zinc-300">{t.description}</summary>
          <p className="mt-2 whitespace-pre-wrap">{video.description}</p>
        </details>
      )}
    </div>
  );
}

function NoteBox({ video, onSave }: { video: Video; onSave: (v: Video, note: string) => void }) {
  const { t } = useI18n();
  const [note, setNote] = useState(video.note ?? "");
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    if (saved) return;
    const id = setTimeout(() => {
      onSave(video, note);
      setSaved(true);
    }, 800);
    return () => clearTimeout(id);
  }, [note, saved, video, onSave]);
  return (
    <label className="block">
      <span className="mb-1.5 flex justify-between text-xs font-medium uppercase tracking-wide text-zinc-500">
        {t.note} {!saved && <span className="normal-case text-zinc-600">…</span>}
      </span>
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        placeholder={t.notePlaceholder}
        rows={3}
        className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
      />
    </label>
  );
}
