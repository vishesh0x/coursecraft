import { useState, type CSSProperties } from "react";
import { KIND_LABEL, preferredAsset } from "../lib/course";
import type { Chapter, LessonUnit } from "../lib/types";

interface Props {
  chapter: Chapter;
  visibleIds: Set<string>;
  activeId: string | null;
  completed: Record<string, boolean>;
  searching: boolean;
  onSelect: (id: string) => void;
  depth?: number;
}

function allLessons(chapter: Chapter): LessonUnit[] {
  return [...chapter.lessons, ...chapter.children.flatMap(allLessons)];
}

export function ChapterTree({ chapter, visibleIds, activeId, completed, searching, onSelect, depth = 0 }: Props) {
  const [expanded, setExpanded] = useState(true);
  const everything = allLessons(chapter);
  if (!everything.some((l) => visibleIds.has(l.id))) return null;

  const open = searching || expanded;
  const done = everything.filter((l) => completed[l.id]).length;
  const shown = chapter.lessons.filter((l) => visibleIds.has(l.id));

  return (
    <div className="chapter" style={{ "--depth": depth } as CSSProperties}>
      <button className="chapter-row" aria-expanded={open} onClick={() => setExpanded((v) => !v)}>
        <span className="chapter-caret" aria-hidden="true" data-open={open} />
        <span className="chapter-name">{depth === 0 ? "Contents" : chapter.name}</span>
        <span className="chapter-count" aria-label={`${done} of ${everything.length} done`}>
          {done}/{everything.length}
        </span>
      </button>

      {open && (
        <div className="chapter-body">
          {shown.map((lesson) => {
            const isDone = completed[lesson.id] === true;
            const asset = preferredAsset(lesson);
            return (
              <button
                key={lesson.id}
                className="lesson-row"
                aria-current={activeId === lesson.id ? "true" : undefined}
                onClick={() => onSelect(lesson.id)}
                title={lesson.title}
              >
                <span className="lesson-dot" data-done={isDone} aria-hidden="true" />
                <span className="lesson-title">{lesson.title}</span>
                <span className="lesson-kind">
                  {isDone && <span className="visually-hidden">Done. </span>}
                  {lesson.files.length > 1 ? `${lesson.files.length} files` : KIND_LABEL[asset?.kind ?? "other"]}
                </span>
              </button>
            );
          })}
          {chapter.children.map((child) => (
            <ChapterTree
              key={child.id}
              chapter={child}
              visibleIds={visibleIds}
              activeId={activeId}
              completed={completed}
              searching={searching}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
