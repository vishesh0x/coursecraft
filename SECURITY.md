# Security

## Reporting

Report vulnerabilities privately through GitHub's "Report a vulnerability" form on the repository's Security tab
(the same address is published in `public/.well-known/security.txt`). Please do not open a public issue and do not
attach a real course. Expect an acknowledgement within a few days.

## Threat model

Coursecraft opens a folder the user chooses and plays it in the browser. The assets worth protecting are the
contents of that folder and the integrity of the page that reads them.

| Risk | Control |
| --- | --- |
| The page sends course data somewhere | CSP `connect-src 'none'`, `default-src 'none'`, no third-party scripts, fonts or analytics (`public/_headers`). |
| Script injection via the app | No `dangerouslySetInnerHTML`, no `eval`, no inline scripts; CSP `script-src 'self'`, no `unsafe-inline`/`unsafe-eval`. |
| Malicious HTML file inside a course | Stripped of scripts, frames, forms, links and handlers, then shown in an `iframe sandbox=""` (unique origin, no scripts) with its own CSP. See `src/lib/safeHtml.ts`. |
| Malicious SVG | Shown through `<img>`, which never runs script. |
| PDF | Drawn onto canvases by pdf.js in a same-origin worker (`worker-src 'self'`); no browser plug-in, no `eval`, `object-src 'none'`. The worker cannot make requests (`connect-src 'none'`). |
| Clickjacking / embedding | `frame-ancestors 'none'`. |
| Tampered or corrupt stored progress | Everything read from IndexedDB is validated and clamped (`normalizeSession`). |
| Huge or hostile folders | Capped at 25,000 files and 32 levels deep; text previews capped at 2 MB, HTML at 8 MB; scan can be cancelled. |
| Folder modified by the app | The folder is requested with `mode: "read"`; nothing is written to it. |
| MIME sniffing, referrer leaks, powerful APIs | `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, COOP/CORP. |
| Dependencies | Small tree (React, React Router, one font package); `npm audit` is clean at release. Run it in CI. |

## Keeping the headers honest

`public/_headers` is the policy. The privacy page and a unit test (`src/lib/deploy.test.ts`) depend on it, so change them
together. If you add a feature that needs a new origin, loosen the single directive that needs it, never `default-src`.
