const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Extract an 11-char video id from any common YouTube URL form (or a bare id). */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (ID_RE.test(s)) return s;
  let url: URL;
  try {
    url = new URL(s.startsWith("http") ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1];
    return id && ID_RE.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && ID_RE.test(v)) return v;
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v|e)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }
  return null;
}

/** Extract a playlist id (list=...) from a URL, or accept a bare playlist id. */
export function parsePlaylistId(input: string): string | null {
  const s = input.trim();
  if (/^(PL|UU|LL|FL|OL|RD)[A-Za-z0-9_-]{10,}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const list = url.searchParams.get("list");
    return list && /^[A-Za-z0-9_-]{10,}$/.test(list) ? list : null;
  } catch {
    return null;
  }
}
