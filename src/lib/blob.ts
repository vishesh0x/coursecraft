import type { AssetKind } from "./types";

/**
 * A blob: URL belongs to this site's origin, and a visitor can open one in a new tab ("Open image in new tab", a link's
 * context menu). A document opened that way is not covered by the page's Content-Security-Policy, so a file whose bytes
 * the course author controls must never get a MIME type a browser will run (SVG, XML, XHTML, HTML). Only inert types keep
 * their own; everything else is typed so the browser downloads it or shows it as plain text.
 */
const INERT = /^(?:video|audio)\/|^image\/(?:png|jpeg|gif|webp|avif|bmp)$|^application\/pdf$|^text\/(?:plain|vtt)$/;

export function safeBlobType(kind: AssetKind, mimeType: string): string {
  if (kind === "text") return "text/plain;charset=utf-8";
  const base = mimeType.toLowerCase().split(";")[0].trim();
  return INERT.test(base) ? base : "application/octet-stream";
}

/** An SVG shown in <img>, as a data: URL. Opened on its own it gets an opaque origin, so it cannot reach this site's storage. */
export function svgDataUrl(text: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
}
