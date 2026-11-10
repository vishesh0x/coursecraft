import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router";
import { ContentsDemo } from "../components/ContentsSheet";
import { HeroPlayer } from "../components/HeroPlayer";
import { Check, FolderSticker, PlaySticker } from "../components/Stickers";
import { pickerNote } from "../lib/capability";
import { formatBytes, plural } from "../lib/format";
import type { CourseRecord } from "../lib/types";
import { usePageMeta } from "../lib/usePageMeta";
import { useCourses } from "../state/CourseContext";

const delay = (i: number) => ({ "--i": i }) as CSSProperties;

function Hero() {
  const { choose, chooseFiles, mode, loading, scanned, cancel } = useCourses();
  const note = pickerNote(mode);
  return (
    <section className="hero" aria-labelledby="hero-title">
      <h1 id="hero-title" className="rise" style={delay(0)}>
        Open a folder,<FolderSticker />
        <br />
        get a <span className="mark">course.</span><PlaySticker />
      </h1>
      <p className="hero-sub rise" style={delay(1)}>
        Coursecraft plays the course already on your disk, one lesson at a time, and remembers where you stopped.
        Nothing is uploaded.
      </p>
      {loading ? (
        <p className="hero-scan rise" role="status" aria-live="polite" style={delay(2)}>
          Reading your folder: {plural(scanned, "file")} so far.{" "}
          <button className="text-btn" onClick={cancel}>Cancel</button>
        </p>
      ) : (
        <div className="pair rise" style={delay(2)}>
          <button className="pill pill-hi pill-lg" onClick={() => void choose()}>{mode === "files" ? "Choose course files" : "Open a course folder"}</button>
          <a className="pill pill-ink pill-lg" href="#how">See how it works</a>
        </div>
      )}
      {note && !loading && (
        <p className="hero-note rise" style={delay(3)}>
          {note}
          {mode !== "files" && <> <button className="text-btn" onClick={chooseFiles}>Choose individual files instead</button></>}
        </p>
      )}
      <div className="hero-stage rise" style={delay(4)}>
        <HeroPlayer />
      </div>
    </section>
  );
}

const FILE_TYPES = ["mp4", "webm", "mov", "mkv", "mp3", "m4a", "wav", "srt", "vtt", "pdf", "html", "md", "txt", "py", "js", "json", "sql", "png", "jpg", "svg", "gif"];

function Opens() {
  return (
    <section className="opens" aria-labelledby="opens-title">
      <p id="opens-title" data-reveal>Opens the files already in your course folder</p>
      <ul data-reveal style={delay(1)}>
        {FILE_TYPES.map((t) => <li key={t}>{t}</li>)}
        <li className="more">and about forty more as plain text</li>
      </ul>
    </section>
  );
}

function Stub({ record, busy }: { record: CourseRecord; busy: boolean }) {
  const { reopen, forget } = useCourses();
  const [sure, setSure] = useState(false);
  return (
    <div className="stub">
      <div>
        <h3 title={record.name}>{record.name}</h3>
        <p>
          {plural(record.lessonCount, "lesson")}, {formatBytes(record.totalBytes)}. Last opened{" "}
          {new Date(record.lastOpenedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>
      <div className="stub-actions">
        <button className="pill pill-hi" disabled={busy} onClick={() => void reopen(record)}>
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
    <section className="block" aria-labelledby="library-title">
      <h2 id="library-title" data-reveal>Pick up where you stopped</h2>
      <ul className="stubs">
        {history.map((r, i) => <li key={r.id} data-reveal style={delay(i)}><Stub record={r} busy={loading} /></li>)}
      </ul>
      <p className="fine" data-reveal>Forgetting a course removes its progress from this browser. The files in your folder are never touched.</p>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="block" id="how" aria-labelledby="how-title">
      <div className="block-head" data-reveal>
        <h2 id="how-title">Folders become chapters</h2>
        <p>
          Each folder is a chapter. Files that share a name are one lesson, so a video, its captions and its slides stay
          together. Try it on your own file names.
        </p>
      </div>
      <div className="demo-card" data-reveal style={delay(1)}>
        <ContentsDemo />
      </div>
      <dl className="steps">
        <div data-reveal><dt>Open</dt><dd>Choose the folder that holds your course. Coursecraft reads it where it is and never copies it.</dd></div>
        <div data-reveal style={delay(1)}><dt>Group</dt><dd>Chapters come from folders, lessons from matching names. Nothing to import, tag or rename.</dd></div>
        <div data-reveal style={delay(2)}><dt>Resume</dt><dd>The position in every video is kept in this browser, so tomorrow starts where today stopped.</dd></div>
      </dl>
    </section>
  );
}

function Features() {
  return (
    <section className="block" aria-labelledby="features-title">
      <h2 id="features-title" className="center" data-reveal>Everything a lesson holds, in one place</h2>
      <div className="bento">
        <article className="tile tile-wide" data-reveal>
          <h3>One lesson, every file</h3>
          <p>Video, audio, captions, slides and exercises sit behind one set of tabs, so a lesson never ends up spread over six windows.</p>
          <div className="mini-tabs" data-ui aria-hidden="true">
            <span data-on="true">Recursive descent.mp4</span><span>Recursive descent.pdf</span><span>Recursive descent.py</span><span>.en.srt</span>
          </div>
        </article>
        <article className="tile tile-hi" data-reveal style={delay(1)}>
          <h3>Resumes where you stopped</h3>
          <p>Position, finished lessons and time actually watched, kept per course.</p>
          <div className="mini-resume" data-ui aria-hidden="true">
            <strong>12:40</strong><span>of 33:12</span>
            <div className="meter"><span style={{ width: "38%" }} /></div>
          </div>
        </article>
        <article className="tile" data-reveal>
          <h3>Captions match by name</h3>
          <p>srt or vtt beside the video, in any language. Suffixes like .en and .de are matched, and srt is converted as it loads.</p>
          <pre className="mini-code" aria-hidden="true"><code>{"Lesson.mp4\nLesson.en.srt  → English\nLesson.de.srt  → Deutsch"}</code></pre>
        </article>
        <article className="tile tile-ink tile-wide" data-reveal style={delay(1)}>
          <h3>HTML previews run in a sandbox</h3>
          <p>An HTML page from your course shows with scripts, links, frames and outside requests switched off. It cannot reach the app or your files.</p>
          <pre className="mini-code" aria-hidden="true"><code>{'<iframe sandbox="" src="blob:…">\n  scripts: off · forms: off · links: off'}</code></pre>
        </article>
      </div>
    </section>
  );
}

const PROMISES = ["No account to make", "No upload, ever", "No analytics or cookies", "No requests once the page has loaded", "Folders opened read-only"];

function Privacy() {
  return (
    <section className="privacy" aria-labelledby="privacy-title">
      <div className="privacy-copy" data-reveal>
        <h2 id="privacy-title">Nothing leaves the tab</h2>
        <p>
          The browser enforces this with a content security policy that leaves the page no way to make a request.{" "}
          <Link to="/privacy">Read the policy.</Link>
        </p>
      </div>
      <div className="privacy-body" data-reveal style={delay(1)}>
        <ul>
          {PROMISES.map((p) => <li key={p}><Check />{p}</li>)}
        </ul>
        <pre className="policy"><code>{`Content-Security-Policy:
  default-src 'none'; script-src 'self';
  connect-src 'none'; form-action 'none';
  frame-ancestors 'none'; …`}</code></pre>
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
  { q: "Which browsers work?", a: "Chrome and Edge reopen a course in one click. Firefox and Safari open folders too, but ask for the folder each visit. The browsers page has the details." },
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="block faq" aria-labelledby="faq-title">
      <h2 id="faq-title" data-reveal>Questions, answered plainly</h2>
      <div className="faq-list" data-reveal style={delay(1)}>
        {FAQ.map((f, i) => {
          const on = open === i;
          return (
            <div className="faq-item" key={f.q} data-open={on}>
              <h3>
                <button aria-expanded={on} aria-controls={`faq-${i}`} id={`faq-q-${i}`} onClick={() => setOpen(on ? -1 : i)}>
                  <span>{f.q}</span>
                  <span className="faq-chev" aria-hidden="true" />
                </button>
              </h3>
              <div className="faq-panel" id={`faq-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
                <div><p>{f.a}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Close(): ReactNode {
  const { choose, mode, loading } = useCourses();
  return (
    <section className="close" aria-labelledby="close-title" data-reveal>
      <h2 id="close-title">
        Pick a folder,<FolderSticker />
        <br />
        press play.<PlaySticker />
      </h2>
      <p>The first lesson waits where you left it, or at the beginning if you have not been here before.</p>
      <div className="pair">
        <button className="pill pill-ink pill-lg" disabled={loading} onClick={() => void choose()}>{mode === "files" ? "Choose course files" : "Open a course folder"}</button>
        <Link className="pill pill-white pill-lg" to="/how-it-works">Read how it works</Link>
      </div>
    </section>
  );
}

export default function Home() {
  usePageMeta("Coursecraft: open a folder, get a course");
  return (
    <main id="main">
      <Hero />
      <Opens />
      <Library />
      <HowItWorks />
      <Features />
      <Privacy />
      <Faq />
      <Close />
    </main>
  );
}
