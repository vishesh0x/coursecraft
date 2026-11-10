import { describe, expect, it } from "vitest";
import { detectKind, groupEntries, isIgnored, preferredAsset } from "./course";
import { normalizeSession } from "./db";
import { srtToVtt } from "./subtitles";
import type { FileEntry } from "./types";

const entry = (relativePath: string): FileEntry => ({ relativePath, size: 10, lastModified: 0, source: { type: "none" } });
const group = (...paths: string[]) => groupEntries("Course", paths.map(entry));

describe("groupEntries", () => {
  it("turns folders into chapters and shared names into one lesson", () => {
    const course = group("Basics/Intro.mp4", "Basics/Intro.pdf", "Basics/Notes.md", "Parsing/Deep/Grammar.txt");
    expect(course.root.children.map((c) => c.name)).toEqual(["Basics", "Parsing"]);
    expect(course.lessons.map((l) => l.title)).toEqual(["Intro", "Notes", "Grammar"]);
    expect(course.lessons[0].files).toHaveLength(2);
  });

  it("attaches language-suffixed captions to the matching video", () => {
    const course = group("A/Lesson.mp4", "A/Lesson.en.srt", "A/Lesson.pt-BR.vtt", "A/Other.en.srt");
    const lesson = course.lessons.find((l) => l.title === "Lesson")!;
    expect(lesson.byKind.subtitle).toHaveLength(2);
    expect(course.lessons.map((l) => l.title)).toContain("Other.en");
  });

  it("sorts numerically so lesson 2 precedes lesson 10", () => {
    const course = group("A/Lesson 10.mp4", "A/Lesson 2.mp4");
    expect(course.lessons.map((l) => l.title)).toEqual(["Lesson 2", "Lesson 10"]);
  });

  it("skips partial downloads and system litter", () => {
    const course = group("A/Done.mp4", "A/Done.mp4.crdownload", "A/.DS_Store", "A/Thumbs.db", "A/._Done.mp4");
    expect(course.files.map((f) => f.name)).toEqual(["Done.mp4"]);
  });

  it("sums sizes and keeps lesson ids stable and distinct per chapter", () => {
    const course = group("A/Same.mp4", "B/Same.mp4");
    expect(course.totalBytes).toBe(20);
    expect(new Set(course.lessons.map((l) => l.id)).size).toBe(2);
  });

  it("handles an empty folder", () => {
    const course = group();
    expect(course.lessons).toEqual([]);
    expect(course.root.children).toEqual([]);
  });
});

describe("kinds", () => {
  it("detects by extension, with a few well-known extensionless names", () => {
    expect(detectKind("mp4")).toBe("video");
    expect(detectKind("mp3")).toBe("audio");
    expect(detectKind("m4a")).toBe("audio");
    expect(detectKind("py")).toBe("text");
    expect(detectKind("", "README")).toBe("text");
    expect(detectKind("exe")).toBe("other");
  });
  it("ignores junk by name", () => {
    expect(isIgnored("a.part")).toBe(true);
    expect(isIgnored("lesson.mp4")).toBe(false);
  });
  it("prefers video, then audio, then documents", () => {
    expect(preferredAsset(group("A/X.pdf", "A/X.mp3").lessons[0])?.kind).toBe("audio");
    const [lesson] = group("A/X.md", "A/X.pdf", "A/X.mp4").lessons;
    expect(preferredAsset(lesson)?.kind).toBe("video");
  });
});

describe("srtToVtt", () => {
  it("converts SubRip timings and drops cue numbers", () => {
    const vtt = srtToVtt("1\r\n00:00:01,500 --> 00:00:03,000\r\nHello\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\nWorld");
    expect(vtt.startsWith("WEBVTT\n\n")).toBe(true);
    expect(vtt).toContain("00:00:01.500 --> 00:00:03.000\nHello");
    expect(vtt).not.toMatch(/^1$/m);
  });
  it("passes WebVTT through and drops empty cues", () => {
    expect(srtToVtt("WEBVTT\n\n00:00.000 --> 00:01.000\nHi")).toContain("00:00.000 --> 00:01.000");
    expect(srtToVtt("1\n00:00:01,000 --> 00:00:02,000\n")).toBe("WEBVTT\n\n\n");
  });
});

describe("normalizeSession", () => {
  it("rejects non-objects and clamps bad numbers", () => {
    expect(normalizeSession("x", null)).toBeUndefined();
    const s = normalizeSession("x", { videos: { a: { position: -5, duration: "9", watchedSeconds: 12 } }, completed: { l: true, m: "yes" } })!;
    expect(s.videos.a).toMatchObject({ position: 0, duration: 0, watchedSeconds: 12 });
    expect(s.completed).toEqual({ l: true });
  });
});
