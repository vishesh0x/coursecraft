import { useCallback, useEffect, useRef, useState } from "react";
import { storage } from "../lib/db";
import { errorMessage } from "../lib/format";
import type { CourseSession } from "../lib/types";

/** Keeps a session in memory, batches writes to IndexedDB once a second, and flushes when the tab hides. */
export function usePersistedSession(initial: CourseSession, onError: (message: string) => void) {
  const [session, setSession] = useState(initial);
  const latest = useRef(initial);
  const timer = useRef<number | null>(null);
  const dirty = useRef(false);
  const mounted = useRef(true);
  const report = useRef(onError);
  report.current = onError;

  const flush = useCallback(() => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    if (!dirty.current) return;
    dirty.current = false;
    storage.saveSession(latest.current).catch((error: unknown) => {
      dirty.current = true;
      report.current(`Progress could not be saved: ${errorMessage(error)}`);
    });
  }, []);

  const update = useCallback((fn: (previous: CourseSession) => CourseSession) => {
    const next = { ...fn(latest.current), updatedAt: Date.now() };
    latest.current = next;
    dirty.current = true;
    if (mounted.current) {
      setSession(next);
      // A fixed batching window, not a debounce that a busy player would extend forever.
      if (timer.current === null) timer.current = window.setTimeout(flush, 1000);
    } else flush();
  }, [flush]);

  useEffect(() => {
    mounted.current = true;
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  return { session, update, flush };
}
