import { SESSION_COOKIE, authEnabled, checkPasscode, sessionToken } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function POST(req: Request) {
  if (!authEnabled()) return ok({ ok: true });
  const { passcode } = await req.json().catch(() => ({ passcode: "" }));
  if (!(await checkPasscode(String(passcode ?? "")))) return fail("Wrong passcode", 401);
  const res = ok({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
