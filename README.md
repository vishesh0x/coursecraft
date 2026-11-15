# Coursecraft

**Live: [cc.visheshraghuvanshi.in](https://cc.visheshraghuvanshi.in)**

Open a folder, get a course. Coursecraft plays the course folder already on your disk: folders become chapters, files
that share a name become one lesson (video + captions + slides + code), and it remembers where you stopped.
Everything runs in the browser tab. Nothing is uploaded.

## Features

- **Folders become chapters.** Files with the same base name group into a single lesson.
- **Video, audio, captions, PDFs, images, code and HTML** play or preview in place. HTML previews run in an empty sandbox.
- **Resume where you stopped.** Course records, folder handles and progress live in IndexedDB on your device.
- **Private by construction.** No accounts, analytics or third-party requests; the CSP forbids them (`connect-src 'none'`).
- **Light and dark**, following the system with a manual toggle.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript (strict), React Router |
| Build | Vite |
| Type | Plus Jakarta Sans and Inter (variable), self-hosted via `@fontsource-variable`; the Latin files are preloaded |
| Storage | IndexedDB (course records, folder handles, progress) |
| PDFs | pdf.js, loaded only when a PDF is opened and drawn page by page |
| Hosting | Cloudflare Workers with Static Assets (`wrangler.jsonc`) |
| Tests | Vitest + jsdom (grouping, captions, storage validation, route and header contract, render smoke tests) |

## Run it

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
npm test           # unit + render tests
npm run build      # typecheck, then production build into dist/
npm run cf:dev     # build, then run the real Worker locally with wrangler
```

Node 20 or newer (`.nvmrc` pins 22). The native folder picker needs a secure context: `https` or `localhost`, and a
Chromium-based browser (see the `/browsers` page in the app for details).

## Deploy to Cloudflare

```bash
npx wrangler login
npm run deploy
```

This builds the app and publishes the `coursecraft` Worker (rename it in `wrangler.jsonc`). Add a custom domain under
Workers & Pages → your Worker → Settings → Domains.

### What the Worker does

`worker/index.ts` sits in front of the static assets. Real files are served by the asset layer. For any other path it
serves the app shell: status **200** for the routes in `worker/routes.ts`, a genuine **404** with `noindex` for
everything else (React Router draws the 404 page). A missing `/assets/…` file stays a plain 404 instead of returning
HTML. Hashed assets skip the Worker entirely (`run_worker_first` in `wrangler.jsonc`).

> **Keep in sync:** a new `<Route>` in `src/App.tsx` must also be added to `worker/routes.ts`. A test fails if you forget.

### Cloudflare Web Analytics

If Web Analytics auto-injection is on for your zone, Cloudflare adds a `beacon.min.js` script to the page. The strict CSP
blocks it and logs a console error. HTML responses are served with `Cache-Control: no-transform`, which tells Cloudflare
not to modify them, so nothing is injected. If you still see the error, turn the setting off under
Analytics & Logs → Web Analytics → your site → Manage site → Disable. Do not loosen the CSP to allow it: the "nothing
leaves your browser" promise depends on it.

## Performance notes

- The only render-blocking requests are the stylesheet and `theme.js`. `theme.js` has to run before first paint to apply
  the saved theme without a flash, and the CSP forbids inlining it.
- The two Latin font files used on first paint are preloaded from `<head>`, so they download alongside the CSS rather
  than after it.
- pdf.js (about 440 kB plus its worker) is a lazy chunk and never loads unless a PDF is opened.

## Design audit

The stylesheets start with a Hallmark stamp (`src/styles/tokens.css`) recording the design decisions and the few gates waived on purpose, each with its reason. The last audit reported 0 Floor failures and 0 open Reflex findings.

## Pages

`/` home with live demo · `/course` player · `/how-it-works` · `/browsers` · `/privacy` (security policy explained) ·
404 · error boundary · "no course open" state for a reload on `/course`.

## Security

See [SECURITY.md](SECURITY.md). In short: a strict CSP and header set in `public/_headers`, HTML previews in an empty
sandbox, read-only folder access, validated storage, size and depth caps, and no inline scripts or
`dangerouslySetInnerHTML` anywhere. `npm audit` reports 0 vulnerabilities.

## Layout

```
worker/            Cloudflare Worker (routing + real 404s)
public/            _headers, robots.txt, security.txt, favicon, manifest, theme.js
src/lib/           course grouping, captions, safe HTML, storage (pure, tested)
src/state/         course context, persisted session
src/components/    site chrome, contents sheet, player pieces
src/pages/         Home, Course (player), Docs pages, NotFound
src/styles/        tokens, site, app
```

## Before you ship

- `public/.well-known/security.txt` points at `github.com/vishesh0x/coursecraft`: make sure that repository exists with
  private vulnerability reporting on, and refresh the file's `Expires` date yearly.
- Add `og:image` and a sitemap (both need absolute URLs, e.g. `https://cc.visheshraghuvanshi.in/...`).

## Licence

MIT, see [LICENSE](LICENSE).
