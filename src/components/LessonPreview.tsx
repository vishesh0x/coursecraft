import { useEffect, useState } from "react";
import { ChapterTree } from "./ChapterTree";
import { SAMPLE_ACTIVE, SAMPLE_COURSE, SAMPLE_DONE } from "../lib/sample";

export type Pane = "video" | "slides" | "code";

export const PANES: { id: Pane; tab: string; file: string; size: string }[] = [
  { id: "video", tab: "Video", file: "Recursive descent.mp4", size: "184 MB" },
  { id: "slides", tab: "Slides", file: "Recursive descent.pdf", size: "2.1 MB" },
  { id: "code", tab: "Code", file: "Recursive descent.py", size: "3 KB" },
];

const GRAMMAR = `expr    →  term (("+" | "-") term)*
term    →  factor (("*" | "/") factor)*
factor  →  NUMBER | "(" expr ")"`;

const PARSER = `def parse_expr(tokens):
    node = parse_term(tokens)
    while tokens.peek() in ("+", "-"):
        op = tokens.next()
        node = (op, node, parse_term(tokens))
    return node`;

/** Three stacked panes. Only the active one is visible, so a change is a crossfade, not a swap. */
export function PaneStack({ pane }: { pane: Pane }) {
  return (
    <div className="panes">
      <div className="pane" data-on={pane === "video"}>
        <div className="shot">
          <p className="shot-title">Recursive descent</p>
          <pre className="code"><code>{GRAMMAR}</code></pre>
          <p className="cc">One function per rule, and each function calls the rules beneath it.</p>
        </div>
        <div className="mock-controls">
          <span>12:40</span>
          <div className="meter" aria-hidden="true"><span style={{ width: "38%" }} /></div>
          <span>33:12</span>
        </div>
      </div>

      <div className="pane" data-on={pane === "slides"}>
        <div className="page-sheet">
          <h3>Recursive descent</h3>
          <p>A grammar rule becomes a function. The function reads tokens, calls the rules inside it, and returns a tree.</p>
          <p>Left recursion loops forever, so loops replace it: a repeated suffix in the grammar is a while in the parser.</p>
          <p className="page-no">Page 3 of 18</p>
        </div>
      </div>

      <div className="pane" data-on={pane === "code"}>
        <pre className="code code-fill"><code>{PARSER}</code></pre>
      </div>
    </div>
  );
}

/** A static, inert picture of the player, built from the app's own tree component and styles. */
export function PlayerFragment({ pane }: { pane: Pane }) {
  const current = PANES.find((p) => p.id === pane)!;
  const files = ["Recursive descent.de.srt", "Recursive descent.en.srt", "Recursive descent.mp4", "Recursive descent.pdf", "Recursive descent.py"];
  const all = new Set(SAMPLE_COURSE.lessons.map((l) => l.id));

  return (
    <div className="mock" data-ui role="img" aria-label="The Coursecraft player: chapters on the left, a lesson with its files in tabs on the right">
      <div className="mock-inert" inert>
        <aside className="mock-side">
          <p className="side-title">{SAMPLE_COURSE.name}</p>
          <ChapterTree chapter={SAMPLE_COURSE.root} visibleIds={all} activeId={SAMPLE_ACTIVE} completed={SAMPLE_DONE} searching={false} onSelect={() => {}} />
        </aside>
        <div className="mock-main">
          <h3 className="mock-title">Recursive descent</h3>
          <div className="tabs">
            {files.map((f) => <span key={f} className="tab" data-active={f === current.file}>{f}</span>)}
          </div>
          <div className="viewer">
            <PaneStack pane={pane} />
            <div className="viewer-foot"><span>{current.file}</span><span>{current.size}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The hero picture: the player slowly changing files, like light moving in a room. */
export function HeroRoom() {
  const [pane, setPane] = useState<Pane>("video");

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let id: number | undefined;
    const start = () => {
      id = window.setInterval(() => setPane((p) => PANES[(PANES.findIndex((x) => x.id === p) + 1) % PANES.length].id), 6000);
    };
    const stop = () => { if (id !== undefined) window.clearInterval(id); id = undefined; };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  return (
    <div className="room">
      <PlayerFragment pane={pane} />
    </div>
  );
}
