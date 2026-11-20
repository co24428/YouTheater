import "server-only";
import { NextResponse } from "next/server";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a handler so thrown errors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      let message = e instanceof Error ? e.message : (e as { message?: string })?.message || "Server error";
      if (/permission denied for (table|function|schema)/i.test(message)) {
        message +=
          " — the database role has no access. Run supabase/migrations/0002_grants.sql in the Supabase SQL Editor, and check SUPABASE_SERVICE_ROLE_KEY is the service_role (secret) key.";
      }
      console.error(e);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
