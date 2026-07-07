// api-base.js — points the site's API calls at the backend service.
//
// The pages call relative URLs like fetch("/api/enquiries"). The static site
// has no backend on its own origin, so this shim rewrites any relative
// /api/... request to the API host and sends credentials so the httpOnly
// account-session cookie flows (www.nextimaginations.com and
// api.nextimaginations.com are the same site, so SameSite=Lax permits it).
(function () {
  var API_BASE = /(^|\.)nextimaginations\.com$/.test(location.hostname)
    ? "https://api.nextimaginations.com"
    : "https://next-imaginations-api.onrender.com";

  // Local development (node server.js serving the site itself): leave
  // relative URLs alone so everything still works same-origin.
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { window.__API_BASE = ""; return; }

  window.__API_BASE = API_BASE;

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.indexOf("/api/") === 0) {
      var full = API_BASE.replace(/\/$/, "") + url;
      init = Object.assign({}, init, { credentials: "include" });
      if (typeof input === "string") { input = full; }
      else { input = new Request(full, Object.assign({}, input, { credentials: "include" })); }
    }
    return origFetch(input, init);
  };

  // Links that navigate straight to the API (data export, invoice PDFs).
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('a[href^="/api/"]').forEach(function (a) {
      a.href = API_BASE + a.getAttribute("href");
    });
  });
})();
