"use client";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import type { Video } from "@/lib/types";
import { SortableItem, SortableList } from "./Sortable";
import { VideoCard } from "./VideoCard";

export function VideoStrip({
  videos,
  selectedId,
  onSelect,
  onReorder,
  sortable,
  loading,
  emptyText,
  markCounts,
}: {
  videos: Video[];
  selectedId: string | null;
  onSelect: (v: Video) => void;
  onReorder: (next: Video[]) => void;
  sortable: boolean;
  loading: boolean;
  emptyText: string;
  markCounts?: Record<string, number>;
}) {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);

  // Mouse wheel scrolls the strip sideways.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Keep the selected card in view.
  useEffect(() => {
    if (!selectedId) return;
    scroller.current?.querySelector(`[data-vid="${selectedId}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const page = (dir: number) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative border-b border-zinc-800/70 bg-zinc-950">
      <div className="mx-auto max-w-[1600px]">
        <button
          onClick={() => page(-1)}
          className="absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-zinc-900/90 px-2.5 py-1.5 text-zinc-300 shadow hover:bg-zinc-800 sm:block"
          aria-label="Scroll left"
        >
          ◀
        </button>
        <button
          onClick={() => page(1)}
          className="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-zinc-900/90 px-2.5 py-1.5 text-zinc-300 shadow hover:bg-zinc-800 sm:block"
          aria-label="Scroll right"
        >
          ▶
        </button>
        <div ref={scroller} className="strip flex min-h-[172px] gap-3 overflow-x-auto px-4 py-3 sm:px-10">
          {loading && !videos.length ? (
            Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="w-[200px] shrink-0">
                <div className="aspect-video animate-pulse rounded-lg bg-zinc-800" />
                <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
              </div>
            ))
          ) : !videos.length ? (
            <p className="m-auto text-sm text-zinc-500">{emptyText}</p>
          ) : (
            <SortableList items={videos} onReorder={onReorder} disabled={!sortable}>
              {videos.map((v) => (
                <SortableItem key={v.id} id={v.id} className="w-[200px] shrink-0">
                  <div data-vid={v.id} title={sortable ? t.dragHint : undefined}>
                    <VideoCard video={v} active={v.id === selectedId} onClick={() => onSelect(v)} markCount={markCounts?.[v.id]} />
                  </div>
                </SortableItem>
              ))}
            </SortableList>
          )}
        </div>
      </div>
    </div>
  );
}
