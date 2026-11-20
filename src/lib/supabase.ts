import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Which kind of key is in SUPABASE_SERVICE_ROLE_KEY. The public anon/publishable
 * key can't access the tables (by design), so catch that mix-up early.
 */
export function keyKind(key = process.env.SUPABASE_SERVICE_ROLE_KEY): "missing" | "secret" | "public" | "unknown" {
  if (!key) return "missing";
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_publishable_")) return "public";
  const payload = key.split(".")[1];
  if (payload) {
    try {
      const role = JSON.parse(Buffer.from(payload, "base64url").toString()).role;
      if (role === "service_role") return "secret";
      if (role === "anon" || role === "authenticated") return "public";
    } catch {
      /* not a JWT */
    }
  }
  return "unknown";
}

const WRONG_KEY =
  "SUPABASE_SERVICE_ROLE_KEY holds the public anon/publishable key. Use the service_role (secret) key from Supabase → Project Settings → API Keys, then redeploy.";

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (keyKind(key) === "public") throw new Error(WRONG_KEY);
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
