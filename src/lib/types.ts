export const ASSET_KINDS = ["video", "subtitle", "pdf", "html", "text", "image", "other"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export type FileSource =
  | { type: "handle"; handle: FileSystemFileHandle }
  | { type: "file"; file: File }
  /** Sample data on the marketing pages: there is nothing to read. */
  | { type: "none" };

export interface CourseFile {
  id: string;
  name: string;
  relativePath: string;
  directoryPath: string;
  baseName: string;
  extension: string;
  kind: AssetKind;
  size: number;
  lastModified: number;
  mimeType: string;
  source: FileSource;
}

export interface LessonUnit {
  id: string;
  title: string;
  chapterId: string;
  files: CourseFile[];
  byKind: Record<AssetKind, CourseFile[]>;
}

export interface Chapter {
  id: string;
  name: string;
  relativePath: string;
  lessons: LessonUnit[];
  children: Chapter[];
}

export interface Course {
  id: string;
  name: string;
  fingerprint: string;
  root: Chapter;
  lessons: LessonUnit[];
  files: CourseFile[];
  totalBytes: number;
}

export interface VideoProgress {
  position: number;
  duration: number;
  watchedSeconds: number;
  updatedAt: number;
}

export interface CourseSession {
  id: string;
  activeLessonId: string | null;
  activeAssetId: string | null;
  videos: Record<string, VideoProgress>;
  completed: Record<string, boolean>;
  updatedAt: number;
}

export interface CourseRecord {
  id: string;
  name: string;
  fingerprint: string;
  lastOpenedAt: number;
  lessonCount: number;
  fileCount: number;
  totalBytes: number;
  handle?: FileSystemDirectoryHandle;
}

export interface PlaybackSample {
  position: number;
  duration: number;
  watchedDelta: number;
}

export interface FileEntry {
  relativePath: string;
  size: number;
  lastModified: number;
  mimeHint?: string;
  source: FileSource;
}

export function emptySession(id: string): CourseSession {
  return { id, activeLessonId: null, activeAssetId: null, videos: {}, completed: {}, updatedAt: Date.now() };
}
