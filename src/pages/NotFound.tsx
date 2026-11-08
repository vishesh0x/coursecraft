import { Link, useLocation } from "react-router";
import { DocPage } from "../components/DocPage";
import { usePageMeta } from "../lib/usePageMeta";

export default function NotFound() {
  const { pathname } = useLocation();
  usePageMeta("Page not found · Coursecraft", { noindex: true });
  return (
    <DocPage
      title="This page is not in the folder"
      lede={`Nothing lives at ${pathname.length > 60 ? `${pathname.slice(0, 60)}…` : pathname}. It may have moved, or the address may have a typo.`}
    >
      <p className="doc-actions">
        <Link className="pill pill-hi pill-lg" to="/">Back to the start</Link>
        <Link className="text-link" to="/how-it-works">How it works</Link>
        <Link className="text-link" to="/privacy">Privacy</Link>
      </p>
    </DocPage>
  );
}
