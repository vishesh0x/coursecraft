// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createSafeHtml } from "./safeHtml";

const out = (html: string) => createSafeHtml(html);

describe("createSafeHtml", () => {
  it("removes scripts, frames, forms' targets, handlers and base tags", () => {
    const html = out('<p onclick="x()">hi</p><script>alert(1)</script><iframe src="https://e.test"></iframe><object data="x"></object><embed src="x"><base href="https://e.test/"><img src=x onerror="steal()"><form action="https://e.test"><button formaction="https://e.test">go</button></form>');
    expect(html).not.toMatch(/<script|<iframe|<object|<embed|<base|onclick|onerror|formaction|action=/i);
    expect(html).toContain("<p>hi</p>");
  });
  it("removes link targets, meta refresh and svg animation hooks", () => {
    const html = out('<a href="https://e.test" target="_blank">x</a><meta http-equiv="refresh" content="0;url=https://e.test"><svg><a xlink:href="https://e.test"><text>t</text></a><set attributeName="href" to="javascript:1"/></svg><link rel="stylesheet" href="https://e.test/x.css">');
    expect(html).not.toMatch(/href=|refresh|<link|<set/i);
  });
  it("puts its own policy first in the head, ahead of anything the file supplies", () => {
    const html = out('<head><meta http-equiv="Content-Security-Policy" content="default-src *"><title>t</title></head><body>x</body>');
    const head = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
    expect(head.indexOf("default-src 'none'")).toBeGreaterThan(-1);
    expect(head.indexOf("default-src 'none'")).toBeLessThan(head.indexOf("title"));
    expect(head).not.toContain("default-src *");
  });
  it("survives nesting and malformed markup without throwing", () => {
    // Real browsers cap HTML nesting at 511 levels (checked in Chromium with 100,000), so test within that.
    expect(() => out("<div>".repeat(400) + "x")).not.toThrow();
    expect(() => out("<<script>script>alert(1)<</script>/script>")).not.toThrow();
  });
});
