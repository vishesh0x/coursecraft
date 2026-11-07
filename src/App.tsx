import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { ScrollToTop, SiteLayout, Toast } from "./components/Site";
import { BrowsersPage, HowItWorksPage, PrivacyPage } from "./pages/Docs";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// The player carries the viewers and is not needed to read the marketing pages.
const CoursePage = lazy(() => import("./pages/Course"));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/browsers" element={<BrowsersPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path="/course"
          element={
            <Suspense fallback={<p className="loading" role="status">Opening the player…</p>}>
              <CoursePage />
            </Suspense>
          }
        />
      </Routes>
      <Toast />
    </>
  );
}
