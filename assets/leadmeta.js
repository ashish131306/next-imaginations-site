/* leadmeta.js — first-touch lead attribution (Next Imaginations).
   Captures UTM params, ad click-ids, referrer and landing path on the visitor's
   FIRST page view and keeps them in localStorage, so an enquiry submitted later
   still records where the lead originally came from.
   Privacy: first-party only, no third parties, no cookies. Persists only when the
   visitor hasn't chosen essential-only consent; always attachable in-session to a
   form the visitor explicitly submits (that form carries its own consent tick). */
(function () {
  "use strict";
  var KEY = "ni_leadmeta";
  function allowed() { try { return localStorage.getItem("ni_consent") !== "essential"; } catch (e) { return true; } }
  function parse() {
    var out = { utm: {}, referrer: "", landing: "", first_seen: "" };
    try {
      var q = new URLSearchParams(location.search || "");
      ["source", "medium", "campaign", "term", "content"].forEach(function (k) {
        var v = q.get("utm_" + k); if (v) out.utm[k] = String(v).slice(0, 100);
      });
      if (q.get("gclid") && !out.utm.source) { out.utm.source = "google"; out.utm.medium = out.utm.medium || "cpc"; }
      if (q.get("fbclid") && !out.utm.source) { out.utm.source = "facebook"; out.utm.medium = out.utm.medium || "paid"; }
      var ref = document.referrer || "";
      if (ref) { try { var h = new URL(ref).hostname; if (h && h !== location.hostname) out.referrer = h.slice(0, 200); } catch (e) {} }
      out.landing = (location.pathname || "/").slice(0, 200);
      out.first_seen = new Date().toISOString();
    } catch (e) {}
    return out;
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function ensure() {
    var m = load();
    if (m && (m.landing || (m.utm && Object.keys(m.utm).length))) return m; // keep FIRST touch
    m = parse();
    if (allowed()) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} }
    return m;
  }
  function channel(m) {
    if (!m) return "Direct";
    var u = m.utm || {};
    if (u.source) return (u.source + (u.medium ? " / " + u.medium : "")).slice(0, 80);
    if (m.referrer) return ("Referral · " + m.referrer).slice(0, 80);
    return "Direct";
  }
  var meta = ensure();
  window.NILeadMeta = {
    get: function () {
      var m = load() || meta || {};
      return {
        utm: (m.utm && Object.keys(m.utm).length) ? m.utm : null,
        referrer: m.referrer || null,
        landing: m.landing || null,
        first_seen: m.first_seen || null,
        channel: channel(m)
      };
    }
  };
})();
