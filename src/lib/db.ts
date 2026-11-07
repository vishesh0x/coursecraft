import type { CourseRecord, CourseSession, VideoProgress } from "./types";

const NAME = "coursecraft";
type Store = "courses" | "sessions";
let opening: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of ["courses", "sessions"] as const) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      }
    };
    request.onblocked = () => reject(new Error("Storage is blocked by another Coursecraft tab. Close it and retry."));
    request.onerror = () => reject(request.error ?? new Error("Unable to open local storage."));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); opening = undefined; };
      resolve(db);
    };
  }).catch((error: unknown) => { opening = undefined; throw error; });
  return opening;
}

async function run<T>(store: Store, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = op(tx.objectStore(store));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? request.error ?? new Error("Local storage failed."));
    tx.onabort = () => reject(tx.error ?? new Error("Local storage was interrupted."));
  });
}

const finite = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/** Stored data is untrusted input: another tab, an old version or a corrupted profile may have written it. */
export function normalizeSession(id: string, raw: unknown): CourseSession | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const videos: Record<string, VideoProgress> = {};
  if (r.videos && typeof r.videos === "object") {
    for (const [key, v] of Object.entries(r.videos as Record<string, unknown>)) {
      if (!v || typeof v !== "object") continue;
      const p = v as Record<string, unknown>;
      videos[key] = { position: finite(p.position), duration: finite(p.duration), watchedSeconds: finite(p.watchedSeconds), updatedAt: finite(p.updatedAt) };
    }
  }
  const completed: Record<string, boolean> = {};
  if (r.completed && typeof r.completed === "object") {
    for (const [key, v] of Object.entries(r.completed as Record<string, unknown>)) if (v === true) completed[key] = true;
  }
  return {
    id,
    activeLessonId: typeof r.activeLessonId === "string" ? r.activeLessonId : null,
    activeAssetId: typeof r.activeAssetId === "string" ? r.activeAssetId : null,
    videos,
    completed,
    updatedAt: finite(r.updatedAt),
  };
}

export const storage = {
  async history(): Promise<CourseRecord[]> {
    const records = await run<CourseRecord[]>("courses", "readonly", (s) => s.getAll());
    return records.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  },
  async saveCourse(record: CourseRecord): Promise<void> {
    await run("courses", "readwrite", (s) => s.put(record));
  },
  async getSession(id: string): Promise<CourseSession | undefined> {
    return normalizeSession(id, await run<unknown>("sessions", "readonly", (s) => s.get(id)));
  },
  async saveSession(session: CourseSession): Promise<void> {
    await run("sessions", "readwrite", (s) => s.put(session));
  },
  async removeCourse(id: string): Promise<void> {
    const db = await open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["courses", "sessions"], "readwrite");
      tx.objectStore("courses").delete(id);
      tx.objectStore("sessions").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Unable to remove this course."));
      tx.onabort = () => reject(tx.error ?? new Error("Removal was interrupted."));
    });
  },
};
