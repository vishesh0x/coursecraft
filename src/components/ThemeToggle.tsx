import { useTheme } from "../lib/theme";

/** Sun and moon sit in the same spot and swap with a short scale-and-blur crossfade, so the change never reads as a hard cut. */
export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const dark = theme === "dark";
  return (
    <button className="theme-btn" type="button" aria-label="Dark theme" aria-pressed={dark} onClick={toggle}>
      <svg className="theme-icon theme-sun" data-on={!dark} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <svg className="theme-icon theme-moon" data-on={dark} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
