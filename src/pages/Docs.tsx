import { Link } from "react-router";
import { usePageMeta } from "../lib/usePageMeta";
import { useCourses } from "../state/CourseContext";

function Page({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <main className="doc-page" id="main">
      <article className="sheet">
        <h1>{title}</h1>
        <p className="doc-lede">{lede}</p>
        {children}
      </article>
    </main>
  );
}

export function HowItWorksPage() {
  usePageMeta("How Coursecraft reads a folder · Coursecraft");
  return (
    <Page title="How Coursecraft reads a folder" lede="No setup, no import step. The folder you already keep is the course.">
      <h2>Chapters</h2>
      <p>
        Every folder, however deep, is a chapter, and chapters keep the nesting of your folders. Names are sorted the way a
        person would sort them, so “Lesson 2” comes before “Lesson 10”.
      </p>

      <h2>Lessons</h2>
      <p>
        Files in the same folder that share a name, ignoring the extension, are one lesson. A lesson opens on its video if
        it has one, then on a PDF, an HTML page, notes, an image, or whatever else it holds. Every file stays one tab away.
      </p>
      <table>
        <caption>One lesson, called “Intro”</caption>
        <thead><tr><th scope="col">File in the folder</th><th scope="col">What it becomes</th></tr></thead>
        <tbody>
          <tr><td><code>Intro.mp4</code></td><td>The video, played in the browser</td></tr>
          <tr><td><code>Intro.en.srt</code></td><td>English captions, converted as they load</td></tr>
          <tr><td><code>Intro.pt-BR.vtt</code></td><td>Portuguese captions, ready as they are</td></tr>
          <tr><td><code>Intro.pdf</code></td><td>The slides, in the PDF viewer</td></tr>
          <tr><td><code>Intro.py</code></td><td>Exercise code, as text</td></tr>
        </tbody>
      </table>
      <p>
        A caption file whose name carries a language, such as <code>.en</code> or <code>.de.forced</code>, joins the video
        of the same name. Captions with no matching video become a lesson of their own.
      </p>

      <h2>What it leaves out</h2>
      <p>
        Unfinished downloads (<code>.part</code>, <code>.partial</code>, <code>.crdownload</code>, <code>.tmp</code>,{" "}
        <code>.download</code>) and the litter systems leave behind (<code>.DS_Store</code>, <code>Thumbs.db</code>,{" "}
        <code>desktop.ini</code>, and files starting <code>._</code>) are skipped. A folder with more than 25,000 files is
        refused, so a stray choice of your whole disk does not freeze the tab.
      </p>

      <h2>Progress</h2>
      <p>
        While a video plays, its position is written to this browser’s storage about once a second, and again when you
        pause, change lesson, or leave the tab. A lesson is finished when its video ends or when you say so. Time watched
        counts only seconds that actually played, so skipping ahead adds nothing. A video you finished starts again from the
        beginning instead of resting on its last frame.
      </p>
      <p className="doc-end"><Link to="/browsers">Which browsers work →</Link></p>
    </Page>
  );
}

export function BrowsersPage() {
  usePageMeta("Which browsers · Coursecraft");
  return (
    <Page title="Which browsers" lede="Every current desktop browser can open a course. Some can also remember the folder itself.">
      <table>
        <caption>What each browser can do with Coursecraft</caption>
        <thead>
          <tr><th scope="col">Ability</th><th scope="col">Chrome, Edge</th><th scope="col">Firefox</th><th scope="col">Safari</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">Open a course folder</th><td>Yes</td><td>Yes</td><td>Yes</td></tr>
          <tr><th scope="row">Reopen it in one click</th><td>Yes</td><td>No, choose it again</td><td>No, choose it again</td></tr>
          <tr><th scope="row">Keep your progress</th><td>Yes</td><td>Yes</td><td>Yes</td></tr>
        </tbody>
      </table>
      <p>
        Chrome and Edge give pages a folder picker that can keep a permission between visits, so Resume works in one click
        and asks you to confirm access. Elsewhere Coursecraft uses the basic folder picker. Your progress still comes back,
        because a course is recognised by its folder name, file names, sizes and dates.
      </p>
      <h2>Video formats</h2>
      <p>
        Coursecraft does not convert video. Your browser plays it, so what works is up to the browser. An mp4 file with
        H.264 video and AAC audio plays in all of them. WebM plays in current Chrome, Edge and Firefox. MKV and MOV depend on
        the container and the codecs inside, and some will not play; the player says so and leaves the file alone.
      </p>
      <h2>Phones and tablets</h2>
      <p>
        Folder choosing on touch devices varies by system, and large courses suit a laptop better. Coursecraft’s layout
        works on small screens, but a desktop browser is the supported way to open a folder.
      </p>
      <p className="doc-end"><Link to="/how-it-works">How a folder becomes a course →</Link></p>
    </Page>
  );
}

const POLICY: [string, string][] = [
  ["default-src 'none'", "Nothing is allowed unless a line below says so."],
  ["script-src 'self'", "Only Coursecraft’s own code runs. No third-party scripts, no inline scripts."],
  ["connect-src 'none'", "The page cannot make network requests: no fetch, no XMLHttpRequest, no WebSocket, no beacon."],
  ["img-src 'self' data: blob:", "Images come from the app itself or from your files, held in memory."],
  ["media-src 'self' blob:", "Videos and captions come from your files, held in memory."],
  ["object-src blob:", "Lets the browser’s PDF viewer show a PDF from your folder."],
  ["frame-src blob:", "Lets the sandboxed HTML preview show a page from your folder."],
  ["font-src 'self', style-src 'self'", "Typeface and styles are bundled with the app. Nothing loads from a font service."],
  ["form-action 'none', base-uri 'none'", "Nothing can be submitted anywhere or redirect where links point."],
  ["frame-ancestors 'none'", "No other site can embed Coursecraft in a frame."],
];

export function PrivacyPage() {
  const { choose } = useCourses();
  usePageMeta("Privacy and security · Coursecraft");
  return (
    <Page title="Privacy and security" lede="Coursecraft is built so that it cannot send your course anywhere, and the page says how you can check.">
      <h2>What it stores</h2>
      <p>
        In your browser’s own storage on this device: one record per course (its name, counts, size, when you last opened it
        and, where the browser allows, a handle to the folder) and its progress (video positions, finished lessons, time
        watched). Nothing else. There are no cookies and no account. Forget a course in your library to remove its record, or
        clear this site’s data in your browser to remove everything.
      </p>

      <h2>What it reads</h2>
      <p>
        Files are read from the folder you choose, read-only, when a lesson needs them. Their contents are held in memory to
        play or show them and are not stored by Coursecraft.
      </p>

      <h2>What it sends</h2>
      <p>
        Nothing from your folder, and no analytics. That is not only a promise: the page is served with a content security
        policy, which the browser enforces, and which leaves the page no way to make a request.
      </p>
      <table>
        <caption>The policy, line by line</caption>
        <thead><tr><th scope="col">Directive</th><th scope="col">What it means</th></tr></thead>
        <tbody>
          {POLICY.map(([d, m]) => <tr key={d}><td><code>{d}</code></td><td>{m}</td></tr>)}
        </tbody>
      </table>
      <p>
        You can read the header yourself in your browser’s developer tools, on the network tab, for the page request. The
        host is a web host like any other: it keeps ordinary request logs for loading this page, such as your IP address,
        browser and the time. Those logs do not contain anything about your folder.
      </p>

      <h2>HTML files in your course</h2>
      <p>
        An HTML page from a folder is the one thing in a course that could carry code, so it is handled in three layers.
        Scripts, frames, forms, links and inline event handlers are removed first. The result is shown in an iframe with an
        empty sandbox, which gives it no scripts, no navigation and no access to Coursecraft or its storage. And it carries
        its own policy that blocks every network request.
      </p>

      <h2>Reporting a problem</h2>
      <p>
        If you find a security issue, use the contact in <a href="/.well-known/security.txt">security.txt</a>. Please do not
        include a real course in a report.
      </p>
      <p className="doc-end"><button className="text-btn" onClick={() => void choose()}>Open a course folder →</button></p>
    </Page>
  );
}
