import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

/**
 * Fonts are only discovered once the stylesheet is parsed, which puts them at the end of the
 * critical request chain. Preloading the two Latin files the first paint uses starts them in
 * parallel with the CSS. Names are hashed, so the links are generated from the build output.
 */
function preloadCriticalFonts(): Plugin {
  return {
    name: "coursecraft:preload-fonts",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const files = Object.keys(ctx.bundle ?? {}).filter((f) =>
          /(?:^|\/)(?:inter|plus-jakarta-sans)-latin-wght-normal-[\w-]+\.woff2$/.test(f),
        );
        return files.map((f) => ({
          tag: "link",
          attrs: { rel: "preload", as: "font", type: "font/woff2", href: `/${f}`, crossorigin: "" },
          injectTo: "head-prepend",
        }));
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), preloadCriticalFonts()],
  build: {
    target: "es2022",
    sourcemap: false,
    // Fonts and the app are served from the same origin; nothing is inlined,
    // so the Content-Security-Policy can stay free of data: font/script sources.
    assetsInlineLimit: 0,
  },
  server: { host: "localhost" },
  preview: { host: "localhost" },
  test: { environment: "node", include: ["src/**/*.test.{ts,tsx}"] },
});
