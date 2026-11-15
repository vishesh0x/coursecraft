// Applies a saved light/dark choice before the first paint, so the page never flashes the wrong theme.
// It is a separate file because the Content-Security-Policy allows scripts only from this site.
(function () {
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("coursecraft-theme");
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
  } catch (e) { /* storage can be blocked; the system setting is used instead */ }
  var dark = root.dataset.theme
    ? root.dataset.theme === "dark"
    : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0f0f11" : "#f3f2ef");
})();
