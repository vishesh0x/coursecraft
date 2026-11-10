import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { readCourseFile } from "../lib/course";
import { errorMessage } from "../lib/format";
import type { CourseFile } from "../lib/types";

/** Phones render PDFs inconsistently in the browser's own viewer (first page only, or a download). Drawing the pages here looks the same everywhere. */
const MAX_PDF_BYTES = 150 * 1024 * 1024;
const MAX_CANVAS_PIXELS = 16_000_000;
const ZOOMS = [1, 1.25, 1.5, 2, 3];

type State =
  | { status: "loading" }
  | { status: "ready"; doc: PDFDocumentProxy }
  | { status: "error"; message: string };

function PdfPage({ doc, index, width, onSeen }: { doc: PDFDocumentProxy; index: number; width: number; onSeen: (i: number) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.414);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const root = el.closest(".pdf-scroll");
    const loose = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { root, rootMargin: "900px 0px" });
    const current = new IntersectionObserver(([e]) => { if (e.isIntersecting) onSeen(index); }, { root, threshold: 0.5 });
    loose.observe(el);
    current.observe(el);
    return () => { loose.disconnect(); current.disconnect(); };
  }, [index, onSeen]);

  useEffect(() => {
    const c = canvas.current;
    if (!near) { if (c) { c.width = 0; c.height = 0; } return; } // pages far from view give their memory back
    let cancelled = false;
    let task: RenderTask | undefined;
    (async () => {
      const page = await doc.getPage(index + 1);
      if (cancelled || !c) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const cssScale = width / base.width;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      while (base.width * cssScale * dpr * base.height * cssScale * dpr > MAX_CANVAS_PIXELS && dpr > 0.5) dpr -= 0.25;
      const viewport = page.getViewport({ scale: cssScale * dpr });
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      c.style.width = `${width}px`;
      c.style.height = `${width * (base.height / base.width)}px`;
      task = page.render({ canvas: c, viewport });
      await task.promise;
      page.cleanup();
    })().catch((error: unknown) => {
      if (!(error instanceof Error && error.name === "RenderingCancelledException")) console.warn("PDF page failed", index + 1, error);
    });
    return () => { cancelled = true; task?.cancel(); };
  }, [near, width, doc, index]);

  return (
    <div ref={holder} className="pdf-page" style={{ width, height: width * ratio }}>
      <canvas ref={canvas} role="img" aria-label={`Page ${index + 1}`} />
    </div>
  );
}

export default function PdfViewer({ asset }: { asset: CourseFile }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [zoom, setZoom] = useState(0);
  const [page, setPage] = useState(0);
  const [available, setAvailable] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const onSeen = useCallback((i: number) => setPage(i), []);

  useEffect(() => {
    let disposed = false;
    let task: PDFDocumentLoadingTask | undefined;
    setState({ status: "loading" });
    (async () => {
      const file = await readCourseFile(asset);
      if (file.size > MAX_PDF_BYTES) throw new Error("This PDF is over 150 MB, which is too large to show here.");
      const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const data = new Uint8Array(await file.arrayBuffer());
      task = pdfjs.getDocument({ data, useSystemFonts: true, disableAutoFetch: true });
      const doc = await task.promise;
      if (disposed) return;
      setState({ status: "ready", doc });
    })().catch((error: unknown) => {
      if (disposed) return;
      const name = error instanceof Error ? error.name : "";
      setState({ status: "error", message: name === "PasswordException" ? "This PDF is password-protected." : errorMessage(error) });
    });
    return () => { disposed = true; void task?.destroy(); };
  }, [asset]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const read = () => setAvailable(Math.max(0, el.clientWidth - 24));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.status]);

  if (state.status === "error") {
    return (
      <div className="viewer-state" role="alert">
        <h2>This PDF could not be shown</h2>
        <p>{state.message} Use “Save file” below to open it in another app.</p>
      </div>
    );
  }

  const zoomFactor = ZOOMS[zoom] ?? 1;
  const width = Math.max(240, Math.min(1400, available) * zoomFactor);

  return (
    <div className="pdf">
      <div className="pdf-bar">
        <span aria-live="polite">{state.status === "ready" ? `Page ${page + 1} of ${state.doc.numPages}` : "Opening the PDF…"}</span>
        <span className="pdf-zoom">
          <button className="btn-outline" aria-label="Zoom out" disabled={zoom === 0} onClick={() => setZoom((z) => Math.max(0, z - 1))}>−</button>
          <button className="btn-outline" aria-label="Zoom in" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}>+</button>
        </span>
      </div>
      <div className="pdf-scroll" ref={scroller} tabIndex={0} aria-label={`${asset.name}, scrollable`}>
        {state.status === "ready" && available > 0 &&
          Array.from({ length: state.doc.numPages }, (_, i) => <PdfPage key={i} doc={state.doc} index={i} width={width} onSeen={onSeen} />)}
      </div>
    </div>
  );
}
