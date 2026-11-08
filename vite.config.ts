import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: false,
    // Fonts and the app are served from the same origin; nothing is inlined,
    // so the Content-Security-Policy can stay free of data: font/script sources.
    assetsInlineLimit: 0,
    // The single-file preview cannot fetch extra chunks.
    ...(mode === "artifact" ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {}),
  },
  server: { host: "localhost" },
  preview: { host: "localhost" },
  test: { environment: "node", include: ["src/**/*.test.{ts,tsx}"] },
}));
