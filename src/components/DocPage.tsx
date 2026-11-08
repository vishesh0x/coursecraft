import type { ReactNode } from "react";

/** Wide heading, content hung from column five: the same axis the landing page uses. No router hooks, so the error screen can use it. */
export function DocPage({ title, lede, children }: { title: string; lede?: string; children?: ReactNode }) {
  return (
    <main className="doc" id="main">
      <header className="doc-head">
        <h1>{title}</h1>
        {lede && <p className="doc-lede">{lede}</p>}
      </header>
      <div className="doc-body">{children}</div>
    </main>
  );
}
