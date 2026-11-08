import { useEffect, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useCourses } from "../state/CourseContext";
import { LogoMark } from "./Stickers";

export function SiteHeader() {
  const { choose, loading } = useCourses();
  return (
    <header className="nav-wrap">
      <div className="nav">
        <Link to="/" className="brand" aria-label="Coursecraft, home">
          <LogoMark />
          <span>Coursecraft</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/how-it-works">How it works</NavLink>
          <NavLink to="/browsers">Browsers</NavLink>
          <NavLink to="/privacy">Privacy</NavLink>
        </nav>
        <button className="pill pill-ink" disabled={loading} onClick={() => void choose()}>
          <span className="long">Open a course folder</span>
          <span className="short">Open folder</span>
        </button>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot-wrap">
      <div className="foot">
        <div className="foot-brand">
          <Link to="/" className="brand" aria-label="Coursecraft, home">
            <LogoMark />
            <span>Coursecraft</span>
          </Link>
          <p>Plays the course already on your disk. It runs in your browser tab, so there is no server for your course to be sent to.</p>
        </div>
        <nav className="foot-col" aria-label="Learn more">
          <h2>Learn</h2>
          <Link to="/how-it-works">How it works</Link>
          <Link to="/browsers">Which browsers</Link>
        </nav>
        <nav className="foot-col" aria-label="Trust">
          <h2>Trust</h2>
          <Link to="/privacy">Privacy and security</Link>
          <a href="/.well-known/security.txt">Report a vulnerability</a>
        </nav>
        <p className="foot-credits">© 2026 Coursecraft, open source under the MIT licence. Set in Plus Jakarta Sans and Inter, SIL Open Font Licence.</p>
      </div>
    </footer>
  );
}

export function Toast() {
  const { notice, dismissNotice } = useCourses();
  if (!notice) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <p>{notice}</p>
      <button className="icon-btn" aria-label="Dismiss message" onClick={dismissNotice}>×</button>
    </div>
  );
}

/**
 * Reveals `[data-reveal]` blocks once as they come into view. A scroll check rather than an observer, so a block the
 * visitor jumped past (End key, scrollbar drag, an anchor) is revealed too instead of staying invisible.
 */
function useReveal(key: string): void {
  useEffect(() => {
    const pending = new Set(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-in])"));
    let frame = 0;
    const check = () => {
      frame = 0;
      const line = window.innerHeight * 0.92;
      for (const el of pending) {
        if (el.getBoundingClientRect().top < line) { el.setAttribute("data-in", ""); pending.delete(el); }
      }
      if (!pending.size) detach();
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    const detach = () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    check();
    return () => { detach(); if (frame) cancelAnimationFrame(frame); };
  }, [key]);
}

export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) { document.getElementById(hash.slice(1))?.scrollIntoView(); return; }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export function SiteLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  useReveal(pathname);
  return (
    <>
      <a className="skip" href="#main">Skip to the content</a>
      <SiteHeader />
      {children ?? <Outlet />}
      <SiteFooter />
    </>
  );
}
