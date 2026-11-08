# Coursecraft

Open a folder, get a course. Coursecraft plays the course folder already on your disk: folders become chapters,
files that share a name become one lesson (video + captions + slides + code), and it remembers where you stopped.
Everything runs in the browser tab. Nothing is uploaded.

This is a ground-up redesign and rebuild of the original Vite + React prototype.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript (strict), React Router |
| Build | Vite |
| Type | Plus Jakarta Sans and Inter (variable), self-hosted via `@fontsource-variable`, so the CSP can stay closed |
| Storage | IndexedDB (course records, folder handles, progress) |
| Hosting | Cloudflare Workers with Static Assets (`wrangler.jsonc`) |
| Tests | Vitest (grouping, captions, storage validation, route and header contract, render smoke tests) |

## Run it

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
npm test           # unit + render tests
npm run build      # typecheck, then production build into dist/
npm run cf:dev     # build, then run the real Worker locally with wrangler
```

Node 20 or newer (`.nvmrc` pins 22). The native folder picker needs a secure context: `https` or `localhost`.

## Deploy to Cloudflare

```bash
npx wrangler login
npm run deploy
```

That builds the app and publishes the `coursecraft` Worker (rename it in `wrangler.jsonc`). Add a custom domain under
Workers & Pages → your Worker → Settings → Domains.

### What the Worker does

`worker/index.ts` sits in front of the static assets. Real files are served by the asset layer. For any other path it
serves the app shell: status **200** for the routes in `worker/routes.ts`, a genuine **404** with `noindex` for
everything else (React Router draws the 404 page). A missing `/assets/…` file stays a plain 404 instead of returning
HTML. Hashed assets skip the Worker entirely (`run_worker_first` in `wrangler.jsonc`).

> **Keep in sync:** a new `<Route>` in `src/App.tsx` must also be added to `worker/routes.ts`. A test fails if you forget.

## Design

A warm gray canvas, white cards, pill-shaped controls and one highlighter yellow. The type is Plus Jakarta Sans for
display and Inter for interface text, both self-hosted. The landing page leads with the product: the hero is a working
copy of the player (pick lessons, switch files, mark one finished) running on sample data through the app's own grouping
code, and "Folders become chapters" lets you edit file names and watch the contents regroup. A highlighter swipe over
"course." is the one signature device. The player itself uses the same system: a white sidebar card, pill tabs, the media
in a white card, and yellow only on progress and finished lessons.

Motion follows a short list of rules: strong ease-out curves, 160ms press feedback on controls, hover effects only on
real pointers, only transform, opacity and clip-path animated for entrances, and a reduced-motion fallback for all of it.

## Pages

`/` home with live demo · `/course` player · `/how-it-works` · `/browsers` · `/privacy` (security policy explained) ·
404 · error boundary · "no course open" state for a reload on `/course`.

## Security

See [SECURITY.md](SECURITY.md). In short: a strict CSP and header set in `public/_headers` (`connect-src 'none'`),
HTML previews in an empty sandbox, read-only folder access, validated storage, size and depth caps, and no inline
scripts or `dangerouslySetInnerHTML` anywhere.

## Layout

```
worker/            Cloudflare Worker (routing + real 404s)
public/            _headers, robots.txt, security.txt, favicon, manifest
src/lib/           course grouping, captions, safe HTML, storage (pure, tested)
src/state/         course context, persisted session
src/components/    site chrome, contents sheet, player pieces
src/pages/         Home, Course (player), Docs pages, NotFound
src/styles/        tokens, site, app
```

## Before you ship

- Replace `OWNER` in `public/.well-known/security.txt` and refresh its `Expires` date yearly.
- Add `og:image` and a sitemap once you have a domain (both need an absolute URL).

## Licence

MIT, see [LICENSE](LICENSE).
