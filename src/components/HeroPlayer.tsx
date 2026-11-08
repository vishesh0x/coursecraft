import { useMemo, useState, type MouseEvent } from "react";
import { ChapterTree } from "./ChapterTree";
import { preferredAsset } from "../lib/course";
import { FILE_COPY, LESSON_COPY, SAMPLE_ACTIVE, SAMPLE_COURSE, SAMPLE_DONE } from "../lib/sample";
import type { CourseFile, LessonUnit } from "../lib/types";

const ALL = new Set(SAMPLE_COURSE.lessons.map((l) => l.id));
const TOTAL = SAMPLE_COURSE.lessons.length;

function srtCues(copy: string): string[] {
  return ["00:00:01,200 → 00:00:03,600", copy, "00:00:03,900 → 00:00:06,100", "Pause the video whenever you like."];
}

/** One file of a lesson, drawn the way the real viewers draw it. */
function Pane({ file, lesson }: { file: CourseFile; lesson: LessonUnit }) {
  const copy = LESSON_COPY[lesson.title] ?? LESSON_COPY["What a compiler does"];
  const isCode = lesson.title === "Recursive descent" || lesson.title === "Operator precedence";

  if (file.kind === "video") {
    return (
      <>
        <div className="shot">
          <p className="shot-title">{lesson.title}</p>
          {isCode ? (
            <pre className="code"><code>{copy.bullets.join("\n")}</code></pre>
          ) : (
            <ul className="shot-list">{copy.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
          )}
          <p className="cc">{copy.caption}</p>
        </div>
        <div className="mock-controls">
          <span>12:40</span>
          <div className="meter" aria-hidden="true"><span style={{ width: "38%" }} /></div>
          <span>33:12</span>
        </div>
      </>
    );
  }
  if (file.kind === "pdf") {
    return (
      <div className="pdf-stage">
        <div className="page-sheet">
          <h3>{lesson.title}</h3>
          {copy.page.map((p) => <p key={p}>{p}</p>)}
          <p className="page-no">Page 3 of 18</p>
        </div>
      </div>
    );
  }
  if (file.kind === "subtitle") {
    return (
      <pre className="code code-fill"><code>{srtCues(copy.caption).join("\n")}</code></pre>
    );
  }
  if (file.kind === "image") {
    return (
      <div className="image-stage">
        <svg viewBox="0 0 320 200" role="img" aria-label="A stack with PUSH 2, PUSH 3 and ADD">
          <rect x="110" y="20" width="100" height="40" rx="8" fill="#2a2a30" />
          <rect x="110" y="68" width="100" height="40" rx="8" fill="#2a2a30" />
          <rect x="110" y="116" width="100" height="40" rx="8" fill="#f5e642" />
          <text x="160" y="46" textAnchor="middle" fill="#f4f4f5" fontSize="15" fontFamily="Inter Variable, sans-serif">PUSH 2</text>
          <text x="160" y="94" textAnchor="middle" fill="#f4f4f5" fontSize="15" fontFamily="Inter Variable, sans-serif">PUSH 3</text>
          <text x="160" y="142" textAnchor="middle" fill="#18181b" fontSize="15" fontWeight="600" fontFamily="Inter Variable, sans-serif">ADD → 5</text>
        </svg>
      </div>
    );
  }
  return <pre className="code code-fill"><code>{FILE_COPY[file.name] ?? FILE_COPY[`${lesson.title}.py`] ?? "# (sample file)"}</code></pre>;
}

/** The landing page's hero: a working copy of the player's chrome, running on sample data. */
export function HeroPlayer() {
  const [lessonId, setLessonId] = useState(SAMPLE_ACTIVE);
  const [done, setDone] = useState<Record<string, boolean>>(SAMPLE_DONE);
  const lesson = SAMPLE_COURSE.lessons.find((l) => l.id === lessonId)!;
  const [fileId, setFileId] = useState(() => preferredAsset(lesson)!.id);
  const [instant, setInstant] = useState(false);

  const file = lesson.files.find((f) => f.id === fileId) ?? preferredAsset(lesson)!;
  const finished = Object.values(done).filter(Boolean).length;
  const complete = done[lesson.id] === true;
  const flat = useMemo(() => SAMPLE_COURSE.lessons, []);

  // Keyboard users get the change at once; only a pointer click gets the short crossfade.
  const mark = (e: MouseEvent) => setInstant(e.detail === 0);

  function pick(id: string) {
    const next = SAMPLE_COURSE.lessons.find((l) => l.id === id);
    if (!next) return;
    setLessonId(id);
    setFileId(preferredAsset(next)!.id);
  }

  return (
    <div className="hp" data-ui>
      <div className="hp-chrome" aria-hidden="true">
        <span /><span /><span />
        <p>{SAMPLE_COURSE.name}</p>
      </div>
      <div className="hp-body">
        <aside className="hp-side" aria-label="Sample course contents">
          <div className="hp-progress">
            <div className="progress-line"><span>Finished</span><strong>{Math.round((finished / TOTAL) * 100)}%</strong></div>
            <div className="meter" role="progressbar" aria-label="Sample course progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((finished / TOTAL) * 100)}>
              <span style={{ width: `${(finished / TOTAL) * 100}%` }} />
            </div>
          </div>
          <nav className="tree" aria-label="Sample chapters and lessons">
            <ChapterTree chapter={SAMPLE_COURSE.root} visibleIds={ALL} activeId={lessonId} completed={done} searching={false} onSelect={pick} />
          </nav>
        </aside>

        <div className="hp-main">
          <select className="hp-select" aria-label="Choose a sample lesson" value={lessonId} onChange={(e) => pick(e.target.value)}>
            {flat.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
          <div className="hp-head">
            <h2>{lesson.title}</h2>
            <button className="btn-outline" aria-pressed={complete} onClick={() => setDone((d) => ({ ...d, [lesson.id]: !complete }))}>
              {complete ? "Finished" : "Mark finished"}
            </button>
          </div>
          <div className="tabs" role="group" aria-label="Files in this lesson">
            {lesson.files.map((f) => (
              <button key={f.id} className="tab" aria-pressed={f.id === file.id} onClick={(e) => { mark(e); setFileId(f.id); }}>{f.name}</button>
            ))}
          </div>
          <div className="viewer hp-viewer" data-instant={instant}>
            <div className="hp-pane" key={`${lesson.id}:${file.id}`}>
              <Pane file={file} lesson={lesson} />
            </div>
            <div className="viewer-foot"><span>{file.name}</span><span>{file.kind === "video" ? "Resumes at 12:40" : `${Math.max(1, Math.round(file.size / 1_000_000))} MB`}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
