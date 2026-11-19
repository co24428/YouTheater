// Shared-passcode gate. Works in both the proxy and route handlers (Web Crypto only).
export const SESSION_COOKIE = "yt_session";

export function authEnabled() {
  return Boolean(process.env.APP_PASSCODE);
}

async function hmac(key: string, msg: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The cookie value a logged-in browser holds. Changes if the passcode or secret changes. */
export async function sessionToken() {
  const secret = process.env.SESSION_SECRET || "youtheater-dev-secret";
  return hmac(secret, `passcode:${process.env.APP_PASSCODE ?? ""}`);
}

export async function isValidSession(value: string | undefined) {
  if (!authEnabled()) return true;
  if (!value) return false;
  const expected = await sessionToken();
  if (value.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < value.length; i++) diff |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function checkPasscode(input: string) {
  const expected = process.env.APP_PASSCODE ?? "";
  // Compare HMACs so timing doesn't leak the passcode.
  const [a, b] = await Promise.all([hmac("cmp", input), hmac("cmp", expected)]);
  return a === b;
}
