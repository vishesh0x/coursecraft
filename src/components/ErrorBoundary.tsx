import { Component, type ErrorInfo, type ReactNode } from "react";

/** Plain anchors and no router hooks on purpose: this must render even when the router itself failed. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Coursecraft crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="doc-page" id="main">
        <article className="sheet">
          <h1>Something interrupted the lesson</h1>
          <p className="doc-lede">
            Your course files are untouched, and your progress was saved as it went. Reload to open your library again.
          </p>
          <p className="doc-actions">
            <button className="btn" onClick={() => window.location.reload()}>Reload Coursecraft</button>
            <a className="text-link" href="/">Go to the start</a>
          </p>
        </article>
      </main>
    );
  }
}
