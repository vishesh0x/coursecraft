// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { resolveTheme, setTheme } from "./theme";

describe("resolveTheme", () => {
  it("lets a saved choice beat the device setting", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("follows the device when nothing is saved or the saved value is junk", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("<script>", true)).toBe("dark");
  });
});

describe("setTheme", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.clear();
    document.head.innerHTML = '<meta name="theme-color" content="#f3f2ef">';
  });
  it("applies the theme, remembers it, and updates the browser chrome colour", () => {
    setTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("coursecraft-theme")).toBe("dark");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#0f0f11");
    setTheme("light");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#f3f2ef");
  });
});
