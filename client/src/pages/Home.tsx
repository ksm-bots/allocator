// Editorial Control Room: asymmetric operations workspace, warm paper surfaces, chartreuse signal accents.
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Gauge,
  Info,
  LayoutDashboard,
  Loader2,
  Menu,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

type Seller = {
  id: number;
  name: string;
  qty: number;
  right3Limit: string;
  notes: string;
};

type PersonResult = Seller & {
  assignedQty: number;
  uniqueQty: number;
  repeatQty: number;
  preview: string[];
};

type AllocationResult = {
  batchId: string;
  sheetName: string;
  totalRequested: number;
  totalUniqueStock: number;
  uniqueUsed: number;
  repeatTotal: number;
  leftoverQty: number;
  people: PersonResult[];
};

const GAS_PLACEHOLDER = "PASTE_YOUR_GAS_EXEC_URL_HERE";
const HERO_TEXTURE = "/manus-storage/loneeddy-hero-reference_9db18123.png";
const MARK = "/manus-storage/loneeddy-mark_ffcbd419.png";

const STARTERS: Seller[] = [
  { id: 1, name: "PT", qty: 1200, right3Limit: "2", notes: "Primary pool" },
  { id: 2, name: "HOM", qty: 500, right3Limit: "1", notes: "014, 015, 017, 026, 037" },
  { id: 3, name: "MF440", qty: 440, right3Limit: "1", notes: "040, 087, 146, 227, 344" },
  { id: 4, name: "MF70", qty: 70, right3Limit: "1", notes: "" },
  { id: 5, name: "MF50a", qty: 50, right3Limit: "1", notes: "" },
];

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function jsonp(baseUrl: string, params: Record<string, string>) {
  return new Promise<any>((resolve, reject) => {
    const callback = `__loneeddy_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Apps Script did not respond within 45 seconds."));
    }, 45000);

    const cleanup = () => {
      window.clearTimeout(timer);
      delete (window as any)[callback];
      script.remove();
    };

    (window as any)[callback] = (data: any) => {
      cleanup();
      data?.ok ? resolve(data) : reject(new Error(data?.error || "Unknown Apps Script error."));
    };

    script.src = `${baseUrl}?${new URLSearchParams({ ...params, callback }).toString()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to connect to the Apps Script endpoint."));
    };
    document.body.appendChild(script);
  });
}

function buildDemoResult(sellers: Seller[], stock: number): AllocationResult {
  let pointer = 0;
  const people = sellers.map((seller, sellerIndex) => {
    const preview = Array.from({ length: Math.min(seller.qty, 18) }, (_, index) => {
      const raw = (100000 + ((pointer + index) * 137 + sellerIndex * 1031) % 899999).toString();
      return raw.padStart(6, "0");
    });
    pointer += seller.qty;
    const uniqueQty = Math.min(seller.qty, Math.max(0, stock - (pointer - seller.qty)));
    return {
      ...seller,
      assignedQty: seller.qty,
      uniqueQty,
      repeatQty: seller.qty - uniqueQty,
      preview,
    };
  });

  return {
    batchId: `DEMO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-A1`,
    sheetName: "Distribution",
    totalRequested: sellers.reduce((sum, seller) => sum + seller.qty, 0),
    totalUniqueStock: stock,
    uniqueUsed: Math.min(stock, sellers.reduce((sum, seller) => sum + seller.qty, 0)),
    repeatTotal: Math.max(0, sellers.reduce((sum, seller) => sum + seller.qty, 0) - stock),
    leftoverQty: Math.max(0, stock - sellers.reduce((sum, seller) => sum + seller.qty, 0)),
    people,
  };
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "signal" | "warning" | "danger";
  icon: React.ReactNode;
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <div className="metric-topline">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function StatusPill({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span className={`status-pill ${connected ? "is-connected" : "is-demo"}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

export default function Home() {
  const [sellers, setSellers] = useState<Seller[]>(STARTERS);
  const [stockTotal, setStockTotal] = useState(6240);
  const [groups, setGroups] = useState(20);
  const [largestGroup, setLargestGroup] = useState(31);
  const [endpoint, setEndpoint] = useState("");
  const [endpointDraft, setEndpointDraft] = useState("");
  const [connectionMessage, setConnectionMessage] = useState("Demo stock loaded for review");
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AllocationResult | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [repeat, setRepeat] = useState("1");
  const [defaultLimit, setDefaultLimit] = useState("1");
  const [includeLeftover, setIncludeLeftover] = useState(true);
  const [sheetName, setSheetName] = useState("Distribution");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const demand = useMemo(() => sellers.reduce((sum, seller) => sum + Number(seller.qty || 0), 0), [sellers]);
  const remaining = stockTotal - demand;
  const demandPercent = stockTotal ? Math.min(100, Math.round((demand / stockTotal) * 100)) : 0;
  const allocationReady = sellers.length > 0 && sellers.every((seller) => seller.name.trim() && seller.qty > 0);
  const status = !stockTotal ? "Waiting" : demand === 0 ? "Ready" : remaining >= 0 ? "Ready to run" : "Repeats required";

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const configuredEndpoint = query.get("gasUrl") || window.localStorage.getItem("loneeddy-gas-url");
    if (configuredEndpoint) {
      setEndpoint(configuredEndpoint);
      setEndpointDraft(configuredEndpoint);
      setIsConnected(true);
      setConnectionMessage("Endpoint loaded from URL");
    }
  }, []);

  const updateSeller = (id: number, patch: Partial<Seller>) => {
    setSellers((current) => current.map((seller) => (seller.id === id ? { ...seller, ...patch } : seller)));
    setResult(null);
  };

  const addSeller = () => {
    setSellers((current) => [
      ...current,
      { id: Date.now(), name: "", qty: 0, right3Limit: defaultLimit, notes: "" },
    ]);
    window.setTimeout(() => document.getElementById("seller-config")?.scrollIntoView({ behavior: "smooth", block: "center" }), 20);
  };

  const removeSeller = (id: number) => {
    setSellers((current) => current.filter((seller) => seller.id !== id));
    setResult(null);
  };

  const loadStatus = async (nextEndpoint = endpoint) => {
    if (!nextEndpoint || nextEndpoint.includes(GAS_PLACEHOLDER)) {
      setIsConnected(false);
      setStockTotal(6240);
      setGroups(20);
      setLargestGroup(31);
      setConnectionMessage("Demo stock loaded for review");
      return;
    }

    try {
      const data = await jsonp(nextEndpoint, { action: "status" });
      setIsConnected(true);
      setStockTotal(data.totalTickets || 0);
      setGroups(data.totalGroups || 0);
      setLargestGroup(data.largestGroup || 0);
      setConnectionMessage("Connected to Group!A:J");
      setMessage({ text: "Stock refreshed from the live Apps Script source.", tone: "ok" });
    } catch (error) {
      setIsConnected(false);
      setConnectionMessage("Could not reach Apps Script");
      setMessage({ text: error instanceof Error ? error.message : "Could not load source status.", tone: "error" });
    }
  };

  const connectEndpoint = () => {
    const next = endpointDraft.trim();
    setEndpoint(next);
    if (next) window.localStorage.setItem("loneeddy-gas-url", next);
    else window.localStorage.removeItem("loneeddy-gas-url");
    void loadStatus(next);
  };

  const allocate = async () => {
    if (!sellers.length) {
      setMessage({ text: "Add at least one seller before running an allocation.", tone: "error" });
      return;
    }
    const invalid = sellers.find((seller) => !seller.name.trim() || seller.qty < 1);
    if (invalid) {
      setMessage({ text: `${invalid.name || "Every seller"} needs a name and a quota of at least 1.`, tone: "error" });
      return;
    }

    setIsRunning(true);
    setMessage(null);
    try {
      if (!endpoint || endpoint.includes(GAS_PLACEHOLDER)) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        const demo = buildDemoResult(sellers, stockTotal);
        setResult(demo);
        setMessage({ text: `Demo allocation ready. Connect Apps Script when you are ready to save to Google Sheets.`, tone: "ok" });
      } else {
        const data = await jsonp(endpoint, {
          action: "allocateBatch",
          people: JSON.stringify(sellers.map(({ name, qty, right3Limit }) => ({ name, qty, right3Limit: Number(right3Limit) || 0 }))),
          repeat,
          includeLeftover: includeLeftover ? "1" : "0",
          sheetName: sheetName.trim() || "Distribution",
        });
        setResult(data);
        setMessage({ text: `Saved to ${data.sheetName || sheetName}. Batch ${data.batchId}.`, tone: "ok" });
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Allocation failed.", tone: "error" });
    } finally {
      setIsRunning(false);
    }
  };

  const resetAll = () => {
    if (!window.confirm("Reset sellers and the current allocation preview?")) return;
    setSellers(STARTERS);
    setResult(null);
    setMessage(null);
  };

  const downloadCSV = () => {
    if (!result) {
      setMessage({ text: "Run an allocation before exporting a CSV.", tone: "error" });
      return;
    }
    const rows = [["Seller", "Requested", "Unique", "Repeated", "Right-3 limit"], ...result.people.map((person) => [person.name, person.qty, person.uniqueQty, person.repeatQty, person.right3Limit === "0" ? "AUTO" : person.right3Limit])];
    rows.push(["Leftover", result.leftoverQty, "", "", ""]);
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `loneeddy-allocation-${result.batchId || "result"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const jumpTo = (id: string) => {
    setMobileNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const statusTone = !stockTotal || demand === 0 ? "neutral" : remaining >= 0 ? "signal" : "danger";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileNavOpen((open) => !open)}>
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <button className="brand-lockup" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">
            <span className="brand-mark"><img src={MARK} alt="" /></span>
            <span>
              <strong>LoneEddy</strong>
              <small>Allocator / desk 01</small>
            </span>
          </button>
          <nav className={`main-nav ${mobileNavOpen ? "is-open" : ""}`} aria-label="Primary navigation">
            <button className="nav-link is-active" onClick={() => jumpTo("overview")}><LayoutDashboard size={15} /> Overview</button>
            <button className="nav-link" onClick={() => jumpTo("seller-config")}><Upload size={15} /> Configure</button>
            <button className="nav-link" onClick={() => jumpTo("allocation-preview")}><BarChart3 size={15} /> Results</button>
            <button className="nav-link" onClick={() => jumpTo("rules")}><ShieldCheck size={15} /> Rules</button>
          </nav>
          <div className="topbar-actions">
            <StatusPill connected={isConnected} label={isConnected ? "Live source" : "Review mode"} />
            <button className="button button-ghost" onClick={resetAll}><RotateCcw size={15} /> Reset</button>
            <button className="button button-signal" onClick={allocate} disabled={isRunning || !allocationReady}>
              {isRunning ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
              {isRunning ? "Running" : "Run allocation"}
            </button>
          </div>
        </div>
      </header>

      <main className="main-layout" id="overview">
        <aside className="rail">
          <div className="rail-intro">
            <span className="eyebrow">Allocation control desk</span>
            <h1>Balance the next distribution before it leaves the desk.</h1>
            <p>Fair seller-by-seller rounds, exact Right-3 limits, and a second balance pass across Right-2 buckets.</p>
          </div>
          <div className="rail-flow">
            <div className="flow-heading"><span className="eyebrow">Run sequence</span><span className="flow-count">02 / 02</span></div>
            <button className="flow-step is-done" onClick={() => jumpTo("seller-config")}>
              <span className="step-number"><Check size={13} /></span>
              <span><strong>Configure sellers</strong><small>{sellers.length} sellers / {formatNumber(demand)} requested</small></span>
              <ChevronRight size={15} />
            </button>
            <button className={`flow-step ${result ? "is-done" : "is-current"}`} onClick={() => jumpTo("allocation-preview")}>
              <span className="step-number">{result ? <Check size={13} /> : "2"}</span>
              <span><strong>Review allocation</strong><small>{result ? "Preview ready to inspect" : "Waiting for a run"}</small></span>
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="rail-source">
            <div className="source-topline"><span className="eyebrow">Source</span><Activity size={15} /></div>
            <strong>{isConnected ? "Google Sheet / Group" : "Demo stock / Group"}</strong>
            <p>{connectionMessage}</p>
            <div className="source-line"><span>Valid tickets</span><b>{formatNumber(stockTotal)}</b></div>
            <div className="source-line"><span>Unique groups</span><b>{formatNumber(groups)}</b></div>
            <button className="text-button" onClick={() => jumpTo("connection")}><Settings2 size={14} /> Configure source <ArrowUpRight size={13} /></button>
          </div>
          <div className="rail-footer"><span className="signal-glyph">⌁</span><span>Fairness is a feature, not a footnote.</span></div>
        </aside>

        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">Today / allocation board</span>
              <h2>One clear run from source to sheet.</h2>
            </div>
            <div className="heading-meta"><span>Last reviewed</span><strong>13 Aug 2026 · 12:34</strong></div>
          </div>

          <section className="metric-grid" aria-label="Allocation overview">
            <Metric label="Available stock" value={formatNumber(stockTotal)} detail="Valid unique 6-digit tickets" tone="neutral" icon={<Gauge size={16} />} />
            <Metric label="Total demand" value={formatNumber(demand)} detail={`Across ${sellers.length} configured sellers`} tone="signal" icon={<Zap size={16} />} />
            <Metric label="Remaining capacity" value={`${remaining >= 0 ? "+" : "−"}${formatNumber(Math.abs(remaining))}`} detail={remaining >= 0 ? "Unique stock is enough" : "Repeat tickets will be needed"} tone={remaining >= 0 ? "warning" : "danger"} icon={remaining >= 0 ? <ArrowUpRight size={16} /> : <Info size={16} />} />
            <Metric label="Run status" value={status} detail={result ? `Batch ${result.batchId}` : "Configure sellers, then run"} tone={statusTone} icon={result ? <Check size={16} /> : <Activity size={16} />} />
          </section>

          <section className="hero-note" style={{ backgroundImage: `linear-gradient(90deg, rgba(33,35,29,.96) 0%, rgba(33,35,29,.76) 49%, rgba(33,35,29,.24) 100%), url(${HERO_TEXTURE})` }}>
            <div>
              <span className="eyebrow eyebrow-light">Why this view is better</span>
              <h3>The important decision is visible before the first ticket moves.</h3>
              <p>Demand, stock, repeat risk, and source readiness now live in the same visual field. Less hunting. More confident runs.</p>
            </div>
            <div className="hero-stamp"><Sparkles size={16} /><span>Signal-led<br />operations</span></div>
          </section>

          <section className="main-panels">
            <article className="panel seller-panel" id="seller-config">
              <div className="panel-header">
                <div className="panel-title"><span className="panel-index">01</span><div><span className="eyebrow">Input layer</span><h3>Seller configuration</h3></div></div>
                <button className="button button-outline" onClick={addSeller}><Plus size={15} /> Add seller</button>
              </div>
              <div className="demand-strip">
                <div><span>Demand load</span><strong>{formatNumber(demand)} / {formatNumber(stockTotal)}</strong></div>
                <div className="demand-progress"><span style={{ width: `${demandPercent}%` }} /></div>
                <span className="demand-percent">{demandPercent}%</span>
              </div>
              <div className="seller-headings"><span>Seller</span><span>Quota</span><span>Right-3 limit</span><span>Notes</span><span /></div>
              <div className="seller-list">
                {sellers.map((seller, index) => (
                  <div className="seller-row" key={seller.id}>
                    <div className="seller-name-cell"><span className="seller-index">{String(index + 1).padStart(2, "0")}</span><input value={seller.name} onChange={(event) => updateSeller(seller.id, { name: event.target.value })} placeholder="Seller name" aria-label={`Seller ${index + 1} name`} /></div>
                    <input className="numeric-input" type="number" min="1" value={seller.qty || ""} onChange={(event) => updateSeller(seller.id, { qty: Number(event.target.value) })} placeholder="0" aria-label={`${seller.name || "Seller"} quota`} />
                    <select value={seller.right3Limit} onChange={(event) => updateSeller(seller.id, { right3Limit: event.target.value })} aria-label={`${seller.name || "Seller"} Right-3 limit`}>
                      <option value="1">1 same</option><option value="2">2 same</option><option value="3">3 same</option><option value="4">4 same</option><option value="5">5 same</option><option value="0">Auto</option>
                    </select>
                    <input value={seller.notes} onChange={(event) => updateSeller(seller.id, { notes: event.target.value })} placeholder="Optional note" aria-label={`${seller.name || "Seller"} notes`} />
                    <button className="icon-button danger-icon" onClick={() => removeSeller(seller.id)} aria-label={`Remove ${seller.name || "seller"}`}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
              <div className="seller-foot"><span><Check size={14} /> Unique tickets are used first.</span><span>{sellers.length} active sellers</span></div>
            </article>

            <article className="panel preview-panel" id="allocation-preview">
              <div className="panel-header">
                <div className="panel-title"><span className="panel-index">02</span><div><span className="eyebrow">Output layer</span><h3>Allocation preview</h3></div></div>
                <div className="panel-actions"><button className="icon-button" onClick={downloadCSV} aria-label="Export allocation CSV"><Download size={15} /></button><button className="icon-button" onClick={() => window.print()} aria-label="Print allocation"><FileText size={15} /></button></div>
              </div>
              {!result ? (
                <div className="empty-preview">
                  <div className="empty-orbit"><span /><span /><span /></div>
                  <span className="eyebrow">No run in this desk</span>
                  <h4>The result surface is ready.</h4>
                  <p>Review the seller rows, then run a fair allocation to see ticket previews and repeat exposure.</p>
                  <button className="button button-dark" onClick={allocate} disabled={isRunning || !allocationReady}>{isRunning ? <Loader2 size={15} className="spin" /> : <Play size={15} />} {isRunning ? "Running allocation" : "Run allocation"}</button>
                </div>
              ) : (
                <div className="result-content">
                  <div className="result-summary">
                    <div><span>Requested</span><strong>{formatNumber(result.totalRequested)}</strong></div><div><span>Unique used</span><strong>{formatNumber(result.uniqueUsed)}</strong></div><div><span>Repeated</span><strong className={result.repeatTotal ? "is-alert" : ""}>{formatNumber(result.repeatTotal)}</strong></div><div><span>Leftover</span><strong>{formatNumber(result.leftoverQty)}</strong></div>
                  </div>
                  <div className="result-table-wrap"><table><thead><tr>{result.people.map((person) => <th key={person.id}>{person.name}<small>{formatNumber(person.qty)} requested</small></th>)}{includeLeftover && <th>Leftover<small>{formatNumber(result.leftoverQty)} unassigned</small></th>}</tr></thead><tbody><tr>{result.people.map((person) => <td key={person.id}><div className="ticket-stack">{person.preview.map((ticket) => <span key={ticket} className="ticket-chip">{ticket}</span>)}{person.assignedQty > person.preview.length && <span className="more-tickets">+ {formatNumber(person.assignedQty - person.preview.length)} more</span>}</div><div className="cell-foot"><span><b>{formatNumber(person.uniqueQty)}</b> unique</span><span className={person.repeatQty ? "is-alert" : ""}><b>{formatNumber(person.repeatQty)}</b> repeats</span></div></td>)}{includeLeftover && <td><div className="leftover-cell"><ArrowDownToLine size={17} /><strong>{formatNumber(result.leftoverQty)}</strong><span>tickets held back</span></div></td>}</tr></tbody></table></div>
                  <div className="result-rule"><ShieldCheck size={15} /><span>Fair rounds first · exact Right-3 limits honored · Right-3 and Right-2 buckets balanced together.</span></div>
                </div>
              )}
              {message && <div className={`inline-message ${message.tone}`}><span>{message.tone === "ok" ? <Check size={15} /> : <Info size={15} />}</span>{message.text}</div>}
            </article>
          </section>

          <section className="evidence-shelf" id="rules">
            <article className="evidence-card logic-card">
              <div className="evidence-heading"><span className="eyebrow">Allocation logic</span><CircleHelp size={16} /></div>
              <h3>Fairness you can explain.</h3>
              <div className="logic-list"><div><span>01</span><p><b>Read</b> only valid 6-digit numbers from Group!A:J.</p></div><div><span>02</span><p><b>Round-robin</b> through sellers so one quota never fills first.</p></div><div><span>03</span><p><b>Balance</b> both Right-3 0xx–9xx and Right-2 0x–9x buckets.</p></div><div><span>04</span><p><b>Repeat</b> only when unique stock cannot cover demand.</p></div></div>
            </article>
            <article className="evidence-card illustration-card"><div className="technical-flow" aria-hidden="true"><span className="flow-arc flow-arc-one" /><span className="flow-arc flow-arc-two" /><span className="flow-arc flow-arc-three" /><span className="flow-trace" /></div><div className="illustration-caption"><span className="eyebrow">The principle</span><strong>Move signal, not noise.</strong><p>Small decisions stay visible all the way to the sheet.</p></div></article>
            <article className="evidence-card source-card" id="connection">
              <div className="evidence-heading"><span className="eyebrow">Source & settings</span><Settings2 size={16} /></div>
              <div className="source-settings"><label>Frontend → Apps Script endpoint<input value={endpointDraft} onChange={(event) => setEndpointDraft(event.target.value)} placeholder="Paste your /exec URL for live mode" /></label><p className="source-help">Paste the deployed Apps Script web-app URL ending in <code>/exec</code>. The backend reads and writes the configured Google Sheet.</p><button className="button button-dark" onClick={connectEndpoint}><Zap size={15} /> {isConnected ? "Refresh source" : "Connect source"}</button></div>
              <div className="settings-divider" />
              <label className="setting-row"><span>Default Right-3 limit</span><select value={defaultLimit} onChange={(event) => setDefaultLimit(event.target.value)}><option value="1">1 same suffix</option><option value="2">2 same suffixes</option><option value="0">Auto / no limit</option></select></label>
              <label className="setting-row"><span>Handle shortage</span><select value={repeat} onChange={(event) => setRepeat(event.target.value)}><option value="1">Repeat tickets</option><option value="0">Stop with error</option></select></label>
              <label className="setting-row"><span>Result sheet</span><input value={sheetName} onChange={(event) => setSheetName(event.target.value)} /></label>
              <label className="check-row"><input type="checkbox" checked={includeLeftover} onChange={(event) => setIncludeLeftover(event.target.checked)} /><span>Create leftover column</span></label>
            </article>
          </section>

          <section className="bottom-signal">
            <span className="signal-trace" aria-hidden="true" />
            <div><span className="eyebrow">Source summary</span><strong>{formatNumber(groups)} unique Right-3 groups detected</strong></div>
            <div className="signal-stat"><span>Largest group</span><b>{largestGroup}</b></div><div className="signal-stat"><span>Mode</span><b>R3 + R2</b></div><div className="signal-stat"><span>Output</span><b>{sheetName}</b></div>
          </section>

          <footer className="page-footer"><span><img src={MARK} alt="" /> LoneEddy Allocator</span><span>Designed for fair, explainable distribution.</span><span>Build v7 · desk 01</span></footer>
        </section>
      </main>
    </div>
  );
}
