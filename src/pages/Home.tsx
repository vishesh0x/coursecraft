import { useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { ContentsDemo } from "../components/ContentsSheet";
import { HeroRoom, PANES, PaneStack, type Pane } from "../components/LessonPreview";
import { Stripe } from "../components/Site";
import { formatBytes, plural } from "../lib/format";
import { zigzag } from "../lib/shapes";
import type { CourseRecord } from "../lib/types";
import { usePageMeta } from "../lib/usePageMeta";
import { useCourses } from "../state/CourseContext";

const delay = (i: number) => ({ "--i": i }) as CSSProperties;
const MENU_CUT = zigzag(26, 10, { top: true, bottom: true });

function Hero() {
  const { choose, chooseCompat, nativePicker, loading, scanned, cancel } = useCourses();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <HeroRoom />
      <div className="hero-card">
        <Stripe />
        <div className="hero-body">
          <h1 id="hero-title">Open a folder. Get a course.</h1>
          <p className="hero-lede">
            Coursecraft reads a folder on your computer, sets it as chapters and lessons, and remembers where you stopped.
            Nothing is uploaded.
          </p>
          {loading ? (
            <div className="scan" role="status" aria-live="polite">
              <p>Reading your folder: {plural(scanned, "file")} so far.</p>
              <button className="btn btn-quiet" onClick={cancel}>Cancel</button>
            </div>
          ) : (
            <>
              <button className="btn" onClick={() => void choose()}>Open a course folder</button>
              {nativePicker && (
                <button className="text-btn" onClick={chooseCompat}>Use the basic folder picker instead</button>
              )}
            </>
          )}
        </div>
        <nav className="hero-links" aria-label="About">
          <Link to="/how-it-works">How it works</Link>
          <Link to="/browsers">Browsers</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </div>
    </section>
  );
}

function Stub({ record, busy }: { record: CourseRecord; busy: boolean }) {
  const { reopen, forget } = useCourses();
  const [sure, setSure] = useState(false);
  return (
    <div className="stub">
      <div className="stub-main">
        <h3 title={record.name}>{record.name}</h3>
        <p>
          {plural(record.lessonCount, "lesson")}, {formatBytes(record.totalBytes)}. Last opened{" "}
          {new Date(record.lastOpenedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>
      <div className="stub-actions">
        <button className="btn btn-small" disabled={busy} onClick={() => void reopen(record)}>
          {record.handle ? "Resume" : "Choose the folder again"}
        </button>
        {sure ? (
          <>
            <button className="text-btn" onClick={() => void forget(record)}>Remove its history and progress</button>
            <button className="text-btn" onClick={() => setSure(false)}>Keep</button>
          </>
        ) : (
          <button className="text-btn" disabled={busy} onClick={() => setSure(true)} aria-label={`Forget ${record.name}`}>Forget</button>
        )}
      </div>
    </div>
  );
}

function Library() {
  const { history, loading } = useCourses();
  if (!history.length) return null;
  return (
    <section className="field field-ground" aria-labelledby="library-title">
      <div className="frame">
        <h2 id="library-title" data-reveal>Pick up where you stopped</h2>
        <ul className="stubs">
          {history.map((r, i) => <li key={r.id} data-reveal style={delay(i)}><Stub record={r} busy={loading} /></li>)}
        </ul>
        <p className="fine" data-reveal>Forgetting a course removes its progress from this browser. The files in your folder are never touched.</p>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="field field-ink" aria-labelledby="how-title">
      <div className="frame" data-reveal>
        <ContentsDemo
          intro={
            <>
              <h2 id="how-title">Folders become chapters</h2>
              <p className="measure">
                Each folder is a chapter. Files that share a name are one lesson, so a video, its captions and its slides
                stay together. Try it on your own file names.
              </p>
            </>
          }
        />
      </div>
    </section>
  );
}

const MENU: { group: string; items: { name: string; note: string; value: string }[] }[] = [
  {
    group: "Plays",
    items: [
      { name: "Video", note: "mp4, webm, mov, m4v, ogv and mkv, as far as your browser’s codecs go.", value: "0.5 to 2× speed" },
      { name: "Captions", note: "srt or vtt beside the video. Suffixes such as .en and .de are matched; srt is converted as it loads.", value: "any number" },
      { name: "PDF", note: "Shown in your browser’s own viewer.", value: "any size" },
    ],
  },
  {
    group: "Shows",
    items: [
      { name: "HTML pages", note: "Scripts, links, frames and outside requests are switched off.", value: "up to 8 MB" },
      { name: "Code and notes", note: "md, txt, py, js, json, sql and more than forty other extensions, as plain text.", value: "first 2 MB" },
      { name: "Images", note: "jpg, png, webp, gif, avif, svg and bmp.", value: "included" },
    ],
  },
  {
    group: "Remembers",
    items: [
      { name: "Where you stopped", note: "The position in every video, restored the next time it opens.", value: "per video" },
      { name: "Finished lessons", note: "Marked by you, or when a video reaches its end.", value: "per lesson" },
      { name: "Time watched", note: "Counted from playback itself, so skipping around adds nothing.", value: "per course" },
      { name: "The folder", note: "Reopened in one click where the browser allows it.", value: "Chrome, Edge" },
    ],
  },
];

function Menu() {
  return (
    <section className="field field-ground" aria-labelledby="menu-title">
      <div className="frame">
        <div className="menu" style={{ clipPath: MENU_CUT }} data-reveal>
          <h2 id="menu-title">What it opens</h2>
          <div className="menu-groups">
          {MENU.map((g) => (
            <div key={g.group} className="menu-group">
              <h3>{g.group}</h3>
              <ul>
                {g.items.map((it) => (
                  <li key={it.name}>
                    <div className="menu-row">
                      <span className="menu-name">{it.name}</span>
                      <span className="leader" aria-hidden="true" />
                      <span className="menu-value">{it.value}</span>
                    </div>
                    <p>{it.note}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Showcase() {
  const { choose } = useCourses();
  const [pane, setPane] = useState<Pane>("video");
  const current = PANES.find((p) => p.id === pane)!;
  return (
    <section className="showcase" aria-labelledby="showcase-title">
      <div className="showcase-plate" data-reveal>
        <div className="plate" data-ui>
          <div className="viewer">
            <PaneStack pane={pane} />
            <div className="viewer-foot"><span>{current.file}</span><span>{current.size}</span></div>
          </div>
        </div>
      </div>
      <div className="showcase-copy">
        <div className="showcase-tabs" role="group" aria-label="Files in the lesson">
          {PANES.map((p) => (
            <button key={p.id} aria-pressed={pane === p.id} onClick={() => setPane(p.id)}>{p.tab}</button>
          ))}
        </div>
        <div data-reveal>
          <h2 id="showcase-title">One lesson, every file</h2>
          <p className="measure">
            Video, captions, slides and exercises sit behind one set of tabs, so a lesson never ends up spread over six windows.
          </p>
        </div>
        <div className="cells">
          <button className="cell cell-ink" onClick={() => void choose()}>Open a course folder</button>
          <Link className="cell cell-tone" to="/how-it-works">Read how it works</Link>
        </div>
      </div>
    </section>
  );
}

const PROMISES = [
  "No account", "No upload", "No analytics", "No cookies", "No fonts from elsewhere",
  "No requests once the page has loaded", "Read-only access to your folder", "Progress kept in this browser",
];

function Proof() {
  return (
    <section className="field field-ink proof" aria-labelledby="proof-title">
      <div className="programme" data-reveal>
        <h2 id="proof-title">Nothing leaves the tab</h2>
        <ul className="programme-names">
          {PROMISES.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <div className="tipped" data-ui>
          <pre className="code"><code>{`Content-Security-Policy:
  default-src 'none'; script-src 'self';
  connect-src 'none'; form-action 'none';
  frame-ancestors 'none'; …`}</code></pre>
        </div>
        <p className="programme-note">
          The page is served with a policy that forbids it from making network requests. <Link to="/privacy">Read the whole policy.</Link>
        </p>
      </div>
    </section>
  );
}

const FAQ: { q: string; a: string }[] = [
  { q: "Does it upload my files?", a: "No. Your browser reads the files from disk and plays them from memory. The page is not allowed to make network requests, and the privacy page lists the policy that enforces it." },
  { q: "Why will my MKV not play?", a: "Coursecraft hands the file to your browser, and browsers differ on Matroska and on some codecs. An mp4 with H.264 video and AAC audio plays everywhere." },
  { q: "What if I move the folder?", a: "Open it again from its new place. It is recognised when the folder name, file names, sizes and dates match; a copy that changes the dates starts fresh." },
  { q: "Where is my progress kept?", a: "In this browser’s own storage on this device, under this site’s address. Clearing site data removes it, and so does Forget in your library." },
  { q: "Does it work offline?", a: "The page has to load once. It has no service worker, so a later offline visit depends on your browser’s cache. Your course files never need the network." },
  { q: "Does it change my files?", a: "No. The folder is opened read-only, and nothing is written to it, moved or renamed." },
];

function Questions() {
  return (
    <section className="field field-ground faq" aria-labelledby="faq-title">
      <div className="frame split-5">
        <div data-reveal>
          <h2 id="faq-title">Questions</h2>
          <p className="facts-lines">
            Chrome and Edge reopen a course in one click. Firefox and Safari ask for the folder each time. Coursecraft is
            open source under the MIT licence.
          </p>
          <div className="qa">
            {FAQ.map((f) => (
              <details key={f.q} name="faq">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p><Link className="text-link" to="/browsers">Which browsers, in detail</Link></p>
        </div>
        <aside className="faq-card" data-reveal style={delay(1)} aria-label="Browser support at a glance">
          <table>
            <caption>What each browser can do</caption>
            <thead>
              <tr><th scope="col"><span className="visually-hidden">Ability</span></th><th scope="col">Chrome, Edge</th><th scope="col">Firefox</th><th scope="col">Safari</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row">Open a folder</th><td>Yes</td><td>Yes</td><td>Yes</td></tr>
              <tr><th scope="row">Reopen in one click</th><td>Yes</td><td>No</td><td>No</td></tr>
              <tr><th scope="row">Keep your progress</th><td>Yes</td><td>Yes</td><td>Yes</td></tr>
              <tr><th scope="row">Folder opened read-only</th><td>Yes</td><td>Yes</td><td>Yes</td></tr>
            </tbody>
          </table>
        </aside>
      </div>
    </section>
  );
}

function Reply() {
  const { choose } = useCourses();
  return (
    <section className="field field-ink reply" aria-labelledby="reply-title">
      <p className="reply-note" data-reveal>
        The first lesson waits where you left it, or at the beginning if you have not been here before.
      </p>
      <div className="reply-card" data-reveal style={delay(1)}>
        <h2 id="reply-title">Pick a folder</h2>
        <p>Choose the folder that holds the course. It opens in a moment.</p>
        <button className="bar-btn" onClick={() => void choose()}>Open a course folder</button>
      </div>
    </section>
  );
}

export default function Home() {
  usePageMeta("Coursecraft: open a folder, get a course");
  return (
    <main id="main">
      <Hero />
      <Library />
      <HowItWorks />
      <Menu />
      <Showcase />
      <Proof />
      <Questions />
      <Reply />
    </main>
  );
}
