"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, apiUpload } from "@/lib/api";
import Nav from "@/components/Nav";
import OrgSelector, { Org } from "@/components/OrgSelector";
import { SourceBadge } from "@/components/Badge";
import { useToast } from "@/components/Toast";
import {
  Upload, CheckCircle2, Loader2, FileText, ArrowRight,
  Clock, Hash, Trash2, Sparkles, AlertTriangle,
} from "lucide-react";

interface Batch { id: number; filename: string; source: string; row_count: number; }

const SOURCES = [
  { value: "shopify", label: "Shopify Payout",  hint: "Shopify Admin → Finances → Payouts",           color: "#34d399" },
  { value: "bank",    label: "Bank Statement",   hint: "Net banking portal CSV download",               color: "#60a5fa" },
  { value: "manual",  label: "Manual / Other",   hint: "Any CSV with amount column",                    color: "#a78bfa" },
];

const EXPECTED_COLS = [
  { col: "Amount",      kw: "amount · total · net · price", req: true  },
  { col: "Date",        kw: "date · posted · txn_date",     req: false },
  { col: "Description", kw: "description · narration",      req: false },
];

export default function UploadPage() {
  const router    = useRouter();
  const fileRef   = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [org,      setOrg]      = useState<Org | null>(null);
  const [batches,  setBatches]  = useState<Batch[]>([]);
  const [source,   setSource]   = useState("shopify");
  const [file,     setFile]     = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [success,  setSuccess]  = useState<Batch | null>(null);

  useEffect(() => { if (!localStorage.getItem("smb_token")) router.push("/login"); }, []);
  useEffect(() => { if (!org) return; setBatches([]); setSuccess(null); loadBatches(org.id); }, [org]);

  async function loadBatches(orgId: number) {
    try { setBatches(await apiFetch<Batch[]>(`/transactions/batches/${orgId}`)); }
    catch { setBatches([]); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) setFile(f);
    else toast("Please drop a .csv file", "error");
  }

  async function handleUpload() {
    if (!file || !org) return;
    setUploading(true); setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("source", source);
      const batch = await apiUpload<Batch>(`/transactions/upload/${org.id}`, fd);
      setSuccess(batch); setFile(null);
      toast(`${batch.row_count} transactions imported`, "success");
      loadBatches(org.id);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally { setUploading(false); }
  }

  async function handleDelete(batch: Batch) {
    if (!org || deletingId) return;
    if (!confirm(`Delete "${batch.filename}" and its ${batch.row_count} transactions? This cannot be undone.`)) return;
    setDeletingId(batch.id);
    try {
      await apiFetch(`/transactions/batches/${org.id}/${batch.id}`, { method: "DELETE" });
      setBatches(prev => prev.filter(b => b.id !== batch.id));
      setSuccess(prev => prev?.id === batch.id ? null : prev);
      toast("Deleted", "success");
    } catch (err: unknown) { toast(err instanceof Error ? err.message : "Delete failed", "error"); }
    finally { setDeletingId(null); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#f8fafc", fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>
      <Nav />

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 24px 60px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 36 }}>
          <div>
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 36, color: "#f8fafc", margin: "0 0 6px", lineHeight: 1 }}>
              Upload <em style={{ color: "#475569", fontStyle: "italic" }}>CSV</em>
            </h1>
            <p style={{ fontSize: 13, color: "#475569" }}>Shopify payouts, bank statements, or any CSV with an amount column</p>
          </div>
          <OrgSelector selected={org} onSelect={setOrg} />
        </div>

        {!org ? (
          <div style={{ textAlign: "center", padding: "80px 24px", borderRadius: 16, border: "1px dashed rgba(30,41,59,0.8)", color: "#334155", fontSize: 14 }}>
            Select an organisation above to begin uploading.
          </div>
        ) : (
          <>
            {/* Source selector */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#475569", marginBottom: 10 }}>
                Statement Type
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {SOURCES.map(s => (
                  <button key={s.value} onClick={() => setSource(s.value)} style={{
                    textAlign: "left", padding: "14px 14px",
                    borderRadius: 12, border: `1px solid ${source === s.value ? s.color + "55" : "rgba(30,41,59,0.8)"}`,
                    background: source === s.value ? s.color + "0d" : "rgba(15,23,42,0.4)",
                    cursor: "pointer", transition: "all 150ms",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: source === s.value ? s.color : "#94a3b8", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "#334155", lineHeight: 1.4 }}>{s.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                cursor: "pointer", borderRadius: 16, padding: "48px 24px", textAlign: "center",
                border: `2px dashed ${dragging ? "#34d399" : file ? "#34d39955" : "rgba(30,41,59,0.8)"}`,
                background: dragging ? "rgba(52,211,153,0.05)" : file ? "rgba(52,211,153,0.03)" : "rgba(15,23,42,0.3)",
                transition: "all 150ms", marginBottom: 16,
              }}>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
              {file ? (
                <>
                  <FileText size={36} style={{ color: "#34d399", margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "#475569" }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
                </>
              ) : (
                <>
                  <div style={{ width: 56, height: 56, borderRadius: 16, border: "1px solid rgba(30,41,59,0.8)", background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Upload size={22} style={{ color: "#334155" }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#94a3b8", marginBottom: 6 }}>Drop your CSV here</div>
                  <div style={{ fontSize: 12, color: "#334155" }}>or click to browse · .csv files only</div>
                </>
              )}
            </div>

            {/* Upload button */}
            <button onClick={handleUpload} disabled={!file || uploading} style={{
              width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: file ? "pointer" : "not-allowed",
              background: file ? "#f1f5f9" : "rgba(30,41,59,0.6)", color: file ? "#0f172a" : "#334155",
              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 150ms", marginBottom: 24, opacity: !file || uploading ? 0.6 : 1,
            }}>
              {uploading ? <><Loader2 size={16} className="animate-spin" />Analysing…</> : <><Sparkles size={16} />Upload & Analyse</>}
            </button>

            {/* Success state */}
            {success && (
              <div style={{
                padding: 20, borderRadius: 14, marginBottom: 24,
                border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#34d399", fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
                  <CheckCircle2 size={16} /> Imported successfully!
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {[["File", success.filename], ["Rows", success.row_count.toLocaleString("en-IN")]].map(([k, v]) => (
                    <div key={k} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(15,23,42,0.5)" }}>
                      <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 13, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#34d399", textDecoration: "none", fontWeight: 500 }}>
                    View Dashboard <ArrowRight size={13} />
                  </Link>
                  <Link href="/reconcile" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#60a5fa", textDecoration: "none", fontWeight: 500 }}>
                    Reconcile <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}

            {/* Format hint */}
            <div style={{ borderRadius: 14, border: "1px solid rgba(30,41,59,0.8)", background: "rgba(15,23,42,0.3)", padding: 20, marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
                <AlertTriangle size={13} style={{ color: "#fbbf24" }} />
                <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fbbf24" }}>Expected CSV Format</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                {EXPECTED_COLS.map(r => (
                  <div key={r.col} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(15,23,42,0.6)" }}>
                    <div style={{ fontSize: 12, color: r.req ? "#34d399" : "#94a3b8", fontWeight: 600, marginBottom: 3 }}>
                      {r.col} {r.req && <span style={{ color: "#fb7185" }}>*</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", fontFamily: "'JetBrains Mono', monospace" }}>{r.kw}</div>
                  </div>
                ))}
              </div>
              <pre style={{ borderRadius: 8, border: "1px solid rgba(30,41,59,0.8)", background: "#0a0e1a", padding: "12px 14px", fontSize: 11, color: "#64748b", overflowX: "auto", fontFamily: "'JetBrains Mono', monospace", margin: 0, lineHeight: 1.7 }}>{`date,description,amount,currency
2024-03-01,Google Ads Campaign,-15000,INR
2024-03-02,Shopify Payout,85000,INR
2024-03-03,Delhivery Courier,-3200,INR`}</pre>
            </div>

            {/* Upload history */}
            {batches.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                  <Clock size={13} style={{ color: "#475569" }} />
                  <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569" }}>Upload History</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#334155", fontFamily: "'JetBrains Mono', monospace" }}>{batches.length} file{batches.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {batches.map(b => (
                    <div key={b.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 10,
                      border: "1px solid rgba(30,41,59,0.8)", background: "rgba(15,23,42,0.3)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <FileText size={13} style={{ color: "#334155", flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.filename}</span>
                        <SourceBadge source={b.source} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ fontSize: 11, color: "#334155", display: "flex", alignItems: "center", gap: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                          <Hash size={10} />{b.row_count.toLocaleString("en-IN")}
                        </span>
                        <button
                          onClick={() => handleDelete(b)}
                          disabled={deletingId !== null}
                          style={{
                            width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(30,41,59,0.8)",
                            background: "transparent", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#475569", transition: "all 150ms",
                          }}
                          onMouseEnter={e => { (e.currentTarget.style.color = "#fb7185"); (e.currentTarget.style.borderColor = "rgba(251,113,133,0.4)"); (e.currentTarget.style.background = "rgba(251,113,133,0.08)"); }}
                          onMouseLeave={e => { (e.currentTarget.style.color = "#475569"); (e.currentTarget.style.borderColor = "rgba(30,41,59,0.8)"); (e.currentTarget.style.background = "transparent"); }}
                        >
                          {deletingId === b.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}    if (!org) return;
    setBatches([]); setSuccess(null);
    loadBatches(org.id);
  }, [org]);

  async function loadBatches(orgId: number) {
    try {
      const data = await apiFetch<Batch[]>(`/transactions/batches/${orgId}`);
      setBatches(data);
    } catch {
      setBatches([]);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) setFile(f);
    else toast("Please drop a .csv file", "error");
  }

  async function handleUpload() {
    if (!file || !org) return;
    setUploading(true); setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("source", source);
      const batch = await apiUpload<Batch>(`/transactions/upload/${org.id}`, fd);
      setSuccess(batch);
      setFile(null);
      toast(`${batch.row_count} transactions imported`, "success");
      loadBatches(org.id);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally { setUploading(false); }
  }

  async function handleDeleteBatch(batch: Batch) {
    if (!org || deletingBatchId) return;
    const confirmed = window.confirm(
      `Delete "${batch.filename}" and its ${batch.row_count} imported transactions? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingBatchId(batch.id);
    try {
      await apiFetch<{ ok: boolean; deleted_batch_id: number }>(
        `/transactions/batches/${org.id}/${batch.id}`,
        { method: "DELETE" }
      );
      setBatches(prev => prev.filter(b => b.id !== batch.id));
      setSuccess(prev => prev?.id === batch.id ? null : prev);
      toast("Uploaded file deleted", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeletingBatchId(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Upload CSV</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Shopify payouts, bank statements, or any CSV with an amount column</p>
          </div>
          <OrgSelector selected={org} onSelect={setOrg} />
        </div>

        {!org ? (
          <div className="text-center py-20 text-zinc-500">Select an organisation to upload transactions.</div>
        ) : (
          <>
            {/* Source type */}
            <div className="mb-5">
              <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-2 font-medium">Statement Type</label>
              <div className="grid grid-cols-3 gap-2">
                {SOURCES.map(s => (
                  <button key={s.value} onClick={() => setSource(s.value)}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${source === s.value ? "border-emerald-600 bg-emerald-950/30" : "border-zinc-700 hover:border-zinc-500"}`}>
                    <p className={`text-sm font-medium ${source === s.value ? "text-emerald-400" : "text-zinc-300"}`}>{s.label}</p>
                    <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{s.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onDrop={handleDrop} onClick={() => fileRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors mb-4 ${dragging ? "border-emerald-500 bg-emerald-950/20" : file ? "border-emerald-700 bg-emerald-950/10" : "border-zinc-700 hover:border-zinc-500"}`}>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
              {file ? (
                <><FileText size={32} className="mx-auto text-emerald-400 mb-3" />
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-zinc-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p></>
              ) : (
                <><Upload size={32} className="mx-auto text-zinc-600 mb-3" />
                <p className="text-zinc-300 font-medium">Drop your CSV here</p>
                <p className="text-zinc-600 text-xs mt-1">or click to browse files</p></>
              )}
            </div>

            <button onClick={handleUpload} disabled={!file || uploading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-semibold py-3 transition-colors">
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <><Upload size={16} /> Upload & Analyse</>}
            </button>

            {success && (
              <div className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/30 p-5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-3">
                  <CheckCircle2 size={16} /> Imported successfully!
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 mb-4">
                  <div><span className="text-zinc-600">File: </span>{success.filename}</div>
                  <div><span className="text-zinc-600">Rows: </span>{success.row_count}</div>
                </div>
                <div className="flex gap-4">
                  <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-emerald-400 hover:underline">
                    Dashboard <ArrowRight size={11} />
                  </Link>
                  <Link href="/reconcile" className="flex items-center gap-1.5 text-xs text-sky-400 hover:underline">
                    Reconcile <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            )}

            {/* CSV format hint */}
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Expected CSV Format</h3>
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                {[
                  { col: "Amount (required)", kw: "amount · total · net · price" },
                  { col: "Date",              kw: "date · posted · txn_date" },
                  { col: "Description",       kw: "description · narration · merchant" },
                ].map(r => (
                  <div key={r.col} className="rounded bg-zinc-900 p-2.5">
                    <p className="text-zinc-300 font-medium mb-1">{r.col}</p>
                    <p className="text-zinc-600">{r.kw}</p>
                  </div>
                ))}
              </div>
              <pre className="rounded bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-400 overflow-x-auto font-mono">{`date,description,amount,currency
2024-03-01,Google Ads Campaign,-15000,INR
2024-03-02,Shopify Payout Settlement,85000,INR
2024-03-03,Delhivery Courier,-3200,INR`}</pre>
            </div>

            {/* Batch history */}
            {batches.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                  <Clock size={13} className="text-zinc-500" /> Upload History
                </h3>
                <div className="space-y-2">
                  {batches.map(b => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText size={13} className="text-zinc-500 shrink-0" />
                        <span className="text-sm text-zinc-300 truncate">{b.filename}</span>
                        <SourceBadge source={b.source} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Hash size={11} />{b.row_count}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(b)}
                          disabled={deletingBatchId !== null}
                          title={`Delete ${b.filename}`}
                          aria-label={`Delete ${b.filename}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 text-zinc-500 transition-colors hover:border-red-700 hover:bg-red-950/30 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingBatchId === b.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} />
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
