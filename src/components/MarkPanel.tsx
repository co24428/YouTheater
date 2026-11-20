"use client";
import { Fragment, useEffect, useState } from "react";
import { TIMESTAMP_IN_TEXT, formatDuration, parseTimestamp } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Mark } from "@/lib/types";

/** Text with "24:10"-style timestamps turned into seek links. */
function Linked({ text, onSeek }: { text: string; onSeek: (s: number) => void }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TIMESTAMP_IN_TEXT)) {
    const s = parseTimestamp(m[0]);
    if (s == null) continue;
    parts.push(text.slice(last, m.index));
    parts.push(
      <button key={m.index} onClick={() => onSeek(s)} className="font-mono text-accent hover:underline">
        {m[0]}
      </button>,
    );
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </>
  );
}

export function MarkPanel({
  marks,
  focusSeconds,
  focusMark,
  current,
  error,
  onSeek,
  onFocus,
  onCreate,
  onUpdate,
  onDelete,
  onReply,
  onDeleteReply,
}: {
  marks: Mark[];
  focusSeconds: number | null;
  focusMark: Mark | null;
  current: number;
  error: string | null;
  onSeek: (s: number) => void;
  onFocus: (s: number | null) => void;
  onCreate: (seconds: number, label: string) => Promise<void>;
  onUpdate: (m: Mark, patch: { label?: string; seconds?: number }) => Promise<void>;
  onDelete: (m: Mark) => Promise<void>;
  onReply: (m: Mark, body: string) => Promise<void>;
  onDeleteReply: (m: Mark, replyId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<{ time: string; label: string } | null>(null);
  const [reply, setReply] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => setReply(""), [focusMark?.id]); // eslint-disable-line react-hooks/set-state-in-effect

  const field = "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-base outline-none focus:border-accent sm:text-sm";

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const s = parseTimestamp(draft.time);
    if (s == null) return;
    await onCreate(s, draft.label);
    setDraft(null);
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          🔖 {t.marks} {marks.length > 0 && <span className="text-zinc-600">· {marks.length}</span>}
        </h2>
        <button
          onClick={() => setDraft({ time: formatDuration(Math.floor(current)), label: "" })}
          className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium"
        >
          + {t.markHere} ({formatDuration(Math.floor(current))})
        </button>
      </div>

      {error && <p className="mb-2 rounded bg-amber-950/60 px-2 py-1.5 text-xs text-amber-200">{error}</p>}

      {draft && (
        <form onSubmit={saveDraft} className="mb-3 space-y-2 rounded-lg bg-zinc-950/60 p-2">
          <div className="flex gap-2">
            <input
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
              aria-label={t.markTime}
              className={`${field} w-20 shrink-0 font-mono ${parseTimestamp(draft.time) == null ? "border-red-500" : ""}`}
            />
            <input
              autoFocus
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder={t.markLabel}
              className={field}
            />
          </div>
          <div className="flex justify-end gap-2 text-sm">
            <button type="button" onClick={() => setDraft(null)} className="px-2 text-zinc-400">
              {t.cancel}
            </button>
            <button className="rounded-lg bg-accent px-3 py-1 font-medium">{t.save}</button>
          </div>
        </form>
      )}

      {focusMark ? (
        // The mark at the hovered / tapped point, with its replies.
        <div>
          <div className="flex items-start gap-2">
            <button onClick={() => onSeek(focusMark.seconds)} className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 font-mono text-sm text-accent">
              {formatDuration(focusMark.seconds)}
            </button>
            {editing === focusMark.id ? (
              <form
                className="flex-1"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const v = (new FormData(e.currentTarget).get("label") as string) ?? "";
                  await onUpdate(focusMark, { label: v });
                  setEditing(null);
                }}
              >
                <input name="label" autoFocus defaultValue={focusMark.label} onBlur={(e) => e.currentTarget.form?.requestSubmit()} className={field} />
              </form>
            ) : (
              <p className="min-w-0 flex-1 pt-0.5 font-medium" onDoubleClick={() => setEditing(focusMark.id)}>
                {focusMark.label ? <Linked text={focusMark.label} onSeek={onSeek} /> : <span className="text-zinc-500">—</span>}
              </p>
            )}
            <button onClick={() => setEditing(focusMark.id)} className="text-zinc-500 hover:text-zinc-200" title={t.rename}>
              ✎
            </button>
            <button
              onClick={() => confirm(t.confirmDeleteMark) && onDelete(focusMark)}
              className="text-zinc-500 hover:text-red-300"
              title={t.delete}
            >
              🗑
            </button>
          </div>

          <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto border-l border-zinc-800 pl-3">
            {focusMark.replies.map((r) => (
              <li key={r.id} className="group flex gap-2 text-sm text-zinc-300">
                <span className="min-w-0 flex-1 break-words">
                  <Linked text={r.body} onSeek={onSeek} />
                </span>
                <button onClick={() => onDeleteReply(focusMark, r.id)} className="text-xs text-zinc-600 opacity-0 hover:text-red-300 group-hover:opacity-100 max-sm:opacity-100">
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!reply.trim()) return;
              await onReply(focusMark, reply.trim());
              setReply("");
            }}
          >
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t.reply} className={field} />
            <button disabled={!reply.trim()} className="shrink-0 rounded-lg bg-zinc-800 px-3 text-sm disabled:opacity-40">
              ↵
            </button>
          </form>
        </div>
      ) : focusSeconds != null ? (
        // Tapped a spot with no mark: offer to add one there.
        <div className="text-sm">
          <p className="text-zinc-400">
            {t.noMarkAt} <span className="font-mono">{formatDuration(focusSeconds)}</span>
          </p>
          {!draft && (
            <button
              onClick={() => setDraft({ time: formatDuration(focusSeconds), label: "" })}
              className="mt-2 rounded-lg bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700"
            >
              + {t.addMarkAt} {formatDuration(focusSeconds)}
            </button>
          )}
        </div>
      ) : marks.length ? (
        // Nothing focused: list every mark.
        <ul className="max-h-64 space-y-0.5 overflow-y-auto">
          {marks.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => {
                  onSeek(m.seconds);
                  onFocus(m.seconds);
                }}
                className="flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-zinc-800"
              >
                <span className="shrink-0 font-mono text-accent">{formatDuration(m.seconds)}</span>
                <span className="min-w-0 flex-1 truncate">{m.label || "—"}</span>
                {m.replies.length > 0 && <span className="shrink-0 text-xs text-zinc-500">💬 {m.replies.length}</span>}
              </button>
            </li>
          ))}
          <li className="px-1.5 pt-1 text-xs text-zinc-600">{t.hoverHint}</li>
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">{t.noMarks}</p>
      )}

      {focusSeconds != null && (
        <button onClick={() => onFocus(null)} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
          ← {t.allMarks}
        </button>
      )}
    </section>
  );
}
