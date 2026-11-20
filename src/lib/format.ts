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

/** "23:30" / "1:02:10" / "90" → seconds. Returns null if it isn't a time. */
export function parseTimestamp(input: string): number | null {
  const s = input.trim();
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(s)) return null;
  const parts = s.split(":").map(Number);
  if (parts.slice(1).some((p) => p >= 60)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** Timestamps written inside free text, e.g. "best part at 24:10". */
export const TIMESTAMP_IN_TEXT = /\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/g;

export function timestampsIn(text: string): number[] {
  return (text.match(TIMESTAMP_IN_TEXT) ?? []).map(parseTimestamp).filter((n): n is number => n != null);
}
