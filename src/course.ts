import {
  ASSET_KINDS,
  type AssetKind,
  type Chapter,
  type Course,
  type CourseFile,
  type FileSource,
  type LessonUnit,
} from "./types";

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const partialFilePattern = /\.(part|partial|crdownload|tmp|download)$/i;

const extensions: Record<Exclude<AssetKind, "other">, Set<string>> = {
  video: new Set(["mp4", "mkv", "webm", "mov", "m4v", "ogv"]),
  subtitle: new Set(["srt", "vtt"]),
  pdf: new Set(["pdf"]),
  html: new Set(["html", "htm"]),
  image: new Set([
    "jpg",
    "jpeg",
    "png",
    "webp",
    "svg",
    "gif",
    "avif",
    "bmp",
  ]),
  text: new Set([
    "txt",
    "md",
    "mdx",
    "json",
    "jsonl",
    "py",
    "js",
    "jsx",
    "ts",
    "tsx",
    "css",
    "scss",
    "sass",
    "less",
    "csv",
    "xml",
    "yaml",
    "yml",
    "toml",
    "ini",
    "conf",
    "config",
    "log",
    "sh",
    "bash",
    "sql",
    "java",
    "kt",
    "kts",
    "c",
    "h",
    "cpp",
    "hpp",
    "cs",
    "go",
    "rs",
    "rb",
    "php",
    "swift",
    "r",
    "ipynb",
    "vue",
    "svelte",
  ]),
};

const mimeTypes: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mkv: "video/x-matroska",
  webm: "video/webm",
  mov: "video/quicktime",
  ogv: "video/ogg",
  vtt: "text/vtt",
  srt: "application/x-subrip",
  pdf: "application/pdf",
  html: "text/html",
  htm: "text/html",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
};

export function detectKind(extension: string, name = ""): AssetKind {
  for (const [kind, values] of Object.entries(extensions)) {
    if (values.has(extension)) return kind as AssetKind;
  }

  if (/^(readme|license|dockerfile|makefile)$/i.test(name)) return "text";
  return "other";
}

export function compareNames(a: { name: string }, b: { name: string }): number {
  return collator.compare(a.name, b.name);
}

function normalize(value: string): string {
  return value.normalize("NFC").toLowerCase();
}

function parseFile(
  file: File,
  relativePath: string,
  source: FileSource,
): CourseFile {
  const slashIndex = relativePath.lastIndexOf("/");
  const name = file.name;
  const dotIndex = name.lastIndexOf(".");
  const extension = dotIndex > 0 ? name.slice(dotIndex + 1).toLowerCase() : "";
  const baseName = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const kind = detectKind(extension, name);

  return {
    id: `file:${relativePath}`,
    name,
    relativePath,
    directoryPath:
      slashIndex === -1 ? "" : relativePath.slice(0, slashIndex),
    baseName,
    extension,
    kind,
    size: file.size,
    lastModified: file.lastModified,
    mimeType:
      mimeTypes[extension] ||
      file.type ||
      (kind === "text" ? "text/plain" : "application/octet-stream"),
    source,
  };
}

export async function readCourseFile(asset: CourseFile): Promise<File> {
  return asset.source.type === "handle"
    ? asset.source.handle.getFile()
    : asset.source.file;
}

function checkAbort(signal: AbortSignal): void {
  signal.throwIfAborted();
}

export async function scanDirectory(
  handle: FileSystemDirectoryHandle,
  signal: AbortSignal,
  onProgress: (count: number) => void,
): Promise<Course> {
  const files: CourseFile[] = [];
  const directories = new Set<string>([""]);

  async function visit(
    directory: FileSystemDirectoryHandle,
    path: string,
  ): Promise<void> {
    checkAbort(signal);
    directories.add(path);

    const entries: FileSystemHandle[] = [];

    for await (const entry of directory.values()) {
      checkAbort(signal);
      entries.push(entry);
    }

    entries.sort(compareNames);

    for (const entry of entries) {
      checkAbort(signal);
      const relativePath = path ? `${path}/${entry.name}` : entry.name;

      if (entry.kind === "directory") {
        await visit(entry as FileSystemDirectoryHandle, relativePath);
        continue;
      }

      if (partialFilePattern.test(entry.name)) continue;

      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();

      files.push(
        parseFile(file, relativePath, {
          type: "handle",
          handle: fileHandle,
        }),
      );

      if (files.length % 30 === 0) onProgress(files.length);
    }
  }

  await visit(handle, "");
  checkAbort(signal);
  onProgress(files.length);

  return buildCourse(handle.name, files, directories, signal);
}

export async function scanFileList(
  selectedFiles: File[],
  signal: AbortSignal,
  onProgress: (count: number) => void,
): Promise<Course> {
  const files: CourseFile[] = [];
  const directories = new Set<string>([""]);

  const firstPath = selectedFiles[0]?.webkitRelativePath;
  const rootName = firstPath?.split("/")[0] || "Local course";

  for (let index = 0; index < selectedFiles.length; index++) {
    checkAbort(signal);

    const file = selectedFiles[index];
    if (partialFilePattern.test(file.name)) continue;

    const fullPath = file.webkitRelativePath || file.name;
    const pathParts = fullPath.split("/");
    const relativePath =
      pathParts.length > 1 ? pathParts.slice(1).join("/") : file.name;

    files.push(parseFile(file, relativePath, { type: "file", file }));

    const parts = relativePath.split("/");
    parts.pop();

    while (parts.length) {
      directories.add(parts.join("/"));
      parts.pop();
    }

    if (index % 100 === 0) {
      onProgress(files.length);
      // Yield so cancellation and rendering remain responsive.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress(files.length);
  return buildCourse(rootName, files, directories, signal);
}

async function buildCourse(
  name: string,
  files: CourseFile[],
  directories: Set<string>,
  signal: AbortSignal,
): Promise<Course> {
  checkAbort(signal);

  files.sort((a, b) => collator.compare(a.relativePath, b.relativePath));

  const chapters = new Map<string, Chapter>();

  const root: Chapter = {
    id: "chapter:",
    name,
    relativePath: "",
    lessons: [],
    children: [],
  };

  chapters.set("", root);

  function ensureChapter(path: string): Chapter {
    const existing = chapters.get(path);
    if (existing) return existing;

    const parts = path.split("/");
    const chapterName = parts.pop()!;
    const parent = ensureChapter(parts.join("/"));

    const chapter: Chapter = {
      id: `chapter:${path}`,
      name: chapterName,
      relativePath: path,
      lessons: [],
      children: [],
    };

    parent.children.push(chapter);
    chapters.set(path, chapter);
    return chapter;
  }

  for (const path of directories) ensureChapter(path);

  const filesByDirectory = new Map<string, CourseFile[]>();

  for (const file of files) {
    const siblings = filesByDirectory.get(file.directoryPath) ?? [];
    siblings.push(file);
    filesByDirectory.set(file.directoryPath, siblings);
  }

  for (const [path, siblings] of filesByDirectory) {
    const chapter = ensureChapter(path);
    const groups = new Map<string, LessonUnit>();

    const videoStems = new Set(
      siblings
        .filter((file) => file.kind === "video")
        .map((file) => normalize(file.baseName)),
    );

    for (const file of siblings) {
      let stem = file.baseName;
      let groupKey = normalize(stem);

      // Also attach common names such as "001 Intro.en.srt".
      if (file.kind === "subtitle" && !videoStems.has(groupKey)) {
        const withoutLanguage = stem.replace(
          /[._-](?:[a-z]{2,3}(?:[-_][a-z]{2})?)(?:[._-](?:sdh|forced))?$/i,
          "",
        );

        if (videoStems.has(normalize(withoutLanguage))) {
          stem = withoutLanguage;
          groupKey = normalize(stem);
        }
      }

      let lesson = groups.get(groupKey);

      if (!lesson) {
        lesson = {
          id: `lesson:${JSON.stringify([path, groupKey])}`,
          title: stem,
          chapterId: chapter.id,
          files: [],
          video: [],
          subtitle: [],
          pdf: [],
          html: [],
          text: [],
          image: [],
          other: [],
          completed: false,
        };

        groups.set(groupKey, lesson);
      }

      lesson.files.push(file);
      lesson[file.kind].push(file);

      if (file.kind === "video") lesson.title = file.baseName;
    }

    chapter.lessons = [...groups.values()].sort((a, b) =>
      collator.compare(a.title, b.title),
    );

    for (const lesson of chapter.lessons) {
      lesson.files.sort(compareNames);
      for (const kind of ASSET_KINDS) lesson[kind].sort(compareNames);
    }
  }

  const lessons: LessonUnit[] = [];

  function flatten(chapter: Chapter): void {
    chapter.children.sort(compareNames);
    lessons.push(...chapter.lessons);
    chapter.children.forEach(flatten);
  }

  flatten(root);

  const fingerprintSource = JSON.stringify([
    name,
    files.map((file) => [
      file.relativePath,
      file.size,
      file.lastModified,
    ]),
  ]);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(fingerprintSource),
  );

  checkAbort(signal);

  const fingerprint = [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return {
    id: `course:${fingerprint}`,
    name,
    fingerprint,
    root,
    files,
    lessons,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
  };
}

export function preferredAsset(lesson: LessonUnit): CourseFile | undefined {
  return (
    lesson.video[0] ??
    lesson.pdf[0] ??
    lesson.html[0] ??
    lesson.text[0] ??
    lesson.image[0] ??
    lesson.subtitle[0] ??
    lesson.other[0]
  );
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}