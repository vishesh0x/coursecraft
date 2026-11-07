import { useEffect, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { scallopPath } from "../lib/shapes";
import { useCourses } from "../state/CourseContext";

export function Stripe({ bars = 48 }: { bars?: number }) {
  return (
    <div className="stripe" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => <span key={i} />)}
    </div>
  );
}

export function SiteHeader() {
  const { choose } = useCourses();
  return (
    <header className="site-head">
      <Link to="/" className="wordmark" aria-label="Coursecraft, home">Coursecraft</Link>
      <nav className="site-nav" aria-label="Main">
        <NavLink to="/how-it-works">How it works</NavLink>
        <NavLink to="/browsers">Browsers</NavLink>
        <NavLink to="/privacy">Privacy</NavLink>
      </nav>
      <button className="btn btn-small" onClick={() => void choose()}>Open a course folder</button>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="foot-card">
        <svg className="scallops" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={scallopPath(12)} />
        </svg>
        <div className="foot-body">
          <div className="foot-note">
            <p className="foot-title">Study at your own pace.</p>
            <p>
              Coursecraft runs in your browser tab. There is no server for your course to be sent to, and no account to
              keep it under.
            </p>
          </div>
          <nav className="foot-links" aria-label="Footer">
            <Link to="/how-it-works">How it works</Link>
            <Link to="/browsers">Which browsers</Link>
            <Link to="/privacy">Privacy and security</Link>
            <a href="/.well-known/security.txt">Report a vulnerability</a>
          </nav>
        </div>
        <p className="imprint">Coursecraft · open source under the MIT licence</p>
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

/** Reveals `[data-reveal]` blocks once as they enter the screen. Content stays visible without script. */
function useReveal(key: string): void {
  useEffect(() => {
    const targets = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-in])")];
    if (!("IntersectionObserver" in window)) { targets.forEach((t) => t.setAttribute("data-in", "")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-in", "");
        io.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
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
