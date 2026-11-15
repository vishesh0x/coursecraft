import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "coursecraft-theme";
const listeners = new Set<() => void>();
const prefersDark = () => window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;

/** A stored choice wins; otherwise follow the device. */
export function resolveTheme(stored: string | null, systemDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return systemDark ? "dark" : "light";
}

function stored(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function current(): Theme {
  const applied = document.documentElement.dataset.theme;
  return resolveTheme(applied ?? stored(), prefersDark()?.matches ?? false);
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* the choice still applies for this visit */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0f0f11" : "#f3f2ef");
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const mq = prefersDark();
  const onSystem = () => { if (!document.documentElement.dataset.theme) onChange(); };
  mq?.addEventListener("change", onSystem);
  return () => { listeners.delete(onChange); mq?.removeEventListener("change", onSystem); };
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, current, () => "light" as Theme);
  return [theme, () => setTheme(theme === "dark" ? "light" : "dark")];
}
