"use client";
import { useCallback, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const show = useCallback((text: string, error = false) => {
    setMsg({ text, error });
    setTimeout(() => setMsg((m) => (m?.text === text ? null : m)), 3500);
  }, []);
  const node = msg ? (
    <div
      className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-xl ${
        msg.error ? "bg-red-900 text-red-50" : "bg-zinc-100 text-zinc-900"
      }`}
    >
      {msg.text}
    </div>
  ) : null;
  return { show, node };
}
