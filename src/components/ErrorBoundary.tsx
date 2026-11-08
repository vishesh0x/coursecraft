import { Component, type ErrorInfo, type ReactNode } from "react";
import { DocPage } from "./DocPage";

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
      <DocPage
        title="Something interrupted the lesson"
        lede="Your course files are untouched, and your progress was saved as it went. Reload to open your library again."
      >
        <p className="doc-actions">
          <button className="pill pill-hi pill-lg" onClick={() => window.location.reload()}>Reload Coursecraft</button>
          <a className="text-link" href="/">Go to the start</a>
        </p>
      </DocPage>
    );
  }
}
