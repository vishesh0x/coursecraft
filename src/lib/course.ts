import {
  ASSET_KINDS,
  type AssetKind,
  type Chapter,
  type Course,
  type CourseFile,
  type FileEntry,
  type LessonUnit,
} from "./types";

export const MAX_FILES = 25_000;
const MAX_DEPTH = 32;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Unfinished downloads, and the litter operating systems leave in folders. */
const PARTIAL = /\.(part|partial|crdownload|tmp|download)$/i;
const JUNK = /^(\.ds_store|thumbs\.db|desktop\.ini|\._.*)$/i;

const EXTENSIONS: Record<Exclude<AssetKind, "other">, Set<string>> = {
  video: new Set(["mp4", "mkv", "webm", "mov", "m4v", "ogv"]),
  subtitle: new Set(["srt", "vtt"]),
  pdf: new Set(["pdf"]),
  html: new Set(["html", "htm"]),
  image: new Set(["jpg", "jpeg", "png", "webp", "svg", "gif", "avif", "bmp"]),
  text: new Set(
    ("txt md mdx json jsonl py js jsx ts tsx css scss sass less csv xml yaml yml toml ini conf config log sh bash " +
      "sql java kt kts c h cpp hpp cs go rs rb php swift r ipynb vue svelte").split(" "),
  ),
};

const MIME: Record<string, string> = {
  mp4: "video/mp4", m4v: "video/mp4", mkv: "video/x-matroska", webm: "video/webm", mov: "video/quicktime",
  ogv: "video/ogg", vtt: "text/vtt", srt: "application/x-subrip", pdf: "application/pdf", html: "text/html",
  htm: "text/html", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  svg: "image/svg+xml", gif: "image/gif", avif: "image/avif", bmp: "image/bmp",
};

export const KIND_LABEL: Record<AssetKind, string> = {
  video: "video", subtitle: "captions", pdf: "pdf", html: "page", text: "notes", image: "image", other: "file",
};

export function detectKind(extension: string, name = ""): AssetKind {
  for (const [kind, set] of Object.entries(EXTENSIONS)) if (set.has(extension)) return kind as AssetKind;
  return /^(readme|license|dockerfile|makefile)$/i.test(name) ? "text" : "other";
}

export function isIgnored(name: string): boolean {
  return PARTIAL.test(name) || JUNK.test(name);
}

const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);
const normalize = (v: string) => v.normalize("NFC").toLowerCase();

export function toCourseFile(entry: FileEntry): CourseFile {
  const { relativePath } = entry;
  const slash = relativePath.lastIndexOf("/");
  const name = slash === -1 ? relativePath : relativePath.slice(slash + 1);
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  const kind = detectKind(extension, name);
  return {
    id: `file:${relativePath}`,
    name,
    relativePath,
    directoryPath: slash === -1 ? "" : relativePath.slice(0, slash),
    baseName: dot > 0 ? name.slice(0, dot) : name,
    extension,
    kind,
    size: entry.size,
    lastModified: entry.lastModified,
    mimeType: MIME[extension] || entry.mimeHint || (kind === "text" ? "text/plain" : "application/octet-stream"),
    source: entry.source,
  };
}

export async function readCourseFile(asset: CourseFile): Promise<File> {
  switch (asset.source.type) {
    case "handle": return asset.source.handle.getFile();
    case "file": return asset.source.file;
    default: throw new Error("This is sample data; there is no file to read.");
  }
}

/** "intro.en" and "intro.en.forced" belong to the lesson "intro" when a video of that name exists. */
const LANGUAGE_SUFFIX = /[._-](?:[a-z]{2,3}(?:[-_][a-z]{2})?)(?:[._-](?:sdh|forced))?$/i;

/** Pure and synchronous: folders become chapters, files sharing a stem become one lesson. */
export function groupEntries(name: string, entries: FileEntry[]): Omit<Course, "id" | "fingerprint"> {
  const files = entries
    .filter((e) => !isIgnored(e.relativePath.split("/").pop() ?? ""))
    .map(toCourseFile)
    .sort((a, b) => collator.compare(a.relativePath, b.relativePath));

  const chapters = new Map<string, Chapter>();
  const root: Chapter = { id: "chapter:", name, relativePath: "", lessons: [], children: [] };
  chapters.set("", root);

  function ensure(path: string): Chapter {
    const existing = chapters.get(path);
    if (existing) return existing;
    const parts = path.split("/");
    const leaf = parts.pop()!;
    const parent = ensure(parts.join("/"));
    const chapter: Chapter = { id: `chapter:${path}`, name: leaf, relativePath: path, lessons: [], children: [] };
    parent.children.push(chapter);
    chapters.set(path, chapter);
    return chapter;
  }

  const byDirectory = new Map<string, CourseFile[]>();
  for (const file of files) {
    ensure(file.directoryPath);
    const list = byDirectory.get(file.directoryPath) ?? [];
    list.push(file);
    byDirectory.set(file.directoryPath, list);
  }

  const blank = (): Record<AssetKind, CourseFile[]> =>
    Object.fromEntries(ASSET_KINDS.map((k) => [k, []])) as unknown as Record<AssetKind, CourseFile[]>;

  for (const [path, siblings] of byDirectory) {
    const chapter = ensure(path);
    const groups = new Map<string, LessonUnit>();
    const videoStems = new Set(siblings.filter((f) => f.kind === "video").map((f) => normalize(f.baseName)));

    for (const file of siblings) {
      let stem = file.baseName;
      let key = normalize(stem);
      if (file.kind === "subtitle" && !videoStems.has(key)) {
        const bare = stem.replace(LANGUAGE_SUFFIX, "");
        if (videoStems.has(normalize(bare))) {
          stem = bare;
          key = normalize(bare);
        }
      }
      let lesson = groups.get(key);
      if (!lesson) {
        lesson = { id: `lesson:${JSON.stringify([path, key])}`, title: stem, chapterId: chapter.id, files: [], byKind: blank() };
        groups.set(key, lesson);
      }
      lesson.files.push(file);
      lesson.byKind[file.kind].push(file);
      if (file.kind === "video") lesson.title = file.baseName;
    }

    chapter.lessons = [...groups.values()].sort((a, b) => collator.compare(a.title, b.title));
    for (const lesson of chapter.lessons) {
      lesson.files.sort(byName);
      for (const kind of ASSET_KINDS) lesson.byKind[kind].sort(byName);
    }
  }

  const lessons: LessonUnit[] = [];
  (function flatten(chapter: Chapter): void {
    chapter.children.sort(byName);
    lessons.push(...chapter.lessons);
    chapter.children.forEach(flatten);
  })(root);

  return { name, root, files, lessons, totalBytes: files.reduce((sum, f) => sum + f.size, 0) };
}

export async function fingerprintOf(name: string, files: CourseFile[]): Promise<string> {
  const source = JSON.stringify([name, files.map((f) => [f.relativePath, f.size, f.lastModified])]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""); // taste-skill-ignore: clock and hash digits
}

async function finish(name: string, entries: FileEntry[], signal: AbortSignal): Promise<Course> {
  signal.throwIfAborted();
  const grouped = groupEntries(name, entries);
  const fingerprint = await fingerprintOf(name, grouped.files);
  signal.throwIfAborted();
  return { ...grouped, id: `course:${fingerprint}`, fingerprint };
}

export async function scanDirectory(
  root: FileSystemDirectoryHandle,
  signal: AbortSignal,
  onProgress: (count: number) => void,
): Promise<Course> {
  const entries: FileEntry[] = [];

  async function visit(directory: FileSystemDirectoryHandle, path: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH) return;
    const children: FileSystemHandle[] = [];
    for await (const child of directory.values()) {
      signal.throwIfAborted();
      children.push(child);
    }
    children.sort(byName);

    for (const child of children) {
      signal.throwIfAborted();
      const relativePath = path ? `${path}/${child.name}` : child.name;
      if (child.kind === "directory") {
        await visit(child as FileSystemDirectoryHandle, relativePath, depth + 1);
        continue;
      }
      if (isIgnored(child.name)) continue;
      if (entries.length >= MAX_FILES) throw new Error(`This folder holds more than ${MAX_FILES.toLocaleString()} files. Pick the course folder itself.`);
      const handle = child as FileSystemFileHandle;
      const file = await handle.getFile();
      entries.push({ relativePath, size: file.size, lastModified: file.lastModified, mimeHint: file.type, source: { type: "handle", handle } });
      if (entries.length % 30 === 0) onProgress(entries.length);
    }
  }

  await visit(root, "", 0);
  onProgress(entries.length);
  return finish(root.name, entries, signal);
}

export async function scanFileList(
  selected: File[],
  signal: AbortSignal,
  onProgress: (count: number) => void,
): Promise<Course> {
  if (selected.length > MAX_FILES) throw new Error(`That selection holds more than ${MAX_FILES.toLocaleString()} files. Pick the course folder itself.`);
  const entries: FileEntry[] = [];
  const rootName = selected[0]?.webkitRelativePath.split("/")[0] || "Local course";

  for (let i = 0; i < selected.length; i++) {
    signal.throwIfAborted();
    const file = selected[i];
    if (isIgnored(file.name)) continue;
    const parts = (file.webkitRelativePath || file.name).split("/");
    const relativePath = parts.length > 1 ? parts.slice(1).join("/") : file.name;
    entries.push({ relativePath, size: file.size, lastModified: file.lastModified, mimeHint: file.type, source: { type: "file", file } });
    if (i % 200 === 0) {
      onProgress(entries.length);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  onProgress(entries.length);
  return finish(rootName, entries, signal);
}

export function preferredAsset(lesson: LessonUnit): CourseFile | undefined {
  const b = lesson.byKind;
  return b.video[0] ?? b.pdf[0] ?? b.html[0] ?? b.text[0] ?? b.image[0] ?? b.subtitle[0] ?? b.other[0];
}

/** Sample data for the marketing pages, built by the same function the app uses. */
export function sampleCourse(paths: string[], name = "Compilers, from source to machine"): Omit<Course, "id" | "fingerprint"> {
  return groupEntries(
    name,
    paths.map((relativePath, i) => ({ relativePath, size: 1_000_000 * ((i % 7) + 1), lastModified: 0, source: { type: "none" as const } })),
  );
}
