import { Link, useLocation } from "react-router";
import { usePageMeta } from "../lib/usePageMeta";

export default function NotFound() {
  const { pathname } = useLocation();
  usePageMeta("Page not found · Coursecraft", { noindex: true });
  return (
    <main className="doc-page" id="main">
      <article className="sheet">
        <h1>This page is not in the folder</h1>
        <p className="doc-lede">
          Nothing lives at <code>{pathname.length > 80 ? `${pathname.slice(0, 80)}…` : pathname}</code>. It may have moved, or
          the address may have a typo.
        </p>
        <p className="doc-actions">
          <Link className="btn" to="/">Back to the start</Link>
          <Link className="text-link" to="/how-it-works">How it works</Link>
          <Link className="text-link" to="/privacy">Privacy</Link>
        </p>
      </article>
    </main>
  );
}
