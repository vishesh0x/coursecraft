import { describe, expect, it } from "vitest";
import { safeBlobType, svgDataUrl } from "./blob";

describe("safeBlobType", () => {
  it("never lets a file be typed as something a browser will run", () => {
    for (const type of ["image/svg+xml", "text/html", "text/xml", "application/xml", "application/xhtml+xml", "application/javascript", "text/javascript"]) {
      const t = safeBlobType("other", type);
      expect(t).toBe("application/octet-stream");
    }
    expect(safeBlobType("image", "image/svg+xml")).toBe("application/octet-stream");
  });
  it("types any text file as plain text, whatever its extension claims", () => {
    expect(safeBlobType("text", "text/xml")).toBe("text/plain;charset=utf-8");
    expect(safeBlobType("text", "text/html")).toBe("text/plain;charset=utf-8");
  });
  it("keeps the real type for inert media", () => {
    expect(safeBlobType("video", "video/mp4")).toBe("video/mp4");
    expect(safeBlobType("video", "video/x-matroska")).toBe("video/x-matroska");
    expect(safeBlobType("audio", "audio/mpeg")).toBe("audio/mpeg");
    expect(safeBlobType("image", "image/png")).toBe("image/png");
    expect(safeBlobType("pdf", "application/pdf")).toBe("application/pdf");
  });
  it("turns svg text into a data URL", () => {
    expect(svgDataUrl("<svg/>")).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/);
  });
});
