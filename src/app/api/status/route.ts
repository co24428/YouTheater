import { authEnabled } from "@/lib/auth";
import { ok } from "@/lib/http";
import { keyKind } from "@/lib/supabase";
import { hasApiKey } from "@/lib/youtube";

export async function GET() {
  return ok({
    youtubeApiKey: hasApiKey(),
    supabase: Boolean(process.env.SUPABASE_URL) && keyKind() !== "missing" && keyKind() !== "public",
    supabaseWrongKey: keyKind() === "public",
    passcode: authEnabled(),
  });
}
