import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ChangeEvent, type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { scanDirectory, scanFileList } from "../lib/course";
import { storage } from "../lib/db";
import { errorMessage } from "../lib/format";
import { emptySession, type Course, type CourseRecord, type CourseSession } from "../lib/types";

interface OpenCourse { course: Course; session: CourseSession }

interface CourseApi {
  active: OpenCourse | null;
  history: CourseRecord[];
  loading: boolean;
  scanned: number;
  nativePicker: boolean;
  notice: string;
  dismissNotice: () => void;
  notify: (message: string) => void;
  choose: () => Promise<void>;
  chooseCompat: () => void;
  reopen: (record: CourseRecord) => Promise<void>;
  forget: (record: CourseRecord) => Promise<void>;
  unload: () => void;
  cancel: () => void;
}

const Context = createContext<CourseApi | null>(null);

export function useCourses(): CourseApi {
  const value = useContext(Context);
  if (!value) throw new Error("useCourses must be used inside <CourseProvider>");
  return value;
}

type Source = { type: "handle"; handle: FileSystemDirectoryHandle } | { type: "files"; files: File[] };

export function CourseProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [active, setActive] = useState<OpenCourse | null>(null);
  const [history, setHistory] = useState<CourseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [notice, setNotice] = useState("");

  const input = useRef<HTMLInputElement>(null);
  const scan = useRef<AbortController | null>(null);
  const alive = useRef(true);

  const nativePicker = typeof window.showDirectoryPicker === "function" && window.isSecureContext;

  const notify = useCallback((message: string) => setNotice(message), []);
  const dismissNotice = useCallback(() => setNotice(""), []);

  const refresh = useCallback(async () => {
    try {
      const records = await storage.history();
      if (alive.current) setHistory(records);
    } catch (error) {
      if (alive.current) notify(`Your library is unavailable: ${errorMessage(error)}`);
    }
  }, [notify]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    input.current?.setAttribute("webkitdirectory", "");
    input.current?.setAttribute("directory", "");
    return () => { alive.current = false; scan.current?.abort(); };
  }, [refresh]);

  // A notice that never goes away is noise; one that goes too fast is unreadable.
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 9000);
    return () => window.clearTimeout(id);
  }, [notice]);

  const load = useCallback(async (source: Source, known?: CourseRecord): Promise<void> => {
    scan.current?.abort();
    const controller = new AbortController();
    scan.current = controller;
    setActive(null);
    setLoading(true);
    setScanned(0);

    try {
      const course = source.type === "handle"
        ? await scanDirectory(source.handle, controller.signal, setScanned)
        : await scanFileList(source.files, controller.signal, setScanned);

      let records: CourseRecord[] = [];
      try { records = await storage.history(); }
      catch { notify("Storage is unavailable, so this course opens without saved progress."); }

      let existing = known;
      if (!existing && source.type === "handle") {
        for (const record of records) {
          controller.signal.throwIfAborted();
          if (!record.handle) continue;
          try {
            if (await source.handle.isSameEntry(record.handle)) { existing = record; break; }
          } catch { /* A stale stored handle must not block a new folder. */ }
        }
      }
      existing ??= records.find((r) => r.fingerprint === course.fingerprint);
      if (existing) course.id = existing.id;

      let session = emptySession(course.id);
      try { session = (await storage.getSession(course.id)) ?? session; }
      catch { notify("Saved progress could not be read for this course."); }

      const record: CourseRecord = {
        id: course.id, name: course.name, fingerprint: course.fingerprint, lastOpenedAt: Date.now(),
        lessonCount: course.lessons.length, fileCount: course.files.length, totalBytes: course.totalBytes,
        handle: source.type === "handle" ? source.handle : existing?.handle,
      };

      controller.signal.throwIfAborted();
      try {
        await storage.saveCourse(record);
      } catch (error) {
        // Some browsers expose the picker but cannot store a folder handle.
        try {
          const { handle: _dropped, ...metadata } = record;
          void _dropped;
          await storage.saveCourse(metadata);
          notify("This browser could not remember the folder itself. Choose it again next time; your progress is kept.");
        } catch {
          notify(`This course opened without history: ${errorMessage(error)}`);
        }
      }

      controller.signal.throwIfAborted();
      if (!alive.current) return;
      setActive({ course, session });
      void refresh();
      navigate("/course");
    } catch (error) {
      if (!controller.signal.aborted) notify(`That folder could not be opened: ${errorMessage(error)}`);
    } finally {
      if (scan.current === controller) { scan.current = null; setLoading(false); }
    }
  }, [navigate, notify, refresh]);

  const chooseCompat = useCallback(() => input.current?.click(), []);

  const choose = useCallback(async () => {
    if (!nativePicker) return chooseCompat();
    try {
      const handle = await window.showDirectoryPicker({ mode: "read", id: "coursecraft-course" });
      await load({ type: "handle", handle });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notify(`Folder selection failed: ${errorMessage(error)}`);
    }
  }, [chooseCompat, load, nativePicker, notify]);

  const reopen = useCallback(async (record: CourseRecord) => {
    if (!record.handle) {
      notify("Choose this course folder again. Matching names and sizes bring your progress back.");
      return chooseCompat();
    }
    try {
      // Must run inside the click that triggered it; browsers refuse otherwise.
      const permission = await record.handle.requestPermission({ mode: "read" });
      if (permission !== "granted") return notify("Access to the folder was not granted. You can choose it again.");
      await load({ type: "handle", handle: record.handle }, record);
    } catch (error) {
      notify(`This folder needs to be chosen again: ${errorMessage(error)}`);
    }
  }, [chooseCompat, load, notify]);

  const forget = useCallback(async (record: CourseRecord) => {
    try { await storage.removeCourse(record.id); await refresh(); }
    catch (error) { notify(`Could not remove this course: ${errorMessage(error)}`); }
  }, [notify, refresh]);

  const cancel = useCallback(() => {
    scan.current?.abort();
    scan.current = null;
    setLoading(false);
  }, []);

  const unload = useCallback(() => {
    cancel();
    setActive(null);
    void refresh();
    navigate("/");
  }, [cancel, navigate, refresh]);

  const onCompat = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length) void load({ type: "files", files });
  };

  const api = useMemo<CourseApi>(
    () => ({ active, history, loading, scanned, nativePicker, notice, dismissNotice, notify, choose, chooseCompat, reopen, forget, unload, cancel }),
    [active, history, loading, scanned, nativePicker, notice, dismissNotice, notify, choose, chooseCompat, reopen, forget, unload, cancel],
  );

  return (
    <Context.Provider value={api}>
      <input ref={input} className="visually-hidden" type="file" multiple tabIndex={-1} aria-label="Choose a course folder" onChange={onCompat} />
      {children}
    </Context.Provider>
  );
}
