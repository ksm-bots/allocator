(() => {
  "use strict";

  const GAS_PLACEHOLDER = "https://script.google.com/macros/s/AKfycbwzTUHnD_7QW1nxkQb1BDeiuahq_g83qrXw6WuIN3TLYY1KJj6q1xn3Kekqirh_Pus/exec";
  const PROTECTED_SHEETS = new Set(["group", "assignedlog", "rightbalancesummary"]);
  const STARTERS = [
    { id: 1, name: "PT", qty: 1200, right3Limit: "2", notes: "Primary pool" },
    { id: 2, name: "HOM", qty: 500, right3Limit: "1", notes: "014, 015, 017, 026, 037" },
    { id: 3, name: "MF440", qty: 440, right3Limit: "1", notes: "040, 087, 146, 227, 344" },
    { id: 4, name: "MF70", qty: 70, right3Limit: "1", notes: "" },
    { id: 5, name: "MF50a", qty: 50, right3Limit: "1", notes: "" },
  ];

  const state = {
    sellers: STARTERS.map(s => ({ ...s })),
    stockTotal: 6240,
    groups: 20,
    largestGroup: 31,
    endpoint: "",
    isConnected: false,
    isRunning: false,
    result: null,
    repeat: "1",
    defaultLimit: "1",
    includeLeftover: true,
    sheetName: "Distribution",
  };

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n || 0).toLocaleString("en-US");
  const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));

  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }
  function demand() { return state.sellers.reduce((sum, s) => sum + Number(s.qty || 0), 0); }
  function allocationReady() { return state.sellers.length > 0 && state.sellers.every(s => s.name.trim() && Number(s.qty) > 0); }

  function normalizeGasUrl(raw) {
    try {
      const url = new URL(String(raw || "").trim());
      if (url.protocol !== "https:") return "";
      if (url.hostname !== "script.google.com") return "";
      if (!/^\/macros\/s\/[^/]+\/exec$/i.test(url.pathname)) return "";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch (_) { return ""; }
  }

  function jsonp(baseUrl, params) {
    return new Promise((resolve, reject) => {
      const callback = `__loneeddy_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      const script = document.createElement("script");
      let settled = false;
      let loadTimer = null;
      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Apps Script timed out. Redeploy the latest Code.gs as a Web app and make sure the deployment is accessible to this browser."));
      }, 20000);
      const cleanup = () => {
        window.clearTimeout(timer);
        if (loadTimer) window.clearTimeout(loadTimer);
        try { delete window[callback]; } catch (_) {}
        script.remove();
      };
      window[callback] = (data) => {
        if (settled) return;
        settled = true;
        cleanup();
        data && data.ok ? resolve(data) : reject(new Error((data && data.error) || "Apps Script returned an error."));
      };
      const url = new URL(baseUrl);
      Object.entries({ ...params, callback, _: Date.now() }).forEach(([k, v]) => url.searchParams.set(k, String(v)));
      script.src = url.toString();
      script.async = true;
      script.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("The Apps Script /exec request was blocked or the deployment is not publicly reachable. Use Test /exec, then redeploy as Web app if needed."));
      };
      script.onload = () => {
        if (settled) return;
        loadTimer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error("The endpoint opened, but it did not return allocator JSONP. This usually means an old Code.gs version or a sign-in/access page is still deployed."));
        }, 600);
      };
      document.body.appendChild(script);
    });
  }

  function buildDemoResult() {
    const stock = state.stockTotal;
    let pointer = 0;
    const people = state.sellers.map((seller, sellerIndex) => {
      const preview = Array.from({ length: Math.min(Number(seller.qty), 18) }, (_, index) => {
        const raw = (100000 + ((pointer + index) * 137 + sellerIndex * 1031) % 899999).toString();
        return raw.padStart(6, "0");
      });
      pointer += Number(seller.qty);
      const uniqueQty = Math.min(Number(seller.qty), Math.max(0, stock - (pointer - Number(seller.qty))));
      return { ...seller, assignedQty: Number(seller.qty), uniqueQty, repeatQty: Number(seller.qty) - uniqueQty, preview };
    });
    const total = demand();
    return {
      batchId: `DEMO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-A1`,
      sheetName: state.sheetName,
      totalRequested: total,
      totalUniqueStock: stock,
      uniqueUsed: Math.min(stock, total),
      repeatTotal: Math.max(0, total - stock),
      leftoverQty: Math.max(0, stock - total),
      people,
    };
  }

  function showMessage(text, tone = "ok") {
    const box = $("message-container");
    if (!text) { box.innerHTML = ""; return; }
    box.innerHTML = `<div class="inline-message ${tone}"><span>${tone === "ok" ? "✓" : "i"}</span>${esc(text)}</div>`;
  }

  function renderSellers() {
    const list = $("seller-list");
    list.innerHTML = state.sellers.map((s, index) => `
      <div class="seller-row" data-id="${s.id}">
        <div class="seller-name-cell"><span class="seller-index">${String(index + 1).padStart(2, "0")}</span><input data-field="name" value="${esc(s.name)}" placeholder="Seller name" aria-label="Seller ${index + 1} name" /></div>
        <input class="numeric-input" data-field="qty" type="number" min="1" value="${Number(s.qty) || ""}" placeholder="0" aria-label="${esc(s.name || "Seller")} quota" />
        <select data-field="right3Limit" aria-label="${esc(s.name || "Seller")} Right-3 limit">
          ${[["1","1 same"],["2","2 same"],["3","3 same"],["4","4 same"],["5","5 same"],["0","Auto"]].map(([v,l]) => `<option value="${v}" ${String(s.right3Limit)===v?"selected":""}>${l}</option>`).join("")}
        </select>
        <input data-field="notes" value="${esc(s.notes)}" placeholder="Optional note" aria-label="${esc(s.name || "Seller")} notes" />
        <button class="icon-button danger-icon remove-seller" aria-label="Remove ${esc(s.name || "seller")}">×</button>
      </div>`).join("");
  }

  function renderMetrics() {
    const d = demand();
    const remaining = state.stockTotal - d;
    const percent = state.stockTotal ? Math.min(100, Math.round((d / state.stockTotal) * 100)) : 0;
    const status = !state.stockTotal ? "Waiting" : d === 0 ? "Ready" : remaining >= 0 ? "Ready to run" : "Repeats required";

    setText("metric-stock", fmt(state.stockTotal));
    setText("metric-demand", fmt(d));
    setText("metric-demand-detail", `Across ${state.sellers.length} configured sellers`);
    setText("metric-remaining", `${remaining >= 0 ? "+" : "−"}${fmt(Math.abs(remaining))}`);
    setText("metric-remaining-detail", remaining >= 0 ? "Unique stock is enough" : "Repeat tickets will be needed");
    setText("remaining-icon", remaining >= 0 ? "↗" : "i");
    const rcard = $("remaining-card"); rcard.classList.remove("metric-warning","metric-danger"); rcard.classList.add(remaining >= 0 ? "metric-warning" : "metric-danger");

    setText("metric-status", status);
    setText("metric-status-detail", state.result ? `Batch ${state.result.batchId}` : "Configure sellers, then run");
    const scard = $("status-card"); scard.classList.remove("metric-neutral","metric-signal","metric-danger"); scard.classList.add(!state.stockTotal || d===0 ? "metric-neutral" : remaining>=0 ? "metric-signal" : "metric-danger");
    setText("status-icon", state.result ? "✓" : "◉");

    setText("demand-strip-value", `${fmt(d)} / ${fmt(state.stockTotal)}`);
    $("demand-progress").style.width = `${percent}%`;
    setText("demand-percent", `${percent}%`);
    setText("active-sellers", `${state.sellers.length} active sellers`);
    setText("flow-config-detail", `${state.sellers.length} sellers / ${fmt(d)} requested`);
    setText("source-stock", fmt(state.stockTotal));
    setText("source-groups", fmt(state.groups));
    setText("bottom-groups", fmt(state.groups));
    setText("largest-group", fmt(state.largestGroup));
    setText("bottom-output", state.sheetName || "Distribution");

    const btn = $("run-btn"); btn.disabled = state.isRunning || !allocationReady();
    setText("run-label", state.isRunning ? "Running" : "Run allocation");
    setText("review-step-number", state.result ? "✓" : "2");
    setText("review-step-detail", state.result ? "Preview ready to inspect" : "Waiting for a run");
    $("review-step").classList.toggle("is-done", Boolean(state.result));
    $("review-step").classList.toggle("is-current", !state.result);
  }

  function renderSource() {
    $("status-pill").classList.toggle("is-connected", state.isConnected);
    $("status-pill").classList.toggle("is-demo", !state.isConnected);
    setText("status-pill-label", state.isConnected ? "Live source" : "Review mode");
    setText("source-name", state.isConnected ? "Google Sheet / Group" : "Demo stock / Group");
    setText("connect-label", state.isConnected ? "Refresh source" : "Connect source");
  }

  function renderResult() {
    const box = $("result-container");
    if (!state.result) {
      box.innerHTML = `<div class="empty-preview"><div class="empty-orbit"><span></span><span></span><span></span></div><span class="eyebrow">No run in this desk</span><h4>The result surface is ready.</h4><p>Review the seller rows, then run a fair allocation to see ticket previews and repeat exposure.</p><button class="button button-dark" id="empty-run-btn"><span class="icon-text">▶</span> Run allocation</button></div>`;
      const er = $("empty-run-btn"); if (er) { er.disabled = state.isRunning || !allocationReady(); er.addEventListener("click", allocate); }
      return;
    }
    const r = state.result;
    const headers = r.people.map(p => `<th>${esc(p.name)}<small>${fmt(p.qty ?? p.assignedQty)} requested</small></th>`).join("") + (state.includeLeftover ? `<th>Leftover<small>${fmt(r.leftoverQty)} unassigned</small></th>` : "");
    const cells = r.people.map(p => {
      const preview = Array.isArray(p.preview) ? p.preview : [];
      return `<td><div class="ticket-stack">${preview.map(t => `<span class="ticket-chip">${esc(t)}</span>`).join("")}${Number(p.assignedQty)>preview.length?`<span class="more-tickets">+ ${fmt(Number(p.assignedQty)-preview.length)} more</span>`:""}</div><div class="cell-foot"><span><b>${fmt(p.uniqueQty)}</b> unique</span><span class="${Number(p.repeatQty)?"is-alert":""}"><b>${fmt(p.repeatQty)}</b> repeats</span></div></td>`;
    }).join("") + (state.includeLeftover ? `<td><div class="leftover-cell"><span class="icon-text">↓</span><strong>${fmt(r.leftoverQty)}</strong><span>tickets held back</span></div></td>` : "");
    box.innerHTML = `<div class="result-content"><div class="result-summary"><div><span>Requested</span><strong>${fmt(r.totalRequested)}</strong></div><div><span>Unique used</span><strong>${fmt(r.uniqueUsed)}</strong></div><div><span>Repeated</span><strong class="${Number(r.repeatTotal)?"is-alert":""}">${fmt(r.repeatTotal)}</strong></div><div><span>Leftover</span><strong>${fmt(r.leftoverQty)}</strong></div></div><div class="result-table-wrap"><table><thead><tr>${headers}</tr></thead><tbody><tr>${cells}</tr></tbody></table></div><div class="result-rule"><span>✓</span><span>Fair rounds first · exact Right-3 limits honored · Right-3 and Right-2 buckets balanced together.</span></div></div>`;
  }

  async function loadStatus(nextEndpoint) {
    if (!nextEndpoint || nextEndpoint.includes(GAS_PLACEHOLDER)) {
      state.isConnected = false; state.stockTotal = 6240; state.groups = 20; state.largestGroup = 31;
      setText("connection-message", "Demo stock loaded for review"); renderSource(); renderMetrics(); return false;
    }
    const normalized = normalizeGasUrl(nextEndpoint);
    if (!normalized) {
      state.isConnected = false; renderSource(); setText("connection-message", "Invalid Apps Script /exec URL"); showMessage("Please paste the deployed Google Apps Script Web App URL from Deploy → Manage deployments. It must end in /exec.", "error"); return false;
    }
    state.endpoint = normalized;
    const input = $("endpoint-input"); if (input) input.value = normalized;
    setText("connection-message", "Checking Apps Script endpoint…");
    try {
      const data = await jsonp(normalized, { action: "status" });
      state.isConnected = true;
      state.stockTotal = Number(data.totalTickets || 0);
      state.groups = Number(data.totalGroups || 0);
      state.largestGroup = Number(data.largestGroup || 0);
      localStorage.setItem("loneeddy-gas-url", normalized);
      setText("connection-message", "Connected to Group!A:J");
      setText("endpoint-diagnostic", `Connected: ${fmt(state.stockTotal)} valid tickets detected in Group!A:J.`);
      showMessage("Stock refreshed from the live Apps Script source.", "ok");
      renderSource(); renderMetrics();
      return true;
    } catch (e) {
      state.isConnected = false;
      localStorage.removeItem("loneeddy-gas-url");
      setText("connection-message", "Apps Script needs attention");
      setText("endpoint-diagnostic", "Connection failed. Click Test /exec. If you see a Google sign-in/access page, redeploy the Web app with access that allows this browser. If you see old output, deploy a new version of Code.gs.");
      showMessage(e instanceof Error ? e.message : "Could not load source status.", "error");
      renderSource(); renderMetrics();
      return false;
    }
  }

  async function allocate() {
    if (state.isRunning) return;
    if (!state.sellers.length) { showMessage("Add at least one seller before running an allocation.", "error"); return; }
    const invalid = state.sellers.find(s => !s.name.trim() || Number(s.qty) < 1);
    if (invalid) { showMessage(`${invalid.name || "Every seller"} needs a name and a quota of at least 1.`, "error"); return; }
    const outName = (state.sheetName || "Distribution").trim();
    if (PROTECTED_SHEETS.has(outName.toLowerCase())) { showMessage(`“${outName}” is a protected source/log sheet. Choose another Result sheet name, such as Distribution.`, "error"); return; }

    state.isRunning = true; state.result = null; showMessage(""); renderMetrics(); renderResult();
    try {
      if (!state.endpoint || state.endpoint.includes(GAS_PLACEHOLDER)) {
        await new Promise(r => setTimeout(r, 350));
        state.result = buildDemoResult();
        showMessage("Demo allocation ready. Connect Apps Script when you are ready to save to Google Sheets.", "ok");
      } else {
        const data = await jsonp(state.endpoint, {
          action: "allocateBatch",
          people: JSON.stringify(state.sellers.map(({ name, qty, right3Limit }) => ({ name, qty: Number(qty), right3Limit: Number(right3Limit) || 0 }))),
          repeat: state.repeat,
          includeLeftover: state.includeLeftover ? "1" : "0",
          sheetName: outName,
        });
        state.result = {
          ...data,
          people: (data.people || []).map((person, index) => ({ ...person, id: state.sellers[index]?.id ?? index + 1, notes: state.sellers[index]?.notes ?? "", right3Limit: String(person.right3Limit ?? state.sellers[index]?.right3Limit ?? "0") })),
        };
        showMessage(`Saved to ${state.result.sheetName || outName}. Batch ${state.result.batchId}.`, "ok");
      }
    } catch (e) {
      showMessage(e instanceof Error ? e.message : "Allocation failed.", "error");
    } finally {
      state.isRunning = false; renderMetrics(); renderResult();
    }
  }

  function resetAll() {
    if (!window.confirm("Reset sellers and the current allocation preview?")) return;
    state.sellers = STARTERS.map(s => ({ ...s })); state.result = null; showMessage(""); renderSellers(); renderMetrics(); renderResult();
  }

  function downloadCSV() {
    if (!state.result) { showMessage("Run an allocation before exporting a CSV.", "error"); return; }
    const rows = [["Seller","Requested","Unique","Repeated","Right-3 limit"], ...state.result.people.map(p => [p.name,p.qty ?? p.assignedQty,p.uniqueQty,p.repeatQty,String(p.right3Limit)==="0"?"AUTO":p.right3Limit])];
    rows.push(["Leftover", state.result.leftoverQty, "", "", ""]);
    const csv = rows.map(row => row.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `loneeddy-allocation-${state.result.batchId || "result"}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
  }

  function jumpTo(id) {
    $("main-nav").classList.remove("is-open"); setText("mobile-menu", "☰");
    const el = $(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindEvents() {
    document.addEventListener("click", e => {
      const t = e.target.closest("[data-target]"); if (t) { e.preventDefault(); jumpTo(t.dataset.target); }
    });
    $("mobile-menu").addEventListener("click", () => { const nav=$("main-nav"); nav.classList.toggle("is-open"); $("mobile-menu").innerHTML = `<span class="icon-text">${nav.classList.contains("is-open")?"×":"☰"}</span>`; });
    $("add-seller-btn").addEventListener("click", () => { state.sellers.push({ id: Date.now(), name: "", qty: 0, right3Limit: state.defaultLimit, notes: "" }); state.result=null; renderSellers(); renderMetrics(); renderResult(); setTimeout(()=>jumpTo("seller-config"),20); });
    $("seller-list").addEventListener("click", e => { const b=e.target.closest(".remove-seller"); if(!b)return; const row=b.closest(".seller-row"); state.sellers=state.sellers.filter(s=>String(s.id)!==row.dataset.id); state.result=null; renderSellers(); renderMetrics(); renderResult(); });
    const sellerChange = e => { const input=e.target.closest("[data-field]"); if(!input)return; const row=input.closest(".seller-row"); const seller=state.sellers.find(s=>String(s.id)===row.dataset.id); if(!seller)return; seller[input.dataset.field]=input.dataset.field==="qty"?Number(input.value):input.value; state.result=null; renderMetrics(); renderResult(); };
    $("seller-list").addEventListener("input", sellerChange); $("seller-list").addEventListener("change", sellerChange);
    $("run-btn").addEventListener("click", allocate); $("reset-btn").addEventListener("click", resetAll); $("csv-btn").addEventListener("click", downloadCSV); $("print-btn").addEventListener("click", ()=>window.print());
    $("connect-btn").addEventListener("click", async () => {
      const next = $("endpoint-input").value.trim();
      if (!next) { state.endpoint = ""; state.isConnected = false; localStorage.removeItem("loneeddy-gas-url"); await loadStatus(""); return; }
      state.endpoint = next;
      await loadStatus(next);
    });
    $("test-endpoint-btn").addEventListener("click", () => {
      const normalized = normalizeGasUrl($("endpoint-input").value.trim());
      if (!normalized) { showMessage("Paste a valid Apps Script /exec URL first.", "error"); return; }
      const test = new URL(normalized); test.searchParams.set("action", "status"); test.searchParams.set("_", String(Date.now()));
      window.open(test.toString(), "_blank", "noopener,noreferrer");
    });
    $("default-limit").addEventListener("change", e => { state.defaultLimit=e.target.value; });
    $("repeat-mode").addEventListener("change", e => { state.repeat=e.target.value; });
    $("sheet-name").addEventListener("input", e => { state.sheetName=e.target.value; setText("bottom-output",state.sheetName||"Distribution"); });
    $("include-leftover").addEventListener("change", e => { state.includeLeftover=e.target.checked; renderResult(); });
  }

  function init() {
    renderSellers(); renderMetrics(); renderSource(); renderResult(); bindEvents();
    setText("last-reviewed", new Intl.DateTimeFormat("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date()).replace(",", " ·"));
    const query = new URLSearchParams(location.search);
    const configured = query.get("gasUrl") || localStorage.getItem("loneeddy-gas-url") || "";
    if (configured) { state.endpoint=configured; $("endpoint-input").value=configured; setText("connection-message","Checking saved endpoint…"); loadStatus(configured); }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
