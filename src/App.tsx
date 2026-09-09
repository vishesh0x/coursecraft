import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  errorMessage,
  formatBytes,
  formatTime,
  preferredAsset,
  scanDirectory,
  scanFileList,
} from "./course";
import { storage } from "./db";
import { MediaViewer } from "./media";
import {
  ASSET_KINDS,
  emptySession,
  type AssetKind,
  type Chapter,
  type Course,
  type CourseRecord,
  type CourseSession,
  type CourseState,
  type LessonUnit,
  type PlaybackSample,
} from "./types";

const KIND_LABELS: Record<AssetKind, string> = {
  video: "Video",
  subtitle: "Captions",
  pdf: "PDF",
  html: "HTML",
  text: "Text & code",
  image: "Images",
  other: "Other",
};

const KIND_ICONS: Record<AssetKind, string> = {
  video: "▶",
  subtitle: "CC",
  pdf: "▤",
  html: "◇",
  text: "</>",
  image: "▧",
  other: "⌘",
};

interface OpenCourse {
  course: Course;
  session: CourseSession;
}

function usePersistedSession(
  initial: CourseSession,
  onError: (message: string) => void,
) {
  const [session, setSession] = useState(initial);
  const sessionRef = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const mounted = useRef(true);
  const errorRef = useRef(onError);

  errorRef.current = onError;

  const flush = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    if (!dirty.current) return;

    dirty.current = false;
    const snapshot = sessionRef.current;

    void storage.saveSession(snapshot).catch((error: unknown) => {
      dirty.current = true;
      errorRef.current(
        `Progress could not be saved: ${errorMessage(error)}`,
      );
    });
  }, []);

  const update = useCallback(
    (updater: (previous: CourseSession) => CourseSession) => {
      const next = {
        ...updater(sessionRef.current),
        updatedAt: Date.now(),
      };

      sessionRef.current = next;
      dirty.current = true;

      if (mounted.current) {
        setSession(next);

        // A fixed batching window, not an indefinitely extended debounce.
        if (timer.current === null) {
          timer.current = setTimeout(flush, 1000);
        }
      } else {
        flush();
      }
    },
    [flush],
  );

  useEffect(() => {
    mounted.current = true;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  return { session, update, flush };
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        c
      </span>
      <div>
        <strong>coursecraft</strong>
        {!compact && <span>Your space to keep growing.</span>}
      </div>
    </div>
  );
}

function ChapterTree({
  chapter,
  visibleIds,
  activeId,
  completed,
  searching,
  onSelect,
  depth = 0,
}: {
  chapter: Chapter;
  visibleIds: Set<string>;
  activeId: string | null;
  completed: Record<string, boolean>;
  searching: boolean;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);

  function containsVisible(node: Chapter): boolean {
    return (
      node.lessons.some((lesson) => visibleIds.has(lesson.id)) ||
      node.children.some(containsVisible)
    );
  }

  if (!containsVisible(chapter)) return null;

  const open = searching || expanded;
  const visibleLessons = chapter.lessons.filter((lesson) =>
    visibleIds.has(lesson.id),
  );

  return (
    <div className="chapter" style={{ "--depth": depth } as React.CSSProperties}>
      <button
        className="chapter-toggle"
        aria-expanded={open}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={`chevron ${open ? "open" : ""}`} aria-hidden="true">
          ›
        </span>
        <span className="chapter-title">
          {depth === 0 ? "Course contents" : chapter.name}
        </span>
        <span className="chapter-count">{chapter.lessons.length || ""}</span>
      </button>

      {open && (
        <div className="chapter-contents">
          {visibleLessons.map((lesson) => {
            const done = completed[lesson.id] ?? lesson.completed;
            const mainAsset = preferredAsset(lesson);

            return (
              <button
                key={lesson.id}
                className={`lesson-link ${activeId === lesson.id ? "active" : ""}`}
                aria-current={activeId === lesson.id ? "true" : undefined}
                onClick={() => onSelect(lesson.id)}
                title={lesson.title}
              >
                <span className={`lesson-indicator ${done ? "done" : ""}`}>
                  {done ? "✓" : KIND_ICONS[mainAsset?.kind ?? "other"]}
                </span>
                <span className="lesson-link-title">{lesson.title}</span>
                {lesson.files.length > 1 && (
                  <small>{lesson.files.length}</small>
                )}
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

function Workspace({
  course,
  initialSession,
  onUnload,
  onOpen,
  onError,
}: {
  course: Course;
  initialSession: CourseSession;
  onUnload: () => void;
  onOpen: () => void;
  onError: (message: string) => void;
}) {
  const { session, update, flush } = usePersistedSession(
    initialSession,
    onError,
  );

  const restoredLesson =
    course.lessons.find(
      (lesson) => lesson.id === initialSession.activeLessonId,
    ) ?? course.lessons[0];

  const [activeLessonId, setActiveLessonId] = useState<string | null>(
    restoredLesson?.id ?? null,
  );

  const [activeAssetId, setActiveAssetId] = useState<string | null>(
    restoredLesson?.files.find(
      (asset) => asset.id === initialSession.activeAssetId,
    )?.id ??
      (restoredLesson ? preferredAsset(restoredLesson)?.id : null) ??
      null,
  );

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AssetKind | "all">("all");
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [autoplayCurrent, setAutoplayCurrent] = useState(false);
  const [mobileNavigation, setMobileNavigation] = useState(false);

  const lesson =
    course.lessons.find((item) => item.id === activeLessonId) ?? null;

  const asset =
    lesson?.files.find((item) => item.id === activeAssetId) ??
    (lesson ? preferredAsset(lesson) : undefined);

  const queue = useMemo(
    () => course.lessons.map((item) => item.id),
    [course.lessons],
  );

  const queueIndex = activeLessonId ? queue.indexOf(activeLessonId) : -1;

  const courseState: CourseState = {
    activeCourse: course,
    activeLessonId,
    watchProgress: session.videos,
    queue,
    queueIndex,
    autoplayNext,
  };

  const visibleLessons = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();

    return course.lessons.filter(
      (item) =>
        (!search || item.title.toLocaleLowerCase().includes(search)) &&
        (filter === "all" || item[filter].length > 0),
    );
  }, [course.lessons, query, filter]);

  const visibleIds = useMemo(
    () => new Set(visibleLessons.map((item) => item.id)),
    [visibleLessons],
  );

  const completedCount = course.lessons.filter(
    (item) => session.completed[item.id] ?? item.completed,
  ).length;

  const completionPercent = course.lessons.length
    ? Math.round((completedCount / course.lessons.length) * 100)
    : 0;

  const watchedSeconds = course.files
    .filter((file) => file.kind === "video")
    .reduce(
      (total, file) => total + (session.videos[file.id]?.watchedSeconds ?? 0),
      0,
    );

  const selectLesson = useCallback(
    (id: string, autoplay = false) => {
      const nextLesson = course.lessons.find((item) => item.id === id);
      if (!nextLesson) return;

      const nextAsset = preferredAsset(nextLesson);

      flush();
      setActiveLessonId(id);
      setActiveAssetId(nextAsset?.id ?? null);
      setAutoplayCurrent(autoplay && nextAsset?.kind === "video");
      setMobileNavigation(false);

      update((previous) => ({
        ...previous,
        activeLessonId: id,
        activeAssetId: nextAsset?.id ?? null,
      }));
    },
    [course.lessons, flush, update],
  );

  function move(offset: number): void {
    const nextId = courseState.queue[courseState.queueIndex + offset];
    if (nextId) selectLesson(nextId);
  }

  function onPlaybackSample(sample: PlaybackSample): void {
    if (!asset || asset.kind !== "video") return;

    const assetId = asset.id;

    update((previous) => ({
      ...previous,
      activeLessonId: lesson?.id ?? null,
      activeAssetId: assetId,
      videos: {
        ...previous.videos,
        [assetId]: {
          position: sample.position,
          duration: sample.duration,
          watchedSeconds:
            (previous.videos[assetId]?.watchedSeconds ?? 0) +
            sample.watchedDelta,
          updatedAt: Date.now(),
        },
      },
    }));
  }

  function markCompleted(value: boolean): void {
    if (!lesson) return;

    update((previous) => ({
      ...previous,
      completed: {
        ...previous.completed,
        [lesson.id]: value,
      },
    }));
    flush();
  }

  function onVideoEnded(): void {
    markCompleted(true);

    const nextId = queue[queueIndex + 1];

    if (nextId) {
      // Always advance chronologically. The toggle controls playback,
      // not whether the next lesson is selected.
      selectLesson(nextId, autoplayNext);
    }
  }

  function unload(): void {
    flush();
    onUnload();
  }

  const nextLesson = course.lessons[queueIndex + 1];
  const lessonComplete = lesson
    ? (session.completed[lesson.id] ?? lesson.completed)
    : false;

  return (
    <div className="workspace">
      {mobileNavigation && (
        <button
          className="sidebar-scrim"
          aria-label="Close course navigation"
          onClick={() => setMobileNavigation(false)}
        />
      )}

      <aside className={`sidebar ${mobileNavigation ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand compact />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMobileNavigation(false)}
          >
            ×
          </button>
        </div>

        <div className="course-identity">
          <span className="eyebrow">YOUR LEARNING SPACE</span>
          <h2 title={course.name}>{course.name}</h2>
          <p>{course.lessons.length} lessons · stored on your device</p>
        </div>

        <div className="sidebar-progress">
          <div>
            <span>Course progress</span>
            <strong>{completionPercent}%</strong>
          </div>
          <progress value={completedCount} max={course.lessons.length || 1} />
          <small>
            {completedCount} of {course.lessons.length} lessons completed
          </small>
        </div>

        <div className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            placeholder="Find a lesson…"
            aria-label="Search lessons"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <label className="filter-label">
          <span>SHOW</span>
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as AssetKind | "all")
            }
          >
            <option value="all">All materials</option>
            {ASSET_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <nav className="chapter-navigation" aria-label="Course chapters">
          {visibleLessons.length ? (
            <ChapterTree
              chapter={course.root}
              visibleIds={visibleIds}
              activeId={activeLessonId}
              completed={session.completed}
              searching={Boolean(query.trim()) || filter !== "all"}
              onSelect={(id) => selectLesson(id)}
            />
          ) : (
            <div className="no-results">
              <p>No matching lessons.</p>
              <button
                className="text-button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </nav>

        <div className="sidebar-bottom">
          <span className="privacy-dot" />
          Private by design. No uploads.
        </div>
      </aside>

      <div className="workspace-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-only"
              aria-label="Open course navigation"
              onClick={() => setMobileNavigation(true)}
            >
              ☰
            </button>
            <span className="breadcrumb">Library</span>
            <span className="breadcrumb-divider">/</span>
            <strong title={course.name}>{course.name}</strong>
          </div>

          <div className="topbar-actions">
            <span className="local-badge">
              <span className="privacy-dot" /> Local session
            </span>
            <button className="button ghost small" onClick={onOpen}>
              Open another
            </button>
            <button className="button ghost small" onClick={unload}>
              Unload
            </button>
          </div>
        </header>

        <main className="lesson-main">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                ONE LESSON AT A TIME
              </span>
              <h1>{lesson?.title ?? "Your course is ready"}</h1>
              <p className="lesson-location">
                {asset?.directoryPath || course.name}
              </p>
            </div>

            {lesson && (
              <button
                className={`button completion-button ${lessonComplete ? "completed" : ""}`}
                aria-pressed={lessonComplete}
                onClick={() => markCompleted(!lessonComplete)}
              >
                <span>{lessonComplete ? "✓" : "○"}</span>
                {lessonComplete ? "Completed" : "Mark complete"}
              </button>
            )}
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon violet">◈</span>
              <div>
                <span>YOUR JOURNEY</span>
                <strong>
                  {queueIndex >= 0 ? queueIndex + 1 : 0}
                  <small> / {course.lessons.length} lessons</small>
                </strong>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon mint">◷</span>
              <div>
                <span>TIME WATCHED</span>
                <strong>{formatTime(watchedSeconds)}</strong>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon amber">▤</span>
              <div>
                <span>COURSE MATERIALS</span>
                <strong>
                  {course.files.length}
                  <small> · {formatBytes(course.totalBytes)}</small>
                </strong>
              </div>
            </div>
          </div>

          {lesson && asset ? (
            <>
              <div className="asset-tabs" aria-label="Lesson assets">
                {lesson.files.map((file) => (
                  <button
                    key={file.id}
                    className={`asset-tab ${asset.id === file.id ? "selected" : ""}`}
                    aria-pressed={asset.id === file.id}
                    title={file.name}
                    onClick={() => {
                      flush();
                      setActiveAssetId(file.id);
                      setAutoplayCurrent(false);

                      update((previous) => ({
                        ...previous,
                        activeLessonId: lesson.id,
                        activeAssetId: file.id,
                      }));
                    }}
                  >
                    <span aria-hidden="true">{KIND_ICONS[file.kind]}</span>
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>

              <MediaViewer
                key={asset.id}
                asset={asset}
                subtitles={lesson.subtitle}
                initialProgress={session.videos[asset.id]}
                autoplay={autoplayCurrent}
                onSample={onPlaybackSample}
                onEnded={onVideoEnded}
                onFlush={flush}
              />

              <div className="lesson-navigation">
                <button
                  className="button ghost"
                  disabled={queueIndex <= 0}
                  onClick={() => move(-1)}
                >
                  ← Previous lesson
                </button>

                <span className="muted">
                  Lesson {queueIndex + 1} of {course.lessons.length}
                </span>

                <button
                  className="button primary"
                  disabled={!nextLesson}
                  onClick={() => move(1)}
                >
                  Next lesson →
                </button>
              </div>

              <section className="up-next-card">
                <div className="up-next-icon" aria-hidden="true">↗</div>
                <div className="up-next-copy">
                  <span className="eyebrow">
                    {nextLesson ? "UP NEXT" : "END OF COURSE"}
                  </span>
                  <h3>
                    {nextLesson?.title ?? "A little more knowledge. A lot more possibility."}
                  </h3>
                  <p>
                    {nextLesson
                      ? "The queue follows the complete directory tree, even while filtering."
                      : "Revisit any lesson, or open a new learning adventure."}
                  </p>
                </div>

                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={autoplayNext}
                    onChange={(event) => setAutoplayNext(event.target.checked)}
                  />
                  <span className="toggle-track" aria-hidden="true" />
                  <span>Autoplay next video</span>
                </label>
              </section>

              <p className="workspace-footnote">
                Opening a course or choosing a lesson never starts playback.
                Progress saves locally while you learn.
              </p>
            </>
          ) : (
            <div className="viewer-placeholder empty-course">
              <span className="empty-icon">▱</span>
              <h3>No usable files found</h3>
              <p>
                This directory may be empty or contain only incomplete downloads.
              </p>
              <button className="button primary" onClick={onOpen}>
                Choose another folder
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState<OpenCourse | null>(null);
  const [history, setHistory] = useState<CourseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [notice, setNotice] = useState("");
  const [noticeVisible, setNoticeVisible] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const nativeSupported =
    typeof window.showDirectoryPicker === "function" &&
    window.isSecureContext;

  const notify = useCallback((message: string) => {
    setNotice(message);
    setNoticeVisible(true);
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const records = await storage.history();
      if (mounted.current) setHistory(records);
    } catch (error) {
      if (mounted.current) {
        notify(`History is unavailable: ${errorMessage(error)}`);
      }
    }
  }, [notify]);

  useEffect(() => {
    mounted.current = true;
    void refreshHistory();

    const input = inputRef.current;
    input?.setAttribute("webkitdirectory", "");
    input?.setAttribute("directory", "");

    return () => {
      mounted.current = false;
      scanRef.current?.abort();
    };
  }, [refreshHistory]);

  async function loadCourse(
    source:
      | { type: "handle"; handle: FileSystemDirectoryHandle }
      | { type: "files"; files: File[] },
    knownRecord?: CourseRecord,
  ): Promise<void> {
    scanRef.current?.abort();

    const controller = new AbortController();
    scanRef.current = controller;
    setActive(null);
    setLoading(true);
    setScannedCount(0);

    try {
      const course =
        source.type === "handle"
          ? await scanDirectory(
              source.handle,
              controller.signal,
              setScannedCount,
            )
          : await scanFileList(
              source.files,
              controller.signal,
              setScannedCount,
            );

      controller.signal.throwIfAborted();

      let records: CourseRecord[] = [];

      try {
        records = await storage.history();
      } catch {
        notify("Local storage is unavailable. This course can still be viewed.");
      }

      let existing = knownRecord;

      if (!existing && source.type === "handle") {
        for (const record of records) {
          controller.signal.throwIfAborted();
          if (!record.handle) continue;

          try {
            if (await source.handle.isSameEntry(record.handle)) {
              existing = record;
              break;
            }
          } catch {
            // A stale stored handle should not block opening a new folder.
          }
        }
      }

      existing ??= records.find(
        (record) => record.fingerprint === course.fingerprint,
      );

      if (existing) course.id = existing.id;

      let session = emptySession(course.id);

      try {
        session = (await storage.getSession(course.id)) ?? session;
      } catch {
        notify("Saved progress is unavailable for this session.");
      }

      const record: CourseRecord = {
        id: course.id,
        name: course.name,
        fingerprint: course.fingerprint,
        lastOpenedAt: Date.now(),
        lessonCount: course.lessons.length,
        fileCount: course.files.length,
        totalBytes: course.totalBytes,
        handle: source.type === "handle" ? source.handle : existing?.handle,
      };

      controller.signal.throwIfAborted();

      try {
        await storage.saveCourse(record);
      } catch (error) {
        // Some implementations expose the picker but cannot clone handles.
        try {
          const { handle: _handle, ...metadataOnly } = record;
          await storage.saveCourse(metadataOnly);

          notify(
            "Course opened. This browser could not persist its folder handle; reselect the folder next time.",
          );
        } catch {
          notify(
            `Course opened without persistent history: ${errorMessage(error)}`,
          );
        }
      }

      controller.signal.throwIfAborted();
      if (!mounted.current) return;

      setActive({ course, session });
      await refreshHistory();
    } catch (error) {
      if (!controller.signal.aborted) {
        notify(`Unable to open course: ${errorMessage(error)}`);
      }
    } finally {
      if (scanRef.current === controller) {
        scanRef.current = null;
        setLoading(false);
      }
    }
  }

  async function chooseNativeFolder(): Promise<void> {
    if (!nativeSupported) {
      inputRef.current?.click();
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({
        mode: "read",
        id: "coursecraft-course",
      });

      await loadCourse({ type: "handle", handle });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notify(`Folder selection failed: ${errorMessage(error)}`);
    }
  }

  async function reopen(record: CourseRecord): Promise<void> {
    if (!record.handle) {
      notify(
        "Reselect this course folder. Matching folder metadata restores its saved progress.",
      );
      inputRef.current?.click();
      return;
    }

    try {
      // Requested inside the user's click handler, never on page load.
      const permission = await record.handle.requestPermission({
        mode: "read",
      });

      if (permission !== "granted") {
        notify("Folder permission was not granted. You can choose it again.");
        return;
      }

      await loadCourse(
        { type: "handle", handle: record.handle },
        record,
      );
    } catch (error) {
      notify(
        `This folder needs to be selected again: ${errorMessage(error)}`,
      );
    }
  }

  function onFallbackSelection(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";

    if (files.length) {
      void loadCourse({ type: "files", files });
    }
  }

  function unload(): void {
    scanRef.current?.abort();
    scanRef.current = null;
    setLoading(false);
    setActive(null);
    void refreshHistory();
  }

  async function forget(record: CourseRecord): Promise<void> {
    const confirmed = window.confirm(
      `Forget "${record.name}" and its saved progress?\n\nYour actual course files will not be touched.`,
    );

    if (!confirmed) return;

    try {
      await storage.removeCourse(record.id);
      await refreshHistory();
    } catch (error) {
      notify(`Unable to delete history: ${errorMessage(error)}`);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        multiple
        tabIndex={-1}
        aria-label="Choose a course folder"
        onChange={onFallbackSelection}
      />

      {active ? (
        <Workspace
          key={active.course.id}
          course={active.course}
          initialSession={active.session}
          onUnload={unload}
          onOpen={() => void chooseNativeFolder()}
          onError={notify}
        />
      ) : (
        <div className="home">
          <header className="home-header">
            <Brand />
            <span className="local-badge">
              <span className="privacy-dot" /> 100% local · No account
            </span>
          </header>

          <main className="home-main">
            <section className="hero">
              <div className="hero-orbit orbit-one" aria-hidden="true" />
              <div className="hero-orbit orbit-two" aria-hidden="true" />

              <span className="hero-pill">
                YOUR FILES. YOUR PACE. YOUR POTENTIAL.
              </span>

              <h1>
                Big ideas.
                <br />
                <span>One local folder.</span>
              </h1>

              <p className="hero-description">
                Turn your course collection into a calm, organized learning
                experience. Pick a folder. Find your focus. Keep moving forward.
              </p>

              {loading ? (
                <div className="scan-status" role="status" aria-live="polite">
                  <span className="spinner" />
                  <div>
                    <strong>Organizing your course…</strong>
                    <span>{scannedCount.toLocaleString()} files discovered</span>
                  </div>
                  <button className="button ghost small" onClick={unload}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    className="button primary hero-button"
                    onClick={() => void chooseNativeFolder()}
                  >
                    <span aria-hidden="true">▱</span>
                    Open a course folder
                    <span aria-hidden="true">→</span>
                  </button>

                  {nativeSupported && (
                    <button
                      className="text-button fallback-button"
                      onClick={() => inputRef.current?.click()}
                    >
                      Use compatibility folder picker
                    </button>
                  )}

                  <p className="hero-footnote">
                    Read-only access. Nothing uploaded. Nothing moved.
                  </p>
                </>
              )}

              <div className="format-pills" aria-label="Supported material types">
                {["Video + captions", "PDF documents", "HTML", "Code", "Images"].map(
                  (format) => <span key={format}>{format}</span>,
                )}
              </div>
            </section>

            <section className="home-features" aria-label="Features">
              <article>
                <span className="feature-icon violet">▦</span>
                <h3>Instantly organized</h3>
                <p>
                  Your folders become chapters. Matching files become lessons.
                  No manual setup.
                </p>
              </article>
              <article>
                <span className="feature-icon mint">◷</span>
                <h3>Pick up where you paused</h3>
                <p>
                  Resume your videos and keep track of your progress, right
                  here on your device.
                </p>
              </article>
              <article>
                <span className="feature-icon amber">◇</span>
                <h3>A quieter kind of learning</h3>
                <p>
                  No feeds, no accounts, no uploads. Just your materials and
                  space to focus.
                </p>
              </article>
            </section>

            <section className="history-section">
              <div className="history-heading">
                <div>
                  <span className="eyebrow">YOUR LIBRARY</span>
                  <h2>Continue your journey</h2>
                </div>
                <span className="muted">
                  {history.length} recent course{history.length === 1 ? "" : "s"}
                </span>
              </div>

              {history.length ? (
                <div className="history-grid">
                  {history.map((record, index) => (
                    <article className="history-card" key={record.id}>
                      <div className={`course-cover cover-${index % 3}`}>
                        <span aria-hidden="true">▱</span>
                        <small>LOCAL COURSE</small>
                      </div>

                      <div className="history-card-body">
                        <h3 title={record.name}>{record.name}</h3>
                        <p>
                          {record.lessonCount} lessons · {formatBytes(record.totalBytes)}
                        </p>
                        <span className="history-date">
                          Last opened{" "}
                          {new Date(record.lastOpenedAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>

                        <div className="history-card-actions">
                          <button
                            className="button ghost small"
                            disabled={loading}
                            onClick={() => void reopen(record)}
                          >
                            {record.handle ? "Resume course" : "Reselect folder"} →
                          </button>
                          <button
                            className="icon-button forget-button"
                            disabled={loading}
                            aria-label={`Forget ${record.name}`}
                            title="Remove history and progress, not course files"
                            onClick={() => void forget(record)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-history">
                  <span aria-hidden="true">✧</span>
                  <p>Your next learning adventure starts with a folder.</p>
                </div>
              )}
            </section>
          </main>

          <footer className="home-footer">
            <span>Made for curiosity. Built for privacy.</span>
            <span>All course content stays on your device.</span>
          </footer>
        </div>
      )}

      {noticeVisible && (
        <div className="toast" role="status" aria-live="polite">
          <span className="toast-icon" aria-hidden="true">i</span>
          <p>{notice}</p>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNoticeVisible(false)}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}