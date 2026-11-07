import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROUTES } from "../../worker/routes";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("deployment contract", () => {
  it("lists every React route in the worker", () => {
    const paths = [...read("src/App.tsx").matchAll(/path="([^"*]+)"/g)].map((m) => m[1]);
    for (const path of paths) expect(ROUTES).toContain(path);
    expect(ROUTES).toContain("/");
  });

  it("ships a CSP that forbids network requests and scripts from elsewhere", () => {
    const headers = read("public/_headers");
    expect(headers).toContain("connect-src 'none'");
    expect(headers).toContain("script-src 'self'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).not.toMatch(/unsafe-(inline|eval)/);
  });
});
