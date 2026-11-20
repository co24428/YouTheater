"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCount, formatDate, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Library, Mark, MarkReply, Video } from "@/lib/types";
import { useYouTubePlayer } from "@/lib/useYouTubePlayer";
import { MarkPanel } from "./MarkPanel";
import { Timeline, markNear } from "./Timeline";

type PlayerProps = {
  video: Video | null;
  libraries: Library[];
  onPrev?: () => void;
  onNext?: () => void;
  onToggleLibrary: (v: Video, libraryId: string, inLib: boolean) => void;
  onSaveNote: (v: Video, note: string) => void;
  onDelete: (v: Video) => void;
  onMarkCount?: (videoId: string, count: number) => void;
};

const WIDTH = "max-w-[min(64rem,max(40rem,calc((100vh-380px)*1.7778)))]";
// Video size when the marks panel sits beside it (wide screens).
// Leaves room for nav, libraries, strip and the timeline bar so all fit on one screen.
const VIDEO_W = "max-w-[max(28rem,calc((100vh-410px)*1.7778))]";

export function Player(props: PlayerProps) {
  const { t } = useI18n();
  if (!props.video) {
    return (
      <div
        className={`mx-auto flex aspect-video w-full ${WIDTH} items-center justify-center rounded-xl border border-dashed border-zinc-800 text-zinc-500`}
      >
        {t.pickVideo}
      </div>
    );
  }
  return <PlayerInner {...props} video={props.video} />;
}

function PlayerInner({
  video,
  libraries,
  onPrev,
  onNext,
  onToggleLibrary,
  onSaveNote,
  onDelete,
  onMarkCount,
}: PlayerProps & { video: Video }) {
  const { t, lang } = useI18n();
  const {
    hostRef,
    time,
    duration: playerDuration,
    seek,
  } = useYouTubePlayer(video.youtube_id);
  const duration = video.duration_seconds || Math.round(playerDuration);

  const [marks, setMarks] = useState<Mark[]>([]);
  const [marksError, setMarksError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);

  // Load marks for this video.
  useEffect(() => {
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- reset for the new video */
    setMarks([]);
    setPinned(null);
    setMarksError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    api<Mark[]>(`/api/videos/${video.id}/marks`)
      .then((m) => !cancelled && setMarks([...m].sort((a, b) => a.seconds - b.seconds)))
      .catch(
        (e: Error) =>
          !cancelled &&
          setMarksError(
            /marks|schema cache/i.test(e.message)
              ? t.needsMarksTable
              : e.message,
          ),
      );
    return () => {
      cancelled = true;
    };
  }, [video.id, t.needsMarksTable]);

  const updateMarks = (next: Mark[]) => {
    const sorted = [...next].sort((a, b) => a.seconds - b.seconds);
    setMarks(sorted);
    onMarkCount?.(video.id, sorted.length);
  };

  const focusSeconds = hover ?? pinned;
  const focusMark = markNear(marks, focusSeconds, duration || 1);

  const report = (e: unknown) =>
    setMarksError(e instanceof Error ? e.message : t.error);

  const gone = video.status === "unavailable";
  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-x-5 gap-y-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className={`order-1 mx-auto w-full ${VIDEO_W}`}>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black shadow-2xl shadow-black/50">
          {/* YouTube player: cued, not autoplaying. */}
          <div ref={hostRef} className="yt-host absolute inset-0" />
        </div>

        <Timeline
          duration={duration}
          current={time}
          marks={marks}
          activeMarkId={focusMark?.id ?? null}
          onHover={setHover}
          onPick={(s) => {
            const near = markNear(marks, s, duration);
            seek(near ? near.seconds : s);
            setPinned(near ? near.seconds : s);
          }}
          activeMark={focusMark}
        />
      </div>

      <div className="order-2 flex items-start gap-3 lg:order-3 lg:col-span-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold leading-snug">
            {video.title || video.youtube_id}
          </h1>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-400">
            {video.channel_title && (
              <a
                href={
                  video.channel_id
                    ? `https://www.youtube.com/channel/${video.channel_id}`
                    : undefined
                }
                target="_blank"
                rel="noreferrer"
                className="font-medium text-zinc-200 hover:underline"
              >
                {video.channel_title}
              </a>
            )}
            <span>⏱ {formatDuration(duration || null)}</span>
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
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm disabled:opacity-30"
            title={t.prev}
          >
            ⏮
          </button>
          <button
            onClick={onNext}
            disabled={!onNext}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm disabled:opacity-30"
            title={t.next}
          >
            ⏭
          </button>
        </div>
      </div>

      {gone && (
        <p className="order-2 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200 lg:order-3 lg:col-span-2">
          {t.unavailableHint}
        </p>
      )}

      {/* Right bottom, beside the video: marks and replies at the hovered / tapped point. */}
      <div className="order-3 lg:order-2 lg:self-end">
        <MarkPanel
          marks={marks}
          focusSeconds={focusSeconds}
          focusMark={focusMark}
          current={time}
          error={marksError}
          onSeek={seek}
          onFocus={setPinned}
          onCreate={async (seconds, label) => {
            try {
              const m = await api<Mark>(`/api/videos/${video.id}/marks`, {
                method: "POST",
                body: { seconds, label },
              });
              updateMarks([...marks, m]);
              setPinned(m.seconds);
            } catch (e) {
              report(e);
            }
          }}
          onUpdate={async (m, patch) => {
            try {
              await api(`/api/marks/${m.id}`, { method: "PATCH", body: patch });
              updateMarks(
                marks.map((x) => (x.id === m.id ? { ...x, ...patch } : x)),
              );
            } catch (e) {
              report(e);
            }
          }}
          onDelete={async (m) => {
            try {
              await api(`/api/marks/${m.id}`, { method: "DELETE" });
              updateMarks(marks.filter((x) => x.id !== m.id));
              setPinned(null);
            } catch (e) {
              report(e);
            }
          }}
          onReply={async (m, body) => {
            try {
              const r = await api<MarkReply>(`/api/marks/${m.id}/replies`, {
                method: "POST",
                body: { body },
              });
              setMarks((ms) =>
                ms.map((x) =>
                  x.id === m.id ? { ...x, replies: [...x.replies, r] } : x,
                ),
              );
            } catch (e) {
              report(e);
            }
          }}
          onDeleteReply={async (m, replyId) => {
            try {
              await api(`/api/replies/${replyId}`, { method: "DELETE" });
              setMarks((ms) =>
                ms.map((x) =>
                  x.id === m.id
                    ? {
                        ...x,
                        replies: x.replies.filter((r) => r.id !== replyId),
                      }
                    : x,
                ),
              );
            } catch (e) {
              report(e);
            }
          }}
        />
      </div>

      <div className="order-4 grid gap-4 md:grid-cols-2 lg:col-span-2">
        <NoteBox key={video.id} video={video} onSave={onSaveNote} />
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t.inLibraries}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {libraries.map((l) => {
                const inLib = video.library_ids.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => onToggleLibrary(video, l.id, inLib)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      inLib
                        ? "border-accent bg-accent/20 text-white"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
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
        {video.description && (
          <details className="rounded-lg bg-zinc-900/60 p-3 text-sm text-zinc-400 md:col-span-2">
            <summary className="cursor-pointer text-zinc-300">
              {t.description}
            </summary>
            <p className="mt-2 whitespace-pre-wrap">{video.description}</p>
          </details>
        )}
      </div>
    </div>
  );
}

function NoteBox({
  video,
  onSave,
}: {
  video: Video;
  onSave: (v: Video, note: string) => void;
}) {
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
        {t.note}{" "}
        {!saved && <span className="normal-case text-zinc-600">…</span>}
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
