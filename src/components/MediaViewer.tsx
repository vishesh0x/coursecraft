import { useEffect, useRef, useState, type ReactNode } from "react";
import { readCourseFile } from "../lib/course";
import { errorMessage, formatBytes, formatTime } from "../lib/format";
import { createSafeHtml } from "../lib/safeHtml";
import { srtToVtt } from "../lib/subtitles";
import type { CourseFile, PlaybackSample, VideoProgress } from "../lib/types";

const MAX_TEXT = 2 * 1024 * 1024;
const MAX_HTML = 8 * 1024 * 1024;

type Mode = "binary" | "text" | "html" | "subtitle";
interface Loaded { url: string; text?: string; truncated?: boolean }
interface Result { loaded?: Loaded; error?: string }

function useAsset(asset: CourseFile, mode: Mode): Result {
  const [result, setResult] = useState<Result>({});

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | undefined;
    setResult({});

    (async () => {
      try {
        const file = await readCourseFile(asset);
        let blob: Blob = file.slice(0, file.size, asset.mimeType);
        let text: string | undefined;
        let truncated = false;

        if (mode === "text") {
          truncated = file.size > MAX_TEXT;
          text = await file.slice(0, MAX_TEXT).text();
        } else if (mode === "subtitle") {
          if (file.size > MAX_TEXT) throw new Error("This caption file is too large to load safely.");
          blob = new Blob([srtToVtt(await file.text())], { type: "text/vtt;charset=utf-8" });
        } else if (mode === "html") {
          if (file.size > MAX_HTML) throw new Error("This page is over the 8 MB preview limit.");
          blob = new Blob([createSafeHtml(await file.text())], { type: "text/html;charset=utf-8" });
        }

        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setResult({ loaded: { url: objectUrl, text, truncated } });
      } catch (error) {
        if (!disposed) setResult({ error: errorMessage(error) });
      }
    })();

    return () => { disposed = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [asset, mode]);

  return result;
}

function CaptionTrack({ asset, first, onError }: { asset: CourseFile; first: boolean; onError: (m: string) => void }) {
  const { loaded, error } = useAsset(asset, "subtitle");
  useEffect(() => { if (error) onError(`${asset.name}: ${error}`); }, [asset.name, error, onError]);
  if (!loaded) return null;
  const lang = asset.baseName.match(/[._-]([a-z]{2,3}(?:[-_][a-z]{2})?)(?:[._-](?:sdh|forced))?$/i)?.[1];
  return (
    <track
      kind="subtitles"
      src={loaded.url}
      label={asset.baseName}
      srcLang={lang?.replace("_", "-") ?? "und"}
      default={first}
      onError={() => onError(`Could not read the captions in ${asset.name}.`)}
    />
  );
}

interface VideoProps {
  url: string;
  asset: CourseFile;
  subtitles: CourseFile[];
  initialProgress?: VideoProgress;
  autoplay: boolean;
  onSample: (s: PlaybackSample) => void;
  onEnded: () => void;
  onFlush: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function VideoPlayer({ url, asset, subtitles, initialProgress, autoplay, onSample, onEnded, onFlush }: VideoProps) {
  const video = useRef<HTMLVideoElement>(null);
  const resumeAt = useRef(initialProgress?.position ?? 0);
  const last = useRef<{ time: number; wall: number } | null>(null);
  const [speed, setSpeed] = useState(1);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);

  /** Counts only time actually played: seeking and long stalls add nothing. */
  function sample(el: HTMLVideoElement): void {
    const now = performance.now();
    const before = last.current;
    let delta = 0;
    if (before && !el.seeking) {
      const media = el.currentTime - before.time;
      const wall = (now - before.wall) / 1000;
      if (media > 0 && media <= wall * el.playbackRate + 0.35 && wall < 10) delta = media;
    }
    last.current = el.paused || el.seeking ? null : { time: el.currentTime, wall: now };
    onSample({ position: el.currentTime || 0, duration: Number.isFinite(el.duration) ? el.duration : 0, watchedDelta: delta });
  }

  async function onMetadata(el: HTMLVideoElement): Promise<void> {
    const saved = resumeAt.current;
    if (saved > 0 && Number.isFinite(el.duration)) {
      // A finished video starts over instead of resuming on its last frame.
      el.currentTime = saved >= el.duration - 1 ? 0 : Math.min(saved, el.duration - 0.25);
    }
    if (autoplay) {
      try { await el.play(); } catch { setNote("Your browser held back autoplay. Press play to continue."); }
    }
  }

  const resumeLabel = resumeAt.current > 1 ? `Resumes at ${formatTime(resumeAt.current)}` : "Plays from your disk";

  return (
    <div className="video-shell">
      <video
        ref={video}
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label={asset.name}
        onLoadedMetadata={(e) => void onMetadata(e.currentTarget)}
        onPlay={(e) => { last.current = { time: e.currentTarget.currentTime, wall: performance.now() }; }}
        onTimeUpdate={(e) => sample(e.currentTarget)}
        onSeeking={() => { last.current = null; }}
        onSeeked={(e) => sample(e.currentTarget)}
        onPause={(e) => { sample(e.currentTarget); onFlush(); }}
        onEnded={(e) => { sample(e.currentTarget); onEnded(); onFlush(); }}
        onError={() => setFailed(true)}
      >
        {subtitles.map((s, i) => <CaptionTrack key={s.id} asset={s} first={i === 0} onError={setNote} />)}
      </video>

      <div className="player-bar">
        <span>
          {resumeLabel}
          {subtitles.length > 0 && ` · ${subtitles.length} caption ${subtitles.length === 1 ? "track" : "tracks"}`}
        </span>
        <label className="speed">
          Speed
          <select
            value={speed}
            onChange={(e) => {
              const next = Number(e.target.value);
              setSpeed(next);
              if (video.current) video.current.playbackRate = next;
            }}
          >
            {SPEEDS.map((v) => <option key={v} value={v}>{v}×</option>)}
          </select>
        </label>
      </div>

      {failed && (
        <p className="notice" role="alert">
          Your browser cannot play this file or its codecs. MKV and MOV support varies; mp4 with H.264 video and AAC audio
          plays everywhere. The original file has not been touched.
        </p>
      )}
      {note && <p className="notice" role="status">{note}</p>}
    </div>
  );
}

export interface MediaViewerProps {
  asset: CourseFile;
  subtitles: CourseFile[];
  initialProgress?: VideoProgress;
  autoplay: boolean;
  onSample: (s: PlaybackSample) => void;
  onEnded: () => void;
  onFlush: () => void;
}

export function MediaViewer(props: MediaViewerProps) {
  const { asset } = props;
  const mode: Mode = asset.kind === "html" ? "html" : asset.kind === "text" || asset.kind === "subtitle" ? "text" : "binary";
  const { loaded, error } = useAsset(asset, mode);

  if (error) {
    return (
      <div className="viewer-state" role="alert">
        <h2>This file would not open</h2>
        <p>{error}</p>
        <p>If the folder was moved or access expired, unload the course and open it again.</p>
      </div>
    );
  }
  if (!loaded) return <div className="viewer-state" role="status"><p>Opening the file…</p></div>;

  let body: ReactNode;
  switch (asset.kind) {
    case "video":
      body = <VideoPlayer {...props} url={loaded.url} />;
      break;
    case "pdf":
      body = (
        <object className="frame" data={loaded.url} type="application/pdf" aria-label={asset.name}>
          <div className="viewer-state"><h2>No PDF viewer here</h2><p>Your browser cannot show PDFs inline. Use “Save file” below.</p></div>
        </object>
      );
      break;
    case "html":
      body = (
        <>
          <p className="notice">Preview with scripts, links and outside requests switched off.</p>
          <iframe className="frame frame-light" title={asset.name} src={loaded.url} sandbox="" referrerPolicy="no-referrer" />
        </>
      );
      break;
    case "text":
    case "subtitle":
      body = (
        <>
          {loaded.truncated && <p className="notice">Showing the first 2 MB of this file.</p>}
          <pre className="code" tabIndex={0}><code>{loaded.text || "(Empty file)"}</code></pre>
        </>
      );
      break;
    case "image":
      body = (
        <div className="image-stage">
          <img src={loaded.url} alt={asset.baseName} onError={(e) => { e.currentTarget.alt = `Could not decode ${asset.name}`; }} />
        </div>
      );
      break;
    default:
      body = <div className="viewer-state"><h2>No preview for this file</h2><p>It is part of the lesson, but Coursecraft cannot show this format.</p></div>;
  }

  return (
    <section className="viewer" aria-label="Lesson material">
      {body}
      <footer className="viewer-foot">
        <span title={asset.relativePath}>{asset.name}</span>
        <span>{formatBytes(asset.size)}</span>
        {asset.kind !== "html" && <a href={loaded.url} download={asset.name}>Save file</a>}
      </footer>
    </section>
  );
}
