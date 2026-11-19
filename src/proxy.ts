import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  if (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  // Remember where they were going (e.g. a shared link at /share?text=…).
  const next = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = "/login";
  url.search = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the login page/API, Next internals and static files.
  matcher: ["/((?!login|api/login|_next/|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
