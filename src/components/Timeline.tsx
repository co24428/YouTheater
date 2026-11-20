"use client";
import { useMemo, useRef, useState } from "react";
import { formatDuration, timestampsIn } from "@/lib/format";
import type { Mark } from "@/lib/types";

const BUCKETS = 120;

/** The mark closest to `seconds`, if it's near enough to count as "at" that spot. */
export function markNear(marks: Mark[], seconds: number | null, duration: number): Mark | null {
  if (seconds == null || !marks.length) return null;
  const window = Math.max(3, duration * 0.015);
  let best: Mark | null = null;
  for (const m of marks) {
    const d = Math.abs(m.seconds - seconds);
    if (d <= window && (!best || d < Math.abs(best.seconds - seconds))) best = m;
  }
  return best;
}

/**
 * Activity per time slot: each mark counts 1 + its replies, and every
 * timestamp written in a label or reply ("best part at 24:10") counts 1 there.
 */
function activity(marks: Mark[], duration: number): number[] {
  const raw = new Array(BUCKETS).fill(0);
  const add = (sec: number, n: number) => {
    if (sec < 0 || sec > duration) return;
    raw[Math.min(BUCKETS - 1, Math.floor((sec / duration) * BUCKETS))] += n;
  };
  for (const m of marks) {
    add(m.seconds, 1 + m.replies.length);
    for (const s of timestampsIn(m.label)) add(s, 1);
    for (const r of m.replies) for (const s of timestampsIn(r.body)) add(s, 1);
  }
  // Soften into a hill shape.
  const k = [0.1, 0.25, 0.5, 0.8, 1, 0.8, 0.5, 0.25, 0.1];
  const r = (k.length - 1) / 2;
  return raw.map((_, i) => k.reduce((sum, w, j) => sum + w * (raw[i + j - r] ?? 0), 0));
}

export function Timeline({
  duration,
  current,
  marks,
  activeMarkId,
  onHover,
  onPick,
  activeMark,
}: {
  duration: number;
  current: number;
  marks: Mark[];
  activeMarkId: string | null;
  onHover: (seconds: number | null) => void;
  onPick: (seconds: number) => void;
  activeMark?: Mark | null;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const heat = useMemo(() => (duration > 0 ? activity(marks, duration) : []), [marks, duration]);
  const max = Math.max(0, ...heat);

  const toSeconds = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return { f, s: Math.round(f * duration) };
  };

  if (!duration) {
    return <div className="mt-3 h-10 animate-pulse rounded bg-zinc-900" />;
  }

  // Area path for the activity graph (viewBox 1000 × 100).
  const path =
    max > 0
      ? `M0,100 ` +
        heat.map((v, i) => `L${((i + 0.5) / BUCKETS) * 1000},${100 - (v / max) * 92}`).join(" ") +
        ` L1000,100 Z`
      : "";

  const pct = (s: number) => `${(s / duration) * 100}%`;
  const hoverSec = hoverX != null ? Math.round(hoverX * duration) : null;

  return (
    <div className="mt-2 select-none">
      <div
        ref={bar}
        className="relative h-14 cursor-pointer touch-none"
        onPointerMove={(e) => {
          const { f, s } = toSeconds(e.clientX);
          setHoverX(f);
          onHover(s);
        }}
        onPointerLeave={() => {
          setHoverX(null);
          onHover(null);
        }}
        onPointerUp={(e) => {
          const { s } = toSeconds(e.clientX);
          onPick(s);
          if (e.pointerType !== "mouse") {
            setHoverX(null);
            onHover(null);
          }
        }}
      >
        {/* Activity graph, rising from the bar */}
        {path && (
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-5 h-8 w-full">
            <path d={path} className="fill-accent/30" />
          </svg>
        )}

        {/* Track */}
        <div className="absolute inset-x-0 bottom-4 h-1.5 rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-zinc-500" style={{ width: pct(Math.min(current, duration)) }} />
        </div>

        {/* Marks */}
        {marks.map((m) => {
          const active = m.id === activeMarkId;
          return (
            <span
              key={m.id}
              title={`${formatDuration(m.seconds)} ${m.label}`}
              className={`absolute bottom-[11px] -translate-x-1/2 rounded-full border-2 border-zinc-950 transition-all ${
                active ? "h-4 w-4 bg-white" : "h-3 w-3 bg-accent"
              }`}
              style={{ left: pct(m.seconds), marginBottom: active ? -2 : 0 }}
            />
          );
        })}

        {/* Playhead */}
        <span className="absolute bottom-[13px] h-3 w-0.5 -translate-x-1/2 bg-white" style={{ left: pct(Math.min(current, duration)) }} />

        {/* Hover line + time */}
        {hoverX != null && (
          <>
            <span className="pointer-events-none absolute bottom-3 top-0 w-px bg-zinc-400/60" style={{ left: `${hoverX * 100}%` }} />
            <div
              className="pointer-events-none absolute bottom-full z-20 mb-1 w-max max-w-64 -translate-x-1/2 rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-900 shadow-xl"
              style={{ left: `clamp(${activeMark ? 128 : 24}px, ${hoverX * 100}%, calc(100% - ${activeMark ? 128 : 24}px))` }}
            >
              <span className="font-mono">{formatDuration(activeMark ? activeMark.seconds : hoverSec)}</span>
              {activeMark && (
                <>
                  {activeMark.label && <span className="ml-1.5 font-medium">{activeMark.label}</span>}
                  {activeMark.replies.slice(0, 3).map((r) => (
                    <p key={r.id} className="mt-0.5 truncate border-l-2 border-zinc-300 pl-1.5 text-zinc-600">
                      {r.body}
                    </p>
                  ))}
                  {activeMark.replies.length > 3 && <p className="text-zinc-500">+{activeMark.replies.length - 3}</p>}
                </>
              )}
            </div>
          </>
        )}

        {/* Current / total */}
        <span className="absolute bottom-0 left-0 font-mono text-[11px] text-zinc-500">{formatDuration(Math.floor(current))}</span>
        <span className="absolute bottom-0 right-0 font-mono text-[11px] text-zinc-300">{formatDuration(duration)}</span>
      </div>
    </div>
  );
}
