import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Coursecraft rendering error", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-error">
          <div className="brand-mark">c</div>
          <h1>Something interrupted your learning space.</h1>
          <p>
            Your original course files are safe. Reload the application to
            reopen your library.
          </p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Reload application
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

const root = document.getElementById("root");

if (!root) throw new Error("Missing application root.");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);