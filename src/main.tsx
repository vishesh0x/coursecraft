import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router";
import "@fontsource-variable/plus-jakarta-sans/index.css";
import "@fontsource-variable/inter/index.css";
import "./styles/tokens.css";
import "./styles/site.css";
import "./styles/app.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CourseProvider } from "./state/CourseContext";

// Entrance animations only apply when script is running, so content is never left hidden.
document.documentElement.classList.add("js");

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

// The hosted preview lives at an arbitrary URL, so it routes in memory. Production uses real paths.
const Router = import.meta.env.VITE_MEMORY_ROUTER ? MemoryRouter : BrowserRouter;

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <Router>
        <CourseProvider>
          <App />
        </CourseProvider>
      </Router>
    </ErrorBoundary>
  </StrictMode>,
);
