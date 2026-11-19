export function formatDuration(total: number | null | undefined): string {
  if (total == null) return "–:–";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function formatRuntime(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatCount(n: number | null | undefined): string {
  if (n == null) return "–";
  return new Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

export function formatDate(iso: string | null | undefined, locale = "en"): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export function thumb(youtubeId: string, url?: string | null) {
  return url || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}
