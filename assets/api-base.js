// api-base.js — points the site's API calls at the Render backend.
//
// The site was built calling relative URLs like fetch("/api/enquiries").
// On Vercel there is no backend on the same origin, so this shim rewrites
// any relative /api/... request to the Render service. No changes to
// app.js are needed — just load this file BEFORE app.js on every page:
//
//   <script src="assets/api-base.js"></script>
//   <script src="assets/app.js" defer></script>
//
// After your first Render deploy, replace the URL below with your real
// Render URL (Dashboard → next-imaginations-api → the .onrender.com URL).

(function () {
  // Production domain talks to the branded API subdomain; the .vercel.app
  // URL (and previews) talk straight to Render.
  var API_BASE = /(^|\.)nextimaginations\.com$/.test(location.hostname)
    ? "https://api.nextimaginations.com"
    : "https://next-imaginations-api.onrender.com";

  // Local development (node server.js serving the site itself): leave
  // relative URLs alone so everything still works same-origin.
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.indexOf("/api/") === 0) {
      var full = API_BASE.replace(/\/$/, "") + url;
      input = typeof input === "string" ? full : new Request(full, input);
    }
    return origFetch(input, init);
  };
})();
