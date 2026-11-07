import { sampleCourse } from "./course";

/**
 * Sample file names for the marketing pages. The home page runs the real grouping
 * function on these, so what visitors see is what the app would do with a folder.
 */
export const SAMPLE_PATHS = [
  "Basics/What a compiler does.mp4",
  "Basics/What a compiler does.en.srt",
  "Basics/Lexing with regexes.mp4",
  "Basics/Lexing with regexes.en.srt",
  "Basics/Lexing with regexes.pdf",
  "Basics/Reading list.md",
  "Parsing/Recursive descent.mp4",
  "Parsing/Recursive descent.en.srt",
  "Parsing/Recursive descent.de.srt",
  "Parsing/Recursive descent.pdf",
  "Parsing/Recursive descent.py",
  "Parsing/Operator precedence.mp4",
  "Parsing/Exercises/parser.py",
  "Parsing/Exercises/grammar.txt",
  "Targets/Stack machines.mp4",
  "Targets/Stack machines.en.srt",
  "Targets/Instruction set.png",
].join("\n");

export const SAMPLE_COURSE = sampleCourse(SAMPLE_PATHS.split("\n"));

/** The lessons the sample learner has already finished and the one they are on. */
export const SAMPLE_DONE: Record<string, boolean> = Object.fromEntries(
  SAMPLE_COURSE.lessons.filter((l) => ["What a compiler does", "Lexing with regexes", "Reading list"].includes(l.title)).map((l) => [l.id, true]),
);
export const SAMPLE_ACTIVE = SAMPLE_COURSE.lessons.find((l) => l.title === "Recursive descent")!.id;
