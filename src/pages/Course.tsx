import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ChapterTree } from "../components/ChapterTree";
import { MediaViewer } from "../components/MediaViewer";
import { DocPage } from "../components/DocPage";
import { LogoMark } from "../components/Stickers";
import { SiteFooter, SiteHeader } from "../components/Site";
import { KIND_LABEL, preferredAsset } from "../lib/course";
import { formatBytes, formatTime, plural } from "../lib/format";
import { ASSET_KINDS, type AssetKind, type Course, type CourseSession, type PlaybackSample } from "../lib/types";
import { usePageMeta } from "../lib/usePageMeta";
import { useCourses } from "../state/CourseContext";
import { usePersistedSession } from "../state/usePersistedSession";

function Workspace({ course, initialSession }: { course: Course; initialSession: CourseSession }) {
  const { choose, unload, notify } = useCourses();
  const { session, update, flush } = usePersistedSession(initialSession, notify);

  const restored = course.lessons.find((l) => l.id === initialSession.activeLessonId) ?? course.lessons[0];
  const [lessonId, setLessonId] = useState<string | null>(restored?.id ?? null);
  const [assetId, setAssetId] = useState<string | null>(
    restored?.files.find((f) => f.id === initialSession.activeAssetId)?.id ?? (restored ? preferredAsset(restored)?.id : null) ?? null,
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AssetKind | "all">("all");
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [autoplayNow, setAutoplayNow] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const lesson = course.lessons.find((l) => l.id === lessonId) ?? null;
  const asset = lesson?.files.find((f) => f.id === assetId) ?? (lesson ? preferredAsset(lesson) : undefined);
  const index = lessonId ? course.lessons.findIndex((l) => l.id === lessonId) : -1;
  const next = course.lessons[index + 1];
  const complete = lesson ? session.completed[lesson.id] === true : false;

  usePageMeta(`${lesson?.title ?? course.name} · Coursecraft`, { noindex: true });

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNavOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return course.lessons.filter((l) => (!q || l.title.toLocaleLowerCase().includes(q)) && (filter === "all" || l.byKind[filter].length > 0));
  }, [course.lessons, query, filter]);
  const visibleIds = useMemo(() => new Set(visible.map((l) => l.id)), [visible]);

  const doneCount = course.lessons.filter((l) => session.completed[l.id]).length;
  const percent = course.lessons.length ? Math.round((doneCount / course.lessons.length) * 100) : 0;
  const watched = course.files.reduce((t, f) => t + (f.kind === "video" ? session.videos[f.id]?.watchedSeconds ?? 0 : 0), 0);

  const select = useCallback((id: string, autoplay = false) => {
    const target = course.lessons.find((l) => l.id === id);
    if (!target) return;
    const first = preferredAsset(target);
    flush();
    setLessonId(id);
    setAssetId(first?.id ?? null);
    setAutoplayNow(autoplay && first?.kind === "video");
    setNavOpen(false);
    update((p) => ({ ...p, activeLessonId: id, activeAssetId: first?.id ?? null }));
  }, [course.lessons, flush, update]);

  function onSample(sample: PlaybackSample): void {
    if (!asset || asset.kind !== "video") return;
    const id = asset.id;
    update((p) => ({
      ...p,
      activeLessonId: lesson?.id ?? null,
      activeAssetId: id,
      videos: {
        ...p.videos,
        [id]: {
          position: sample.position,
          duration: sample.duration,
          watchedSeconds: (p.videos[id]?.watchedSeconds ?? 0) + sample.watchedDelta,
          updatedAt: Date.now(),
        },
      },
    }));
  }

  function mark(value: boolean): void {
    if (!lesson) return;
    update((p) => ({ ...p, completed: { ...p.completed, [lesson.id]: value } }));
    flush();
  }

  function onEnded(): void {
    mark(true);
    // Always advance. The switch decides whether the next video starts by itself.
    if (next) select(next.id, autoplayNext);
  }

  return (
    <div className="app">
      {navOpen && <button className="scrim" aria-label="Close contents" onClick={() => setNavOpen(false)} />}

      <aside className="side" data-open={navOpen} aria-label="Course navigation">
        <div className="side-brand">
          <Link to="/" className="brand" aria-label="Coursecraft home"><LogoMark /><span>Coursecraft</span></Link>
          <button className="icon-btn mobile-only" aria-label="Close contents" onClick={() => setNavOpen(false)}>×</button>
        </div>

        <div className="side-course">
          <h2 title={course.name}>{course.name}</h2>
          <p>{plural(course.lessons.length, "lesson")}, read from your disk</p>
        </div>

        <div className="progress-block">
          <div className="progress-line"><span>Finished</span><strong>{percent}%</strong></div>
          <div className="meter" role="progressbar" aria-label="Course progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <span style={{ width: `${percent}%` }} />
          </div>
          <p>{doneCount} of {course.lessons.length} lessons</p>
        </div>

        <div className="side-filters">
          <input type="search" value={query} placeholder="Find a lesson" aria-label="Find a lesson" onChange={(e) => setQuery(e.target.value)} />
          <select value={filter} aria-label="Show only" onChange={(e) => setFilter(e.target.value as AssetKind | "all")}>
            <option value="all">All materials</option>
            {ASSET_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k][0].toUpperCase() + KIND_LABEL[k].slice(1)}</option>)}
          </select>
        </div>

        <nav className="tree" aria-label="Chapters and lessons">
          {visible.length ? (
            <ChapterTree
              chapter={course.root}
              visibleIds={visibleIds}
              activeId={lessonId}
              completed={session.completed}
              searching={Boolean(query.trim()) || filter !== "all"}
              onSelect={(id) => select(id)}
            />
          ) : (
            <div className="tree-empty">
              <p>No lesson matches.</p>
              <button className="text-btn" onClick={() => { setQuery(""); setFilter("all"); }}>Clear the search</button>
            </div>
          )}
        </nav>

        <p className="side-foot">Read-only. Nothing is uploaded.</p>
      </aside>

      <div className="stage">
        <header className="bar">
          <div className="bar-left">
            <button className="btn-outline mobile-only" onClick={() => setNavOpen(true)}>Contents</button>
            <Link to="/" onClick={flush}>Library</Link>
            <span aria-hidden="true">/</span>
            <strong title={course.name}>{course.name}</strong>
          </div>
          <div className="bar-right">
            <button className="btn-outline" onClick={() => void choose()}>Open another</button>
            <button className="btn-outline" onClick={unload}>Close course</button>
          </div>
        </header>

        <main className="canvas" id="main">
          {lesson && asset ? (
            <>
              <div className="lesson-head">
                <div>
                  <h1>{lesson.title}</h1>
                  <p className="meta">{asset.directoryPath || course.name}</p>
                </div>
                <button className="btn-outline" aria-pressed={complete} onClick={() => mark(!complete)}>
                  {complete ? "Finished" : "Mark finished"}
                </button>
              </div>

              <dl className="facts">
                <div><dt>Lesson</dt><dd>{index + 1} of {course.lessons.length}</dd></div>
                <div><dt>Time watched</dt><dd>{formatTime(watched)}</dd></div>
                <div><dt>Materials</dt><dd>{plural(course.files.length, "file")}, {formatBytes(course.totalBytes)}</dd></div>
              </dl>

              <div className="tabs" role="group" aria-label="Files in this lesson">
                {lesson.files.map((file) => (
                  <button
                    key={file.id}
                    className="tab"
                    aria-pressed={asset.id === file.id}
                    title={file.name}
                    onClick={() => {
                      flush();
                      setAssetId(file.id);
                      setAutoplayNow(false);
                      update((p) => ({ ...p, activeLessonId: lesson.id, activeAssetId: file.id }));
                    }}
                  >
                    {file.name}
                  </button>
                ))}
              </div>

              <MediaViewer
                key={asset.id}
                asset={asset}
                subtitles={lesson.byKind.subtitle}
                initialProgress={session.videos[asset.id]}
                autoplay={autoplayNow}
                onSample={onSample}
                onEnded={onEnded}
                onFlush={flush}
              />

              <div className="lesson-nav">
                <button className="btn-outline" disabled={index <= 0} onClick={() => select(course.lessons[index - 1].id)}>Previous</button>
                <button className="btn-solid" disabled={!next} onClick={() => next && select(next.id)}>Next lesson</button>
              </div>

              <section className="up-next" aria-label="Up next">
                <div>
                  <p className="meta">{next ? "Up next" : "End of the course"}</p>
                  <h2>{next?.title ?? "That was the last lesson."}</h2>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={autoplayNext} onChange={(e) => setAutoplayNext(e.target.checked)} />
                  <span className="switch-track" aria-hidden="true" />
                  <span>Play the next video automatically</span>
                </label>
              </section>
            </>
          ) : (
            <div className="viewer-state">
              <h1>Nothing to play in this folder</h1>
              <p>It is empty, or holds only unfinished downloads.</p>
              <button className="btn-solid" onClick={() => void choose()}>Choose another folder</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function CoursePage() {
  const { active, choose } = useCourses();
  usePageMeta("Course · Coursecraft", { noindex: true });

  if (!active) {
    return (
      <>
        <SiteHeader />
        <DocPage
          title="No course is open"
          lede="Coursecraft never uploads your files, so a reload lets go of the folder. Open it again and your place in every video comes back."
        >
          <p className="doc-actions">
            <button className="pill pill-hi pill-lg" onClick={() => void choose()}>Open a course folder</button>
          </p>
        </DocPage>
        <SiteFooter />
      </>
    );
  }
  return <Workspace key={active.course.id} course={active.course} initialSession={active.session} />;
}
