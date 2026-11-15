import { Link } from "react-router";
import { DocPage as Page } from "../components/DocPage";
import { usePageMeta } from "../lib/usePageMeta";
import { useCourses } from "../state/CourseContext";

export function HowItWorksPage() {
  usePageMeta("How Coursecraft reads a folder · Coursecraft");
  return (
    <Page title="How Coursecraft reads a folder" lede="No setup, no import step. The folder you already keep is the course.">
      <h2>Chapters</h2>
      <p>
        Every folder is a chapter, and chapters keep your nesting. Names sort the way a person would, so “Lesson 2” comes
        before “Lesson 10”.
      </p>

      <h2>Lessons</h2>
      <p>
        Files in one folder that share a name, ignoring the extension, are one lesson. It opens on its video if it has
        one, otherwise on audio, a PDF, an HTML page, notes or an image. Every file stays one tab away.
      </p>
      <table>
        <caption>One lesson, called “Intro”</caption>
        <thead><tr><th scope="col">File in the folder</th><th scope="col">What it becomes</th></tr></thead>
        <tbody>
          <tr><td><code>Intro.mp4</code></td><td>The video, played in the browser</td></tr>
          <tr><td><code>Intro.en.srt</code></td><td>English captions, converted as they load</td></tr>
          <tr><td><code>Intro.pt-BR.vtt</code></td><td>Portuguese captions, ready as they are</td></tr>
          <tr><td><code>Intro.mp3</code></td><td>Audio with the same resume and speed controls as video</td></tr>
          <tr><td><code>Intro.pdf</code></td><td>The slides, drawn page by page with zoom</td></tr>
          <tr><td><code>Intro.py</code></td><td>Exercise code, as text</td></tr>
        </tbody>
      </table>
      <p>
        Captions named with a language, such as <code>.en</code> or <code>.de.forced</code>, join the video of the same
        name. Captions with no video become a lesson of their own.
      </p>

      <h2>What it leaves out</h2>
      <p>
        Unfinished downloads (<code>.part</code>, <code>.partial</code>, <code>.crdownload</code>, <code>.tmp</code>,{" "}
        <code>.download</code>) and system litter (<code>.DS_Store</code>, <code>Thumbs.db</code>, <code>desktop.ini</code>,
        files starting <code>._</code>) are skipped. A folder with more than 25,000 files is refused, so choosing your
        whole disk by mistake does not freeze the tab.
      </p>

      <h2>Progress</h2>
      <p>
        While a video plays, its position is saved in this browser about once a second, and again when you pause, change
        lesson or leave the tab. A lesson is finished when its video ends or when you say so. Skipping ahead adds no
        watched time, and a finished video restarts from the beginning.
      </p>
      <p className="doc-end"><Link to="/browsers">See which browsers work</Link></p>
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
        Chrome and Edge can keep folder permission between visits, so Resume takes one click and a confirmation.
        Elsewhere Coursecraft uses the basic picker. Your progress still comes back, because a course is recognised by
        its folder name, file names, sizes and dates.
      </p>
      <h2>PDFs, audio and other files</h2>
      <p>
        PDFs are drawn by Coursecraft, not the browser’s viewer, so they look the same on a phone as on a laptop. Audio
        resumes like video. Word, PowerPoint, Excel and Keynote files cannot be previewed without sending them to a
        service, which Coursecraft never does: export them as PDF, or use Save file to open them in your own app.
      </p>
      <h2>Video formats</h2>
      <p>
        Coursecraft does not convert video; your browser plays it. An mp4 with H.264 video and AAC audio plays everywhere.
        WebM plays in current Chrome, Edge and Firefox. MKV and MOV depend on their codecs, and some will not play; the
        player says so and leaves the file alone.
      </p>
      <h2>Phones and tablets</h2>
      <table>
        <caption>Opening a course on a phone or tablet</caption>
        <thead>
          <tr><th scope="col">Device and browser</th><th scope="col">What you can open</th></tr>
        </thead>
        <tbody>
          <tr><th scope="row">Android, Chrome 132 or newer, Edge, Samsung Internet</th><td>Whole folders, with chapters. Some system folders such as Downloads cannot be chosen; pick a folder inside them.</td></tr>
          <tr><th scope="row">Android, Firefox</th><td>Individual files only</td></tr>
          <tr><th scope="row">iPhone and iPad, any browser</th><td>Individual files only. Every iOS browser uses Apple’s engine, which does not offer folder access.</td></tr>
        </tbody>
      </table>
      <p>
        Where only files can be chosen, select a lesson’s files together and Coursecraft groups them by name. A file
        selection gives one list, not chapters. You choose the files again each visit, and progress comes back when names,
        sizes and dates match.
      </p>
      <p className="doc-end"><Link to="/how-it-works">How it works</Link></p>
    </Page>
  );
}

const POLICY: [string, string][] = [
  ["default-src 'none'", "Nothing is allowed unless a line below says so."],
  ["script-src 'self'", "Only Coursecraft’s own code runs. No third-party scripts, no inline scripts."],
  ["connect-src 'none'", "The page cannot make network requests: no fetch, no XMLHttpRequest, no WebSocket, no beacon."],
  ["img-src 'self' data: blob:", "Images come from the app itself or from your files, held in memory."],
  ["media-src 'self' blob:", "Videos and captions come from your files, held in memory."],
  ["object-src 'none'", "No plug-ins or embedded objects. PDFs are drawn by Coursecraft itself rather than by a browser plug-in."],
  ["worker-src 'self'", "Lets the PDF reader run in a background worker that ships with this site, and nothing else."],
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
        In your browser’s storage on this device: one record per course (name, counts, size, last opened and, where
        allowed, a folder handle), its progress, and your light or dark choice. Nothing else, and no cookies. Forget a
        course in your library to remove its record, or clear this site’s data to remove everything.
      </p>

      <h2>What it reads</h2>
      <p>
        Files are read from your folder, read-only, when a lesson needs them. They are held in memory to play or show them,
        and never stored.
      </p>

      <h2>What it sends</h2>
      <p>
        Nothing from your folder, and no analytics. The browser enforces this: the page is served with a content security
        policy that leaves it no way to make a request.
      </p>
      <table>
        <caption>The policy, line by line</caption>
        <thead><tr><th scope="col">Directive</th><th scope="col">What it means</th></tr></thead>
        <tbody>
          {POLICY.map(([d, m]) => <tr key={d}><td><code>{d}</code></td><td>{m}</td></tr>)}
        </tbody>
      </table>
      <p>
        You can read the header in your browser’s developer tools, on the network tab. The web host keeps ordinary request
        logs for loading this page (IP address, browser, time), and nothing about your folder.
      </p>

      <h2>HTML files in your course</h2>
      <p>
        An HTML page is the one file that could carry code, so it gets three layers. Scripts, frames, forms, links and
        event handlers are removed. The result is shown in an iframe with an empty sandbox: no scripts, no navigation, no
        access to Coursecraft or its storage. And it carries its own policy that blocks every request.
      </p>

      <h2>Reporting a problem</h2>
      <p>
        If you find a security issue, use the contact in <a href="/.well-known/security.txt">security.txt</a>. Please do not
        include a real course in a report.
      </p>
      <p className="doc-end"><button className="text-btn" onClick={() => void choose()}>Open a course folder</button></p>
    </Page>
  );
}
