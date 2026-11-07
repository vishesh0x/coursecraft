import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import "@fontsource/eb-garamond/500.css";
import "@fontsource/eb-garamond/500-italic.css";
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

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <CourseProvider>
          <App />
        </CourseProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
