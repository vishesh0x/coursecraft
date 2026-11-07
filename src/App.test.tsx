// @vitest-environment jsdom
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { describe, expect, it } from "vitest";
import App from "./App";
import CoursePage from "./pages/Course";
import { CourseProvider } from "./state/CourseContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

function render(path: string): string {
  return renderToString(
    <ErrorBoundary>
      <StaticRouter location={path}>
        <CourseProvider>
          <App />
        </CourseProvider>
      </StaticRouter>
    </ErrorBoundary>,
  ).replace(/<!-- -->/g, "");
}

const h1 = (html: string) => html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] ?? "";
const count = (html: string, tag: string) => (html.match(new RegExp(`<${tag}[\\s>]`, "g")) ?? []).length;

describe("routes render", () => {
  it("home has one h1, the demo and every section heading", () => {
    const html = render("/");
    expect(count(html, "h1")).toBe(1);
    expect(h1(html)).toContain("Open a folder. Get a course.");
    for (const text of ["Folders become chapters", "What it opens", "One lesson, every file", "Nothing leaves the tab", "Questions", "Pick a folder"]) {
      expect(html).toContain(text);
    }
    // The live demo runs the real grouping function on the sample paths.
    expect(html).toContain("Recursive descent");
    expect(html).toMatch(/4 chapters, 9 lessons, 17 files/);
  });

  it.each([
    ["/how-it-works", "How Coursecraft reads a folder"],
    ["/browsers", "Which browsers"],
    ["/privacy", "Privacy and security"],
    ["/nope/not-here", "This page is not in the folder"],
  ])("%s renders its page", (path, title) => {
    const html = render(path);
    expect(count(html, "h1")).toBe(1);
    expect(h1(html)).toContain(title);
  });

  it("the player route explains itself when no course is open", () => {
    const html = renderToString(
      <StaticRouter location="/course">
        <CourseProvider>
          <CoursePage />
        </CourseProvider>
      </StaticRouter>,
    );
    expect(h1(html)).toContain("No course is open");
  });

  it("never renders raw html from a path into the 404", () => {
    const html = render("/%3Cimg%20src=x%20onerror=alert(1)%3E");
    expect(html).not.toContain("<img src=x");
  });
});
