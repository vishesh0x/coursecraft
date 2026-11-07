/**
 * Prepare an HTML file from a course folder for preview.
 *
 * The real boundary is not this function. The result is shown in an iframe with
 * `sandbox=""` (no scripts, unique origin, no navigation) and carries its own
 * Content-Security-Policy. Stripping active content here is a second layer, so a
 * bug in one layer does not become a script running next to your files.
 */
export function createSafeHtml(input: string): string {
  const doc = new DOMParser().parseFromString(input, "text/html");

  doc
    .querySelectorAll("script, iframe, frame, frameset, object, embed, base, link, meta[http-equiv], noscript")
    .forEach((el) => el.remove());

  for (const el of doc.querySelectorAll("*")) {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || ["srcdoc", "ping", "action", "formaction"].includes(name)) {
        el.removeAttribute(attr.name);
      }
    }
    const tag = el.localName.toLowerCase();
    if (tag === "a" || tag === "area") {
      el.removeAttribute("href");
      el.removeAttribute("target");
    }
    if (el.namespaceURI === "http://www.w3.org/2000/svg" && ["a", "animate", "animatetransform", "set"].includes(tag)) {
      el.remove();
    }
  }

  const policy = doc.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = [
    "default-src 'none'",
    "img-src data: blob:",
    "media-src data: blob:",
    "style-src 'unsafe-inline'",
    "font-src data:",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
  doc.head.prepend(policy);

  const base = doc.createElement("style");
  base.textContent =
    ":root{color-scheme:light}body{margin:28px;font:16px/1.65 system-ui,sans-serif;overflow-wrap:anywhere}img,video{max-width:100%}pre{overflow:auto}";
  doc.head.append(base);

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}
