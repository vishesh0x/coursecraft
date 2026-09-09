import {
  useEffect,
  useRef,
  useState,
} from "react";
import { errorMessage, formatBytes, readCourseFile } from "./course";
import type {
  CourseFile,
  PlaybackSample,
  VideoProgress,
} from "./types";

const MAX_TEXT_PREVIEW = 2 * 1024 * 1024;
const MAX_HTML_PREVIEW = 8 * 1024 * 1024;

type PreviewMode = "binary" | "text" | "html" | "subtitle";

interface LoadedAsset {
  asset: CourseFile;
  url: string;
  text?: string;
  truncated?: boolean;
}

interface AssetResult {
  loaded?: LoadedAsset;
  error?: string;
}

export function srtToVtt(input: string): string {
  const normalized = input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();

  if (/^WEBVTT(?:\s|$)/.test(normalized)) {
    return `${normalized}\n`;
  }

  function normalizeTimestamp(value: string): string {
    const timestamp = value.replace(",", ".");
    return /^\d{2}:\d{2}\.\d{3}$/.test(timestamp)
      ? `00:${timestamp}`
      : timestamp;
  }

  const timestamp = String.raw`(?:\d{2,}:)?\d{2}:\d{2}[,.]\d{3}`;
  const timingLine = new RegExp(
    `^\\s*(${timestamp})\\s*-->\\s*(${timestamp})(.*)$`,
  );

  const blocks = normalized.split(/\n[ \t]*\n/);
  const cues: string[] = [];

  for (const block of blocks) {
    const lines = block.split("\n");
    const index = lines.findIndex((line) => timingLine.test(line));
    if (index === -1) continue;

    const match = lines[index].match(timingLine)!;
    const settings = match[3].trim();
    const supportedSettings = /^(?:(?:align|position|size|line|vertical):\S+\s*)+$/.test(
      settings,
    )
      ? ` ${settings}`
      : "";

    const body = lines.slice(index + 1).join("\n");
    if (!body.trim()) continue;

    cues.push(
      `${normalizeTimestamp(match[1])} --> ${normalizeTimestamp(match[2])}${supportedSettings}\n${body}`,
    );
  }

  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

function createSafeHtml(input: string): string {
  const document = new DOMParser().parseFromString(input, "text/html");

  document
    .querySelectorAll(
      "script, iframe, frame, frameset, object, embed, base, link, meta[http-equiv]",
    )
    .forEach((element) => element.remove());

  for (const element of document.querySelectorAll("*")) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();

      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        name === "ping" ||
        name === "action" ||
        name === "formaction"
      ) {
        element.removeAttribute(attribute.name);
      }
    }

    // In-frame navigation could otherwise leave the local preview.
    if (["a", "area"].includes(element.tagName.toLowerCase())) {
      element.removeAttribute("href");
      element.removeAttribute("target");
    }

    // SVG links and animation can introduce navigation or URL changes.
    if (element.namespaceURI === "http://www.w3.org/2000/svg") {
      const tag = element.localName.toLowerCase();

      if (["a", "animate", "animatetransform", "set"].includes(tag)) {
        element.remove();
      }
    }
  }

  const policy = document.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = [
    "default-src 'none'",
    "script-src 'none'",
    "connect-src 'none'",
    "img-src data: blob:",
    "media-src data: blob:",
    "style-src 'unsafe-inline'",
    "font-src data:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  document.head.prepend(policy);

  const styles = document.createElement("style");
  styles.textContent = `
    :root { color-scheme: light; }
    body {
      margin: 28px;
      font-family: system-ui, sans-serif;
      line-height: 1.65;
      overflow-wrap: anywhere;
    }
    img, video { max-width: 100%; }
    pre { overflow: auto; }
  `;
  document.head.append(styles);

  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}

function useAsset(
  asset: CourseFile,
  mode: PreviewMode,
): AssetResult {
  const [result, setResult] = useState<AssetResult>({});

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | undefined;

    setResult({});

    async function load(): Promise<void> {
      try {
        const file = await readCourseFile(asset);
        let blob: Blob = file.slice(0, file.size, asset.mimeType);
        let text: string | undefined;
        let truncated = false;

        if (mode === "text") {
          truncated = file.size > MAX_TEXT_PREVIEW;
          text = await file.slice(0, MAX_TEXT_PREVIEW).text();
        }

        if (mode === "subtitle") {
          if (file.size > MAX_TEXT_PREVIEW) {
            throw new Error("This subtitle file is too large to load safely.");
          }

          text = await file.text();
          blob = new Blob([srtToVtt(text)], {
            type: "text/vtt;charset=utf-8",
          });
        }

        if (mode === "html") {
          if (file.size > MAX_HTML_PREVIEW) {
            throw new Error(
              "This HTML file exceeds the 8 MB safe-preview limit.",
            );
          }

          text = await file.text();
          blob = new Blob([createSafeHtml(text)], {
            type: "text/html;charset=utf-8",
          });
        }

        if (disposed) return;

        objectUrl = URL.createObjectURL(blob);

        setResult({
          loaded: {
            asset: { ...asset, blobUrl: objectUrl },
            url: objectUrl,
            text,
            truncated,
          },
        });
      } catch (error) {
        if (!disposed) {
          setResult({ error: errorMessage(error) });
        }
      }
    }

    void load();

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset, mode]);

  return result;
}

function CaptionTrack({
  asset,
  first,
  onError,
}: {
  asset: CourseFile;
  first: boolean;
  onError: (message: string) => void;
}) {
  const { loaded, error } = useAsset(asset, "subtitle");

  useEffect(() => {
    if (error) onError(`${asset.name}: ${error}`);
  }, [asset.name, error, onError]);

  const languageMatch = asset.baseName.match(
    /[._-]([a-z]{2,3}(?:[-_][a-z]{2})?)(?:[._-](?:sdh|forced))?$/i,
  );

  if (!loaded) return null;

  return (
    <track
      kind="subtitles"
      src={loaded.url}
      label={asset.baseName}
      srcLang={languageMatch?.[1].replace("_", "-") ?? "und"}
      default={first}
      onError={() => onError(`Unable to decode captions: ${asset.name}`)}
    />
  );
}

interface VideoPlayerProps {
  url: string;
  asset: CourseFile;
  subtitles: CourseFile[];
  initialProgress?: VideoProgress;
  autoplay: boolean;
  onSample: (sample: PlaybackSample) => void;
  onEnded: () => void;
  onFlush: () => void;
}

function VideoPlayer({
  url,
  asset,
  subtitles,
  initialProgress,
  autoplay,
  onSample,
  onEnded,
  onFlush,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resumePosition = useRef(initialProgress?.position ?? 0);
  const previous = useRef<{ time: number; wall: number } | null>(null);

  const [speed, setSpeed] = useState(1);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);

  function sample(video: HTMLVideoElement): void {
    const now = performance.now();
    const old = previous.current;

    let watchedDelta = 0;

    if (old && !video.seeking) {
      const mediaDelta = video.currentTime - old.time;
      const wallDelta = (now - old.wall) / 1000;
      const plausibleDelta = wallDelta * video.playbackRate + 0.35;

      if (
        mediaDelta > 0 &&
        mediaDelta <= plausibleDelta &&
        wallDelta < 10
      ) {
        watchedDelta = mediaDelta;
      }
    }

    previous.current =
      video.paused || video.seeking
        ? null
        : { time: video.currentTime, wall: now };

    onSample({
      position: video.currentTime || 0,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      watchedDelta,
    });
  }

  async function onMetadata(video: HTMLVideoElement): Promise<void> {
    const duration = video.duration;
    const saved = resumePosition.current;

    if (saved > 0 && Number.isFinite(duration)) {
      // Finished videos restart instead of resuming at the final frame.
      video.currentTime =
        saved >= duration - 1 ? 0 : Math.min(saved, duration - 0.25);
    }

    if (autoplay) {
      try {
        await video.play();
      } catch {
        setNotice("Your browser paused the queue. Press play to continue.");
      }
    }
  }

  return (
    <div className="video-shell">
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        preload="metadata"
        aria-label={asset.name}
        onLoadedMetadata={(event) => {
          void onMetadata(event.currentTarget);
        }}
        onPlay={(event) => {
          previous.current = {
            time: event.currentTarget.currentTime,
            wall: performance.now(),
          };
        }}
        onTimeUpdate={(event) => sample(event.currentTarget)}
        onSeeking={() => {
          previous.current = null;
        }}
        onSeeked={(event) => {
          sample(event.currentTarget);
        }}
        onPause={(event) => {
          sample(event.currentTarget);
          onFlush();
        }}
        onEnded={(event) => {
          sample(event.currentTarget);
          onEnded();
          onFlush();
        }}
        onError={() => setFailed(true)}
      >
        {subtitles.map((subtitle, index) => (
          <CaptionTrack
            key={subtitle.id}
            asset={subtitle}
            first={index === 0}
            onError={setNotice}
          />
        ))}
      </video>

      <div className="player-toolbar">
        <span className="muted">
          Local playback
          {subtitles.length > 0 &&
            ` · ${subtitles.length} caption track${subtitles.length === 1 ? "" : "s"}`}
        </span>

        <label className="speed-control">
          Speed
          <select
            value={speed}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSpeed(next);

              if (videoRef.current) {
                videoRef.current.playbackRate = next;
              }
            }}
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
      </div>

      {failed && (
        <div className="inline-notice error" role="alert">
          This browser cannot play this file or its codecs. MKV and MOV
          support varies. The original file has not been changed.
        </div>
      )}

      {notice && (
        <div className="inline-notice" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}

interface MediaViewerProps {
  asset: CourseFile;
  subtitles: CourseFile[];
  initialProgress?: VideoProgress;
  autoplay: boolean;
  onSample: (sample: PlaybackSample) => void;
  onEnded: () => void;
  onFlush: () => void;
}

export function MediaViewer(props: MediaViewerProps) {
  const { asset } = props;

  const mode: PreviewMode =
    asset.kind === "html"
      ? "html"
      : asset.kind === "text" || asset.kind === "subtitle"
        ? "text"
        : "binary";

  const { loaded, error } = useAsset(asset, mode);

  if (error) {
    return (
      <div className="viewer-placeholder" role="alert">
        <span className="empty-icon">!</span>
        <h3>Unable to open this asset</h3>
        <p>{error}</p>
        <p className="muted">
          If the file moved or permission expired, unload and reopen the course.
        </p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="viewer-placeholder" role="status">
        <span className="spinner" />
        <p>Opening local file…</p>
      </div>
    );
  }

  let viewer: React.ReactNode;

  switch (asset.kind) {
    case "video":
      viewer = <VideoPlayer {...props} url={loaded.url} />;
      break;

    case "pdf":
      viewer = (
        <object
          className="document-frame"
          data={loaded.url}
          type="application/pdf"
          aria-label={asset.name}
        >
          <div className="viewer-placeholder">
            <h3>PDF preview is unavailable</h3>
            <p>Use the local-file link below to open it in your browser.</p>
          </div>
        </object>
      );
      break;

    case "html":
      viewer = (
        <>
          <div className="preview-warning">
            Safe HTML preview · scripts, navigation, and external resources
            are disabled.
          </div>
          <iframe
            className="document-frame html-frame"
            title={asset.name}
            src={loaded.url}
            sandbox=""
            referrerPolicy="no-referrer"
          />
        </>
      );
      break;

    case "text":
    case "subtitle":
      viewer = (
        <div className="text-viewer">
          {loaded.truncated && (
            <div className="preview-warning">
              Showing the first 2 MB. The download link contains the complete
              original file.
            </div>
          )}
          <pre tabIndex={0}>
            <code>{loaded.text || "(Empty file)"}</code>
          </pre>
        </div>
      );
      break;

    case "image":
      viewer = (
        <div className="image-viewer">
          <img
            src={loaded.url}
            alt={asset.baseName}
            onError={(event) => {
              event.currentTarget.alt = `Unable to decode ${asset.name}`;
            }}
          />
        </div>
      );
      break;

    default:
      viewer = (
        <div className="viewer-placeholder">
          <span className="empty-icon">↗</span>
          <h3>This file is available locally</h3>
          <p>No built-in preview is available for this format.</p>
        </div>
      );
  }

  return (
    <section className="media-card" aria-label="Lesson material">
      {viewer}

      <footer className="asset-footer">
        <span title={asset.relativePath}>{asset.name}</span>
        <span className="muted">{formatBytes(asset.size)}</span>

        {asset.kind === "html" ? (
          <span className="local-badge">Sandboxed preview</span>
        ) : (
          <a
            href={loaded.url}
            download={asset.name}
            className="subtle-link"
          >
            Save file ↗
          </a>
        )}
      </footer>
    </section>
  );
}