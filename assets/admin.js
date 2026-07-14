// admin.js — Next Imaginations owner dashboard. Talks to /api/auth/admin/* with
// an httpOnly admin-session cookie (set at login). Self-contained: no shim needed.
(() => {
  "use strict";
  const API = /(^|\.)nextimaginations\.com$/.test(location.hostname)
    ? "https://api.nextimaginations.com"
    : (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "" : "https://next-imaginations-api.onrender.com");

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  const when = (s) => { try { const d = new Date(String(s).replace(" ", "T") + (String(s).includes("Z") ? "" : "Z")); return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return s; } };

  const api = async (path, opts = {}) => {
    const res = await fetch(API + "/api/auth/admin" + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let d = {}; try { d = await res.json(); } catch (e) {}
    return { status: res.status, ...d };
  };

  const flash = (msg) => { const f = $("[data-flash]"); f.textContent = msg; f.classList.add("show"); setTimeout(() => f.classList.remove("show"), 2600); };

  /* ---- login ---- */
  $("[data-login-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("[data-login-err]"); err.textContent = "";
    const btn = e.target.querySelector("button"); btn.disabled = true;
    const r = await api("/login", { method: "POST", body: { password: $("#pw").value } });
    btn.disabled = false;
    if (r.status === 200 && r.ok) { showDash(); }
    else { err.textContent = r.error || "Sign in failed."; }
  });

  $("[data-logout]").addEventListener("click", async () => { await api("/logout", { method: "POST" }); location.reload(); });
  $("[data-refresh]").addEventListener("click", () => loadAll());

  /* ---- tabs ---- */
  $$("[data-tab]").forEach((t) => t.addEventListener("click", () => {
    $$("[data-tab]").forEach((x) => x.classList.toggle("on", x === t));
    const name = t.getAttribute("data-tab");
    $$("[data-panel]").forEach((p) => p.classList.toggle("on", p.getAttribute("data-panel") === name));
  }));

  async function showDash() {
    $("[data-login]").style.display = "none";
    $("[data-dash]").style.display = "block";
    await loadAll();
  }

  async function loadAll() {
    const [stats, leads, clients, orders, payments, tickets] = await Promise.all([
      api("/stats"), api("/leads"), api("/clients"), api("/orders/all"), api("/payments/all"), api("/tickets/all"),
    ]);
    if (stats.status === 401) { location.reload(); return; }
    renderStats(stats.stats || {});
    renderLeads(leads.leads || []);
    renderClients(clients.clients || []);
    renderOrders(orders.orders || []);
    renderPayments(payments.payments || []);
    renderTickets(tickets.tickets || []);
  }

  function renderStats(s) {
    const cards = [
      ["New leads", s.newLeads], ["Total leads", s.leads], ["Clients", s.clients],
      ["Orders", s.orders], ["Revenue", inr(s.revenue)], ["Open tickets", s.openTickets], ["Subscribers", s.subscribers],
    ];
    $("[data-stats]").innerHTML = cards.map(([l, n]) => `<div class="stat"><div class="n">${esc(n ?? 0)}</div><div class="l">${l}</div></div>`).join("");
  }

  const STATUSES = ["new", "contacted", "quoted", "won", "lost", "closed"];
  function renderLeads(rows) {
    $("[data-leads]").innerHTML = rows.length ? rows.map((r) => `
      <tr>
        <td class="muted" style="white-space:nowrap">${when(r.created_at)}</td>
        <td>${esc(r.name)}</td>
        <td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
        <td><span class="pill">${esc(r.source || "contact")}</span>${r.channel ? `<br><span class="muted" style="font-size:.7rem">${esc(r.channel)}</span>` : ""}${r.utm && r.utm.campaign ? `<br><span class="muted" style="font-size:.68rem">${esc(r.utm.campaign)}</span>` : ""}</td>
        <td style="max-width:340px">${esc(r.message || "").slice(0, 220)}${r.interest ? `<br><span class="muted">Interest: ${esc(r.interest)}</span>` : ""}${r.budget ? `<br><span class="muted" style="font-size:.72rem">Budget: ${esc(r.budget)}</span>` : ""}${r.timeline ? ` <span class="muted" style="font-size:.72rem">&middot; Timeline: ${esc(r.timeline)}</span>` : ""}</td>
        <td><select class="status" data-lead="${r.id}">${STATUSES.map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select></td>
      </tr>`).join("") : `<tr><td colspan="6" class="muted">No leads yet.</td></tr>`;
    $$("[data-lead]").forEach((sel) => sel.addEventListener("change", async () => {
      const r = await api("/leads/" + sel.getAttribute("data-lead"), { method: "PATCH", body: { status: sel.value } });
      flash(r.ok ? "Lead updated" : (r.error || "Update failed"));
    }));
  }

  function renderClients(rows) {
    $("[data-clients]").innerHTML = rows.length ? rows.map((r) => `
      <tr><td class="muted" style="white-space:nowrap">${when(r.created_at)}</td>
      <td>${esc(r.name)}</td><td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>
      <td>${esc(r.company || "—")}</td><td>${esc(r.phone || "—")}</td>
      <td>${r.emailVerified ? '<span class="pill won">yes</span>' : '<span class="pill">no</span>'}</td></tr>`).join("")
      : `<tr><td colspan="6" class="muted">No client accounts yet.</td></tr>`;
  }

  function renderOrders(rows) {
    const STAGES = ["Discovery", "Design", "Build", "Review", "Live", "Care"];
    $("[data-orders]").innerHTML = rows.length ? rows.map((r) => `
      <tr><td class="muted" style="white-space:nowrap">${when(r.created_at)}</td>
      <td>${esc(r.title)}<br><span class="muted" style="font-size:.72rem">${esc(r.id)}</span></td>
      <td>${esc(r.email || "—")}</td><td>${inr(r.amount_inr)}</td>
      <td><span class="pill ${esc(r.status)}">${esc(r.status)}</span></td>
      <td><select class="status" data-stage="${r.id}">${STAGES.map((s, i) => `<option value="${i}" ${i === (r.stage ?? 0) ? "selected" : ""}>${i}· ${s}</option>`).join("")}</select></td></tr>`).join("")
      : `<tr><td colspan="6" class="muted">No orders yet.</td></tr>`;
    $$("[data-stage]").forEach((sel) => sel.addEventListener("change", async () => {
      const r = await api("/orders/" + sel.getAttribute("data-stage") + "/stage", { method: "POST", body: { stage: Number(sel.value) } });
      flash(r.ok ? "Stage updated — client notified" : (r.error || "Failed"));
    }));
  }

  function renderPayments(rows) {
    $("[data-payments]").innerHTML = rows.length ? rows.map((r) => `
      <tr><td class="muted" style="white-space:nowrap">${when(r.paid_at || r.created_at)}</td>
      <td>${esc(r.payer_name ? r.payer_name + " · " : "")}${esc(r.email || "—")}${r.kind && r.kind !== "payment" ? `<br><span class="muted" style="font-size:.7rem">${esc(r.kind)}</span>` : ""}</td>
      <td>${inr(r.amount_inr)}${r.coupon ? `<br><span class="muted" style="font-size:.7rem">${esc(r.coupon)} −${inr(r.discount_inr || 0)}</span>` : ""}</td>
      <td>${esc((r.method || "—").toUpperCase())}</td>
      <td><span class="pill ${esc(r.status)}">${esc(r.status)}</span></td></tr>`).join("")
      : `<tr><td colspan="5" class="muted">No payments recorded.</td></tr>`;
  }

  function renderTickets(rows) {
    $("[data-tickets]").innerHTML = rows.length ? rows.map((t) => `
      <details>
        <summary>${esc(t.subject)} <span class="pill ${esc(t.status)}">${esc(t.status)}</span>
          <span class="muted" style="font-weight:400"> — ${esc(t.client ? t.client.name + " <" + t.client.email + ">" : "unknown")}</span></summary>
        <div style="margin-top:10px">
          ${(t.replies || []).map((rep) => `<div class="reply ${rep.author === "studio" ? "studio" : ""}"><span class="mono">${rep.author} · ${when(rep.created_at)}</span><br>${esc(rep.body)}</div>`).join("")}
          <form data-ticket-reply="${t.id}" style="margin-top:10px">
            <textarea name="body" rows="2" placeholder="Write a reply…" style="margin-bottom:8px"></textarea>
            <button type="submit">Reply &amp; notify client</button>
          </form>
        </div>
      </details>`).join("") : `<p class="muted">No support tickets.</p>`;
    $$("[data-ticket-reply]").forEach((f) => f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = f.getAttribute("data-ticket-reply");
      const r = await api("/tickets/" + id + "/reply", { method: "POST", body: { body: f.body.value, status: "answered" } });
      flash(r.ok ? "Reply sent" : (r.error || "Failed")); if (r.ok) loadAll();
    }));
  }

  /* ---- create order / payment ---- */
  $("[data-order-form]").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = e.target, err = $("[data-order-err]"); err.textContent = "";
    const r = await api("/orders", { method: "POST", body: {
      email: f.email.value.trim(), title: f.title.value.trim(), service: f.service.value.trim(),
      amount_inr: Number(f.amount_inr.value || 0), status: f.status.value } });
    if (r.ok) { flash("Order created — client emailed"); f.reset(); loadAll(); } else { err.textContent = r.error || "Failed"; }
  });
  $("[data-payment-form]").addEventListener("submit", async (e) => {
    e.preventDefault(); const f = e.target, err = $("[data-payment-err]"); err.textContent = "";
    const r = await api("/payments", { method: "POST", body: {
      email: f.email.value.trim(), order_id: f.order_id.value.trim() || undefined,
      amount_inr: Number(f.amount_inr.value || 0), method: f.method.value, status: f.status.value } });
    if (r.ok) { flash("Payment recorded — receipt emailed"); f.reset(); loadAll(); } else { err.textContent = r.error || "Failed"; }
  });

  /* ---- boot: are we already signed in? ---- */
  (async () => { const r = await api("/me"); if (r.status === 200 && r.admin) showDash(); })();
})();
