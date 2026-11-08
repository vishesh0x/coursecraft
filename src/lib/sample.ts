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

/** What the landing page's working player shows for each sample lesson. */
export interface LessonCopy {
  bullets: string[];
  caption: string;
  page: string[];
}

export const LESSON_COPY: Record<string, LessonCopy> = {
  "What a compiler does": {
    bullets: ["Lex: characters become tokens.", "Parse: tokens become a tree.", "Emit: the tree becomes instructions."],
    caption: "A compiler is a pipeline of small, boring translations.",
    page: ["A compiler turns source text into something a machine can run.", "It does it in stages, and each stage hands a simpler structure to the next."],
  },
  "Lexing with regexes": {
    bullets: ["NUMBER  [0-9]+", "NAME    [a-z_][a-z0-9_]*", "SPACE   [ \\t]+  (skipped)"],
    caption: "Each token type is a regular expression; the longest match wins.",
    page: ["A lexer reads characters and groups them into tokens.", "Regular expressions describe each token, and the longest match wins when two could apply."],
  },
  "Recursive descent": {
    bullets: ['expr → term (("+"|"-") term)*', 'term → factor (("*"|"/") factor)*', 'factor → NUMBER | "(" expr ")"'],
    caption: "One function per rule, and each function calls the rules beneath it.",
    page: ["A grammar rule becomes a function. The function reads tokens, calls the rules inside it, and returns a tree.", "Left recursion loops forever, so loops replace it: a repeated suffix in the grammar is a while in the parser."],
  },
  "Operator precedence": {
    bullets: ["1 + 2 * 3  groups as  1 + (2 * 3)", "Higher precedence binds tighter.", "Equal precedence groups left to right."],
    caption: "Precedence is just which rule calls which.",
    page: ["Multiplication binds tighter than addition, so its rule sits one level deeper.", "Each level of precedence is one more function in the parser."],
  },
  "Stack machines": {
    bullets: ["PUSH 2", "PUSH 3", "ADD      → 5"],
    caption: "Operands go on the stack; operators take them off.",
    page: ["A stack machine has no registers to name, which makes it the easiest target to emit for.", "Each operator pops its operands, computes, and pushes the result."],
  },
};

export const FILE_COPY: Record<string, string> = {
  "Reading list.md": "# Reading list\n\n- Crafting Interpreters\n- Engineering a Compiler\n- Modern Compiler Implementation",
  "parser.py": "def parse_expr(tokens):\n    node = parse_term(tokens)\n    while tokens.peek() in (\"+\", \"-\"):\n        op = tokens.next()\n        node = (op, node, parse_term(tokens))\n    return node",
  "grammar.txt": "expr   → term (('+' | '-') term)*\nterm   → factor (('*' | '/') factor)*\nfactor → NUMBER | '(' expr ')'",
  "Recursive descent.py": "def parse_expr(tokens):\n    node = parse_term(tokens)\n    while tokens.peek() in (\"+\", \"-\"):\n        op = tokens.next()\n        node = (op, node, parse_term(tokens))\n    return node",
};
