"use client";
import { formatDuration, thumb } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Video } from "@/lib/types";

export function VideoCard({ video, active, onClick }: { video: Video; active?: boolean; onClick?: () => void }) {
  const { t } = useI18n();
  const gone = video.status === "unavailable";
  return (
    <button
      onClick={onClick}
      className={`group block w-full text-left outline-none ${active ? "" : "opacity-90 hover:opacity-100"}`}
      title={video.title}
    >
      <div
        className={`relative aspect-video overflow-hidden rounded-lg bg-zinc-800 ring-2 transition ${
          active ? "ring-accent" : "ring-transparent group-hover:ring-zinc-600"
        }`}
      >
        <img
          src={thumb(video.youtube_id, video.thumbnail_url)}
          alt=""
          loading="lazy"
          draggable={false}
          className={`h-full w-full object-cover ${gone ? "grayscale opacity-50" : ""}`}
        />
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px]">
          {formatDuration(video.duration_seconds)}
        </span>
        {gone && (
          <span className="absolute left-1 top-1 rounded bg-red-900/90 px-1.5 py-0.5 text-[10px] font-medium uppercase">
            {t.unavailable}
          </span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-zinc-200">{video.title || video.youtube_id}</p>
      <p className="truncate text-xs text-zinc-500">{video.channel_title}</p>
    </button>
  );
}
