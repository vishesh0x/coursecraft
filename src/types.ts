export const ASSET_KINDS = [
  "video",
  "subtitle",
  "pdf",
  "html",
  "text",
  "image",
  "other",
] as const;

export type AssetKind = (typeof ASSET_KINDS)[number];

export type FileSource =
  | {
      type: "handle";
      handle: FileSystemFileHandle;
    }
  | {
      type: "file";
      file: File;
    };

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

  // Transient only. Never persisted to IndexedDB.
  blobUrl?: string;
}

export interface LessonUnit {
  id: string;
  title: string;
  chapterId: string;
  files: CourseFile[];

  video: CourseFile[];
  subtitle: CourseFile[];
  pdf: CourseFile[];
  html: CourseFile[];
  text: CourseFile[];
  image: CourseFile[];
  other: CourseFile[];

  completed: boolean;
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

export interface CourseState {
  activeCourse: Course;
  activeLessonId: string | null;
  watchProgress: Record<string, VideoProgress>;
  queue: string[];
  queueIndex: number;
  autoplayNext: boolean;
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

export function emptySession(id: string): CourseSession {
  return {
    id,
    activeLessonId: null,
    activeAssetId: null,
    videos: {},
    completed: {},
    updatedAt: Date.now(),
  };
}