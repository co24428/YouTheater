import { authEnabled } from "@/lib/auth";
import { ok } from "@/lib/http";
import { hasApiKey } from "@/lib/youtube";

export async function GET() {
  return ok({
    youtubeApiKey: hasApiKey(),
    supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    passcode: authEnabled(),
  });
}
