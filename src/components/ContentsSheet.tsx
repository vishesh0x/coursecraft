import { Fragment, useId, useMemo, useState } from "react";
import { KIND_LABEL, groupEntries } from "../lib/course";
import { plural } from "../lib/format";
import { SAMPLE_PATHS } from "../lib/sample";
import { ASSET_KINDS, type Chapter, type LessonUnit } from "../lib/types";

const MAX_LINES = 300;

function kindsOf(lesson: LessonUnit): string {
  return ASSET_KINDS.filter((k) => lesson.byKind[k].length)
    .map((k) => (lesson.byKind[k].length > 1 ? `${KIND_LABEL[k]} ×${lesson.byKind[k].length}` : KIND_LABEL[k]))
    .join(", ");
}

function flatten(chapter: Chapter, out: Chapter[] = []): Chapter[] {
  if (chapter.lessons.length) out.push(chapter);
  chapter.children.forEach((c) => flatten(c, out));
  return out;
}

/** The page's one live thing: the app's real grouping function, run on file names you can edit. */
export function ContentsDemo() {
  const id = useId();
  const [text, setText] = useState(SAMPLE_PATHS);

  const course = useMemo(() => {
    const lines = text
      .split("\n")
      .map((l) => l.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""))
      .filter(Boolean)
      .slice(0, MAX_LINES);
    return groupEntries("Your course", lines.map((relativePath) => ({ relativePath, size: 0, lastModified: 0, source: { type: "none" as const } })));
  }, [text]);

  const chapters = flatten(course.root);
  const chapterCount = course.lessons.length ? new Set(course.lessons.map((l) => l.chapterId)).size : 0;

  return (
    <div className="demo">
      <div className="demo-input">
        <label htmlFor={id}>File names, one path per line</label>
        <textarea
          id={id}
          value={text}
          rows={14}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-describedby={`${id}-note`}
          onChange={(e) => setText(e.target.value)}
        />
        <p id={`${id}-note`}>
          Up to {MAX_LINES} lines.{" "}
          <button className="text-btn" onClick={() => setText(SAMPLE_PATHS)}>Reset to the sample</button>
        </p>
      </div>

      <div className="slip" aria-live="polite">
        <h3 className="slip-title">Contents</h3>
        {chapters.length ? (
          chapters.map((chapter) => (
            <Fragment key={chapter.id}>
              <h4 className="slip-chapter">{chapter.relativePath ? chapter.relativePath.split("/").join(" › ") : "Loose files"}</h4>
              <ul className="slip-rows">
                {chapter.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <span className="slip-name">{lesson.title}</span>
                    <span className="slip-kinds">{kindsOf(lesson)}</span>
                  </li>
                ))}
              </ul>
            </Fragment>
          ))
        ) : (
          <p className="slip-empty">Type a path such as <code>Week one/Intro.mp4</code> to see a lesson appear.</p>
        )}
        <p className="slip-total">
          {plural(chapterCount, "chapter")}, {plural(course.lessons.length, "lesson")}, {plural(course.files.length, "file")}
        </p>
      </div>
    </div>
  );
}
