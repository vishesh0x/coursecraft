/**
 * Coursecraft edge worker.
 *
 * The app is a static single-page build served by Workers Static Assets. The
 * asset layer answers real files (JS, fonts, robots.txt, security.txt) and
 * returns an honest 404 for everything else. This worker adds the one thing a
 * single-page app needs on top: for a path that is not a file, serve the app
 * shell so React Router can draw the page, with status 200 for known routes
 * and a real 404 (plus `noindex`) for unknown ones. That avoids the soft-404s
 * a blanket SPA fallback produces, and a missing hashed asset stays a 404.
 */
import { ROUTES } from "./routes";

interface Env {
  ASSETS: Fetcher;
}

const KNOWN = new Set(ROUTES);

function normalise(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;

    const url = new URL(request.url);
    const last = url.pathname.split("/").pop() ?? "";
    // Something that looks like a file but is missing: do not disguise it as a page.
    if (last.includes(".")) return asset;

    const shell = await env.ASSETS.fetch(new Request(new URL("/", url), request));
    const headers = new Headers(shell.headers);
    const known = KNOWN.has(normalise(url.pathname));
    if (!known) {
      headers.set("X-Robots-Tag", "noindex");
      headers.set("Cache-Control", "no-store");
    }
    return new Response(request.method === "HEAD" ? null : shell.body, { status: known ? shell.status : 404, headers });
  },
} satisfies ExportedHandler<Env>;
