/* account.js — auth (password + OTP + MFA) and the client dashboard.
   Talks only to /api/auth/*; session lives in an httpOnly cookie. */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const API_ROOT = (window.__API_BASE || "");
  const api = async (path, opts = {}) => {
    const res = await fetch(API_ROOT + "/api/auth" + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    return { status: res.status, ...data };
  };
  const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  const when = (s) => { try { return new Date(s.replace(" ", "T") + (s.includes("Z") ? "" : "Z")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (_) { return s; } };
  const err = (box, msg) => { if (box) { box.textContent = msg || ""; box.classList.toggle("show", Boolean(msg)); } };
  const ok = (box, msg) => { if (box) { box.textContent = msg || ""; box.classList.toggle("show", Boolean(msg)); } };
  const dev = (box, code) => { if (box) { box.textContent = code ? `Development mode — your code: ${code}` : ""; box.classList.toggle("show", Boolean(code)); } };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ═════════ AUTH PAGE ═════════ */
  const authCard = $("[data-auth]");
  if (authCard) {
    // Already signed in? Straight to the dashboard.
    api("/me").then((r) => { if (r.ok) location.replace("profile.html"); });

    const tabs = $$(".auth__tab", authCard);
    const panes = $$(".auth__pane", authCard);
    const show = (id) => {
      tabs.forEach((t) => t.classList.toggle("on", t.dataset.tab === id));
      panes.forEach((p) => p.classList.toggle("on", p.dataset.pane === id));
    };
    tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.tab)));
    $$("[data-goto]", authCard).forEach((b) => b.addEventListener("click", () => show(b.dataset.goto)));

    /* — password sign-in (with MFA step) — */
    const fLogin = $("[data-login]");
    fLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const box = $(".form-error", fLogin), devbox = $(".devnote", fLogin);
      err(box, ""); dev(devbox, "");
      const email = fLogin.email.value.trim(), password = fLogin.password.value;
      const r = await api("/login", { method: "POST", body: { email, password } });
      if (!r.ok) return err(box, r.error);
      if (r.next === "mfa") {
        $("[data-login-step1]", fLogin).style.display = "none";
        $("[data-login-mfa]", fLogin).style.display = "block";
        dev(devbox, r.devOtp);
        return;
      }
      location.href = "/profile";
    });
    const mfaResend = $("[data-mfa-resend]");
    if (mfaResend) mfaResend.addEventListener("click", async (ev) => {
      ev.preventDefault();
      mfaResend.textContent = "sending…";
      const r = await api("/login", { method: "POST", body: { email: fLogin.email.value.trim(), password: fLogin.password.value } });
      mfaResend.textContent = (r.ok && r.next === "mfa") ? "code sent — check your inbox" : (r.error || "could not send");
      setTimeout(() => { mfaResend.textContent = "Send a new code"; }, 6000);
    });
    $("[data-login-mfa-btn]").addEventListener("click", async () => {
      const box = $(".form-error", fLogin);
      const r = await api("/login/mfa", { method: "POST", body: { email: fLogin.email.value.trim(), code: fLogin.mfacode.value.trim() } });
      if (!r.ok) return err(box, r.error);
      location.href = "/profile";
    });

    /* — OTP sign-in — */
    const fOtp = $("[data-otp]");
    $("[data-otp-send]").addEventListener("click", async () => {
      const box = $(".form-error", fOtp), good = $(".form-ok", fOtp), devbox = $(".devnote", fOtp);
      err(box, ""); ok(good, "");
      const email = fOtp.email.value.trim();
      if (!email) return err(box, "Please enter your email address.");
      const r = await api("/otp/request", { method: "POST", body: { email } });
      if (!r.ok) return err(box, r.error);
      ok(good, r.message || "Code sent — check your inbox.");
      dev(devbox, r.devOtp);
      $("[data-otp-step2]", fOtp).style.display = "block";
    });
    fOtp.addEventListener("submit", async (e) => {
      e.preventDefault();
      const box = $(".form-error", fOtp);
      const r = await api("/otp/verify", { method: "POST", body: { email: fOtp.email.value.trim(), code: fOtp.code.value.trim() } });
      if (!r.ok) return err(box, r.error);
      location.href = "/profile";
    });

    /* — registration (consent required) + email verification — */
    const fReg = $("[data-register]");
    fReg.addEventListener("submit", async (e) => {
      e.preventDefault();
      const box = $(".form-error", fReg), devbox = $(".devnote", fReg);
      err(box, "");
      if (!fReg.consent.checked) return err(box, "Please accept the Terms of Service and Privacy Policy to continue.");
      const ref = new URLSearchParams(location.search).get("ref") || "";
      const body = {
        ref,
        name: fReg.name.value.trim(), email: fReg.email.value.trim(),
        password: fReg.password.value, phone: fReg.phone.value.trim(), company: fReg.company.value.trim(),
        consent: true, marketing: fReg.marketing.checked,
      };
      const r = await api("/register", { method: "POST", body });
      if (!r.ok) return err(box, r.error);
      $("[data-reg-step1]", fReg).style.display = "none";
      $("[data-reg-verify]", fReg).style.display = "block";
      dev(devbox, r.devOtp);
    });
    const regResend = $("[data-reg-resend]");
    if (regResend) regResend.addEventListener("click", async (ev) => {
      ev.preventDefault();
      regResend.textContent = "sending…";
      const r = await api("/verify-email/resend", { method: "POST", body: { email: fReg.email.value.trim() } });
      regResend.textContent = r.ok ? "code sent — check your inbox" : (r.error || "could not send, try again");
      if (r.devOtp) dev($("[data-reg-dev]"), r.devOtp);
      setTimeout(() => { regResend.textContent = "send a new code"; }, 6000);
    });
    $("[data-reg-verify-btn]").addEventListener("click", async () => {
      const box = $(".form-error", fReg);
      const r = await api("/verify-email", { method: "POST", body: { email: fReg.email.value.trim(), code: fReg.vcode.value.trim() } });
      if (!r.ok) return err(box, r.error);
      location.href = "/profile";
    });
  }

  /* ═════════ DASHBOARD ═════════ */
  const dash = $("[data-dash]");
  if (dash) {
    let me = null;

    const nav = $$(".dash__link"), panels = $$(".dash__panel");
    const open = (id) => {
      nav.forEach((n) => n.classList.toggle("on", n.dataset.panel === id));
      panels.forEach((p) => p.classList.toggle("on", p.dataset.panel === id));
      history.replaceState(null, "", "#" + id);
    };
    nav.forEach((n) => n.addEventListener("click", () => open(n.dataset.panel)));

    const paintBadges = () => {
      $("[data-hello]").textContent = me.name.split(" ")[0];
      $("[data-me-email]").textContent = me.email;
      $("[data-b-verified]").className = "badge " + (me.emailVerified ? "ok" : "warn");
      $("[data-b-verified]").textContent = me.emailVerified ? "Email verified" : "Email not verified";
      $("[data-b-mfa]").className = "badge " + (me.mfaEnabled ? "ok" : "warn");
      $("[data-b-mfa]").textContent = me.mfaEnabled ? "MFA on" : "MFA off";
      $("[data-member-since]").textContent = when(me.createdAt);
      const f = $("[data-profile-form]");
      f.name.value = me.name; f.phone.value = me.phone; f.company.value = me.company; f.marketing.checked = me.marketingOptin;
      $("[data-consent-line]").textContent = `Consent version ${me.consentVersion}, given ${when(me.consentAt)}.`;
      const sw = $("[data-mfa-state]");
      sw.textContent = me.mfaEnabled ? "Enabled" : "Disabled";
      $("[data-mfa-toggle]").textContent = me.mfaEnabled ? "Turn off" : "Turn on";
    };

    (async () => {
      const r = await api("/me");
      if (!r.ok) return location.replace("account.html");
      me = r.user; paintBadges();

      const [o, p, e] = await Promise.all([api("/me/orders"), api("/me/payments"), api("/me/enquiries")]);
      const orders = o.orders || [], pays = p.payments || [], enqs = e.enquiries || [];

      $("[data-k-orders]").textContent = orders.length;
      $("[data-k-paid]").textContent = inr(pays.filter((x) => x.status === "received").reduce((a, b) => a + b.amount_inr, 0));
      $("[data-k-enqs]").textContent = enqs.length;

      const fill = (sel, rows, empty, render) => {
        const host = $(sel);
        host.innerHTML = rows.length
          ? `<table class="tbl">${render(rows)}</table>`
          : `<div class="empty">${empty}</div>`;
      };
      const STAGES = ["Discovery","Design","Build","Review","Live","Care"];
      const railFor = (r) => (r.status === "active" || r.status === "delivered")
        ? `<div class="rail">${STAGES.map((s2, i) => `<div class="rail__step ${i < (r.stage ?? 0) ? "done" : i === (r.stage ?? 0) ? "now" : ""}"><span class="rail__dot"></span><span class="rail__lbl">${s2}</span></div>`).join("")}</div>` : "";
      const oHost = $("[data-orders]");
      oHost.innerHTML = orders.length
        ? orders.map((r) => `<div class="switchrow" style="flex-direction:column;align-items:stretch;margin-bottom:.8rem">
            <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:baseline">
              <div><b>#${r.id} · ${esc(r.title)}</b><small>${esc(r.service || "")} · started ${when(r.created_at)}</small></div>
              <div style="text-align:right"><span class="num" style="font-family:var(--f-mono);color:var(--gold-2)">${inr(r.amount_inr)}</span><br><span class="pill ${esc(r.status)}">${esc(r.status)}</span></div>
            </div>${railFor(r)}${r.notes ? `<small style="color:var(--on-wine-mute)">${esc(r.notes)}</small>` : ""}</div>`).join("")
        : `<div class="empty">No orders yet. When a project begins, it appears here with its live milestone timeline.</div>`;
      fill("[data-payments]", pays,
        "No payments recorded yet. Every payment against your projects is listed here with its reference.",
        (rows) => `<tr><th>#</th><th>Order</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th></th></tr>` +
          rows.map((r) => `<tr><td class="num">${r.id}</td><td class="num">${r.order_id ?? "—"}</td><td class="num">${inr(r.amount_inr)}</td><td>${esc(r.method || "—")}</td><td><span class="pill ${esc(r.status)}">${esc(r.status)}</span></td><td>${when(r.paid_at || r.created_at)}</td><td style="white-space:nowrap"><a class="tlink" style="display:inline-flex" href="${(window.__API_BASE||"")}/api/auth/me/payments/${r.id}/invoice.pdf" target="_blank">Invoice ↧</a>${r.status === "pending" && window.__rzp ? ` · <button class="tlink" data-pay="${r.id}" style="background:none;border:0;cursor:pointer;color:var(--gold-2)">Pay now</button>` : ""}</td></tr>`).join(""));
      fill("[data-enquiries]", enqs,
        "No enquiries on record for this email.",
        (rows) => `<tr><th>#</th><th>Interest</th><th>Message</th><th>Status</th><th>Sent</th></tr>` +
          rows.map((r) => `<tr><td class="num">${r.id}</td><td>${esc(r.interest || "—")}</td><td style="max-width:340px;white-space:normal">${esc(r.message).slice(0, 160)}</td><td><span class="pill">${esc(r.status)}</span></td><td>${when(r.created_at)}</td></tr>`).join(""));

      const s = await api("/me/sessions");
      $("[data-sessions]").innerHTML = (s.sessions || []).map((x) =>
        `<tr><td>${when(x.created_at)}</td><td>${esc(x.ip || "—")}</td><td style="max-width:280px;white-space:normal">${esc((x.user_agent || "—").slice(0, 90))}</td><td>${when(x.expires_at)}</td></tr>`).join("");

      /* tickets */
      const paintTickets = async () => {
        const t = await api("/me/tickets");
        const host = $("[data-tickets]");
        host.innerHTML = (t.tickets || []).length
          ? t.tickets.map((k) => `<div class="switchrow" style="flex-direction:column;align-items:stretch;margin-bottom:.8rem">
              <div style="display:flex;justify-content:space-between;gap:1rem"><b>#${k.id} · ${esc(k.subject)}</b><span class="pill ${k.status === "open" ? "pending" : "received"}">${esc(k.status)}</span></div>
              ${k.replies.map((r) => `<div style="border-left:2px solid ${r.author === "studio" ? "var(--gold)" : "var(--gold-line-2)"};padding:.5rem .8rem;margin-top:.5rem"><small style="color:var(--gold-deep);font-family:var(--f-mono);font-size:.6rem;letter-spacing:.15em;text-transform:uppercase">${r.author === "studio" ? "Next Imaginations" : "You"} · ${when(r.created_at)}</small><p style="font-size:.9rem;color:var(--on-wine-soft);margin-top:.2rem">${esc(r.body)}</p></div>`).join("")}
              <div class="code-row" style="margin-top:.8rem"><div class="field" style="margin:0"><input placeholder="Reply…" data-tr="${k.id}"></div><button class="btn btn--line" type="button" data-trs="${k.id}">Send</button></div>
            </div>`).join("")
          : `<div class="empty">No support tickets. Raise one below and we'll reply by the next business day.</div>`;
        $$("[data-trs]").forEach((b) => b.addEventListener("click", async () => {
          const inp = $(`[data-tr="${b.dataset.trs}"]`);
          if (!inp.value.trim()) return;
          await api(`/me/tickets/${b.dataset.trs}/reply`, { method: "POST", body: { body: inp.value.trim() } });
          paintTickets();
        }));
      };
      paintTickets();
      $("[data-ticket-form]").addEventListener("submit", async (e2) => {
        e2.preventDefault();
        const f = e2.target, box = $(".form-error", f);
        err(box, "");
        const r2 = await api("/me/tickets", { method: "POST", body: { subject: f.subject.value.trim(), body: f.body.value.trim() } });
        if (!r2.ok) return err(box, r2.error);
        f.reset(); paintTickets();
      });

      /* referrals */
      const rr = await api("/me/referrals");
      if (rr.ok) {
        $("[data-ref-link]").value = rr.link;
        $("[data-ref-count]").textContent = rr.referrals.length;
        $("[data-ref-credit]").textContent = inr(rr.totalCredit);
        $("[data-ref-list]").innerHTML = rr.referrals.length
          ? rr.referrals.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${when(x.joined)}</td></tr>`).join("")
          : `<tr><td colspan="3" style="color:var(--on-wine-mute)">No sign-ups from your link yet — share it below.</td></tr>`;
        $("[data-ref-copy]").addEventListener("click", () => {
          navigator.clipboard.writeText(rr.link);
          $("[data-ref-copy]").textContent = "Copied ✓";
          setTimeout(() => ($("[data-ref-copy]").textContent = "Copy link"), 1600);
        });
      }

      /* Razorpay pay-now */
      const cfg = await fetch("/api/config").then((x) => x.json()).catch(() => ({}));
      window.__rzp = cfg.rzpKey || null;
      document.addEventListener("click", async (ev) => {
        const b = ev.target.closest("[data-pay]");
        if (!b) return;
        const r3 = await api(`/me/payments/${b.dataset.pay}/rzp-order`, { method: "POST" });
        if (!r3.ok) return alert(r3.error || "Could not start payment.");
        const rz = new Razorpay({ key: r3.keyId, amount: r3.amount, currency: "INR", name: "Next Imaginations", order_id: r3.orderId,
          prefill: { name: r3.name, email: r3.email },
          theme: { color: "#C6A052" },
          handler: async (resp) => {
            const v = await api(`/me/payments/${b.dataset.pay}/rzp-verify`, { method: "POST", body: { order_id: resp.razorpay_order_id, payment_id: resp.razorpay_payment_id, signature: resp.razorpay_signature } });
            alert(v.ok ? "Payment received — thank you!" : (v.error || "Verification failed."));
            if (v.ok) location.reload();
          } });
        rz.open();
      });

      if (location.hash) open(location.hash.slice(1));
    })();

    /* profile save */
    $("[data-profile-form]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, box = $(".form-error", f), good = $(".form-ok", f);
      err(box, ""); ok(good, "");
      const r = await api("/me", { method: "PATCH", body: { name: f.name.value.trim(), phone: f.phone.value.trim(), company: f.company.value.trim(), marketing: f.marketing.checked } });
      if (!r.ok) return err(box, r.error);
      me = r.user; paintBadges(); ok(good, "Saved.");
    });

    /* password change */
    $("[data-pass-form]").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, box = $(".form-error", f), good = $(".form-ok", f);
      err(box, ""); ok(good, "");
      const r = await api("/me/password", { method: "POST", body: { current: f.current.value, next: f.next.value } });
      if (!r.ok) return err(box, r.error);
      f.reset(); ok(good, "Password updated.");
    });

    /* MFA toggle: request code → confirm */
    const mfaBox = $("[data-mfa-code-row]");
    $("[data-mfa-toggle]").addEventListener("click", async () => {
      const box = $("[data-mfa-error]"), devbox = $("[data-mfa-dev]");
      err(box, "");
      const r = await api("/me/mfa/request", { method: "POST" });
      if (!r.ok) return err(box, r.error);
      dev(devbox, r.devOtp);
      mfaBox.style.display = "flex";
      $("[data-mfa-confirm]").dataset.enable = me.mfaEnabled ? "false" : "true";
    });
    $("[data-mfa-confirm]").addEventListener("click", async (e) => {
      const box = $("[data-mfa-error]");
      const enable = e.target.dataset.enable === "true";
      const body = { enable, code: $("[data-mfa-input]").value.trim() };
      // Disabling MFA is a security downgrade — the server requires the password.
      if (!enable) {
        const pw = window.prompt("Enter your password to turn off two-step verification:");
        if (pw === null) return; // cancelled
        body.password = pw;
      }
      const r = await api("/me/mfa", { method: "POST", body });
      if (!r.ok) return err(box, r.error);
      me.mfaEnabled = r.mfaEnabled; paintBadges();
      mfaBox.style.display = "none"; $("[data-mfa-input]").value = "";
    });

    /* sign out everywhere else */
    $("[data-revoke]").addEventListener("click", async () => {
      await api("/me/sessions/revoke-others", { method: "POST" });
      location.reload();
    });

    /* sign out */
    $$("[data-logout]").forEach((b) => b.addEventListener("click", async () => {
      await api("/logout", { method: "POST" });
      location.href = "/account";
    }));

    /* delete account */
    const modal = $("[data-del-modal]");
    $("[data-del-open]").addEventListener("click", () => modal.classList.add("show"));
    $("[data-del-cancel]").addEventListener("click", () => modal.classList.remove("show"));
    $("[data-del-send]").addEventListener("click", async () => {
      const box = $("[data-del-error]"), devbox = $("[data-del-dev]");
      err(box, "");
      const r = await api("/me/delete/request", { method: "POST" });
      if (!r.ok) return err(box, r.error);
      dev(devbox, r.devOtp);
      ok($("[data-del-sent]"), "Code sent to your email.");
    });
    $("[data-del-confirm]").addEventListener("click", async () => {
      const box = $("[data-del-error]");
      err(box, "");
      if ($("[data-del-word]").value.trim().toUpperCase() !== "DELETE") return err(box, 'Type DELETE to confirm.');
      const r = await api("/me/delete", { method: "POST", body: { password: $("[data-del-pass]").value, code: $("[data-del-code]").value.trim() } });
      if (!r.ok) return err(box, r.error);
      alert("Your account and personal data have been deleted. We're sorry to see you go.");
      location.href = "/";
    });
  }
})();
