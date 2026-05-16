"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Nav from "@/components/Nav";
import OrgSelector, { Org } from "@/components/OrgSelector";
import { SourceBadge } from "@/components/Badge";
import { useToast } from "@/components/Toast";
import { GitMerge, CheckCircle2, XCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Batch { id: number; filename: string; source: string; row_count: number; }
interface ReconcileDetail {
  status: "matched" | "unmatched_source" | "unmatched_bank";
  source_id?: number; bank_id?: number;
  amount: number;
  source_desc?: string; bank_desc?: string;
}
interface ReconcileResult {
  matched_pairs: number;
  unmatched_source: number;
  unmatched_bank: number;
  match_rate: number;
  details: ReconcileDetail[];
}

export default function ReconcilePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [org, setOrg]               = useState<Org | null>(null);
  const [batches, setBatches]        = useState<Batch[]>([]);
  const [sourceId, setSourceId]      = useState<number | "">("");
  const [bankId, setBankId]          = useState<number | "">("");
  const [loading, setLoading]        = useState(false);
  const [result, setResult]          = useState<ReconcileResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => { if (!localStorage.getItem("smb_token")) router.push("/login"); }, []);

  useEffect(() => {
    if (!org) return;
    setBatches([]); setSourceId(""); setBankId(""); setResult(null);
    apiFetch<Batch[]>(`/transactions/batches/${org.id}`).then(setBatches);
  }, [org]);

  async function runReconcile() {
    if (!org || !sourceId || !bankId) return;
    if (sourceId === bankId) {
      toast("Source and bank batches must be different", "error");
      return;
    }
    setLoading(true); setResult(null);
    try {
      const r = await apiFetch<ReconcileResult>(
        `/transactions/reconcile/${org.id}?source_batch_id=${sourceId}&bank_batch_id=${bankId}`,
        { method: "POST" }
      );
      setResult(r);
      toast(`Reconciliation complete — ${r.matched_pairs} matches found`, "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Reconciliation failed", "error");
    } finally { setLoading(false); }
  }

  const sourceBatches = batches.filter(b => b.id !== Number(bankId));
  const bankBatches   = batches.filter(b => b.id !== Number(sourceId));

  const matched    = result?.details.filter(d => d.status === "matched")          ?? [];
  const unmatchedS = result?.details.filter(d => d.status === "unmatched_source") ?? [];
  const unmatchedB = result?.details.filter(d => d.status === "unmatched_bank")   ?? [];

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      <div className="mx-auto max-w-4xl px-4 md:px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">GST Reconciliation</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Match your Shopify payouts against bank statements to spot discrepancies
            </p>
          </div>
          <OrgSelector selected={org} onSelect={setOrg} />
        </div>

        {!org ? (
          <div className="text-center py-20 text-zinc-500">Select an organisation to reconcile.</div>
        ) : batches.length < 2 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center">
            <GitMerge size={36} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-zinc-400 mb-1">You need at least 2 upload batches to reconcile.</p>
            <p className="text-xs text-zinc-600">Upload your Shopify CSV and bank statement CSV separately, then come back here.</p>
          </div>
        ) : (
          <>
            {/* Batch selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Source (Shopify) */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3 font-semibold">Source (e.g. Shopify)</p>
                <div className="space-y-2">
                  {sourceBatches.map(b => (
                    <label key={b.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      sourceId === b.id
                        ? "border-emerald-600 bg-emerald-950/30"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}>
                      <input
                        type="radio"
                        name="source"
                        value={b.id}
                        checked={sourceId === b.id}
                        onChange={() => setSourceId(b.id)}
                        className="accent-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{b.filename}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{b.row_count} transactions</p>
                      </div>
                      <SourceBadge source={b.source} />
                    </label>
                  ))}
                </div>
              </div>

              {/* Bank */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3 font-semibold">Bank Statement</p>
                <div className="space-y-2">
                  {bankBatches.map(b => (
                    <label key={b.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                      bankId === b.id
                        ? "border-sky-600 bg-sky-950/30"
                        : "border-zinc-700 hover:border-zinc-500"
                    }`}>
                      <input
                        type="radio"
                        name="bank"
                        value={b.id}
                        checked={bankId === b.id}
                        onChange={() => setBankId(b.id)}
                        className="accent-sky-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{b.filename}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{b.row_count} transactions</p>
                      </div>
                      <SourceBadge source={b.source} />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={runReconcile}
              disabled={!sourceId || !bankId || loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-semibold py-3 transition-colors"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Running reconciliation…</>
                : <><GitMerge size={16} /> Run Reconciliation</>
              }
            </button>

            {/* Results */}
            {result && (
              <div className="mt-6 space-y-4">
                {/* Score cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-center">
                    <CheckCircle2 size={20} className="mx-auto text-emerald-400 mb-2" />
                    <p className="text-2xl font-bold text-emerald-400">{result.matched_pairs}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Matched</p>
                  </div>
                  <div className="rounded-xl border border-red-800 bg-red-950/30 p-4 text-center">
                    <XCircle size={20} className="mx-auto text-red-400 mb-2" />
                    <p className="text-2xl font-bold text-red-400">{result.unmatched_source}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Unmatched Source</p>
                  </div>
                  <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-center">
                    <AlertCircle size={20} className="mx-auto text-amber-400 mb-2" />
                    <p className="text-2xl font-bold text-amber-400">{result.unmatched_bank}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Unmatched Bank</p>
                  </div>
                </div>

                {/* Match rate bar */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Match Rate</span>
                    <span className={`text-xl font-bold ${result.match_rate >= 80 ? "text-emerald-400" : result.match_rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {result.match_rate}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div
                      className={`h-2 rounded-full transition-all ${result.match_rate >= 80 ? "bg-emerald-500" : result.match_rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${result.match_rate}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    {result.match_rate >= 80
                      ? "Excellent — most transactions reconciled successfully."
                      : result.match_rate >= 50
                      ? "Partial match — review unmatched items below."
                      : "Low match rate — check for date mismatches or different amount formats."}
                  </p>
                </div>

                {/* Detail toggle */}
                <button
                  onClick={() => setShowDetails(d => !d)}
                  className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  {showDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  {showDetails ? "Hide" : "Show"} match details ({result.details.length} rows)
                </button>

                {showDetails && (
                  <div className="rounded-xl border border-zinc-800 overflow-x-auto">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead className="border-b border-zinc-800 bg-zinc-900/60">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-zinc-400">Status</th>
                          <th className="px-4 py-2.5 text-left text-zinc-400">Source Description</th>
                          <th className="px-4 py-2.5 text-left text-zinc-400">Bank Description</th>
                          <th className="px-4 py-2.5 text-right text-zinc-400">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {matched.map((d, i) => (
                          <tr key={i} className="bg-emerald-950/10">
                            <td className="px-4 py-2"><span className="text-emerald-400">✓ Matched</span></td>
                            <td className="px-4 py-2 text-zinc-400 truncate max-w-[180px]">{d.source_desc || "—"}</td>
                            <td className="px-4 py-2 text-zinc-400 truncate max-w-[180px]">{d.bank_desc || "—"}</td>
                            <td className="px-4 py-2 text-right font-mono text-zinc-300">₹{Math.abs(d.amount).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                        {unmatchedS.map((d, i) => (
                          <tr key={`s${i}`} className="bg-red-950/10">
                            <td className="px-4 py-2"><span className="text-red-400">✗ No bank entry</span></td>
                            <td className="px-4 py-2 text-zinc-400">{d.source_desc || "—"}</td>
                            <td className="px-4 py-2 text-zinc-600">—</td>
                            <td className="px-4 py-2 text-right font-mono text-zinc-300">₹{Math.abs(d.amount).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                        {unmatchedB.map((d, i) => (
                          <tr key={`b${i}`} className="bg-amber-950/10">
                            <td className="px-4 py-2"><span className="text-amber-400">? Bank only</span></td>
                            <td className="px-4 py-2 text-zinc-600">—</td>
                            <td className="px-4 py-2 text-zinc-400">{d.bank_desc || "—"}</td>
                            <td className="px-4 py-2 text-right font-mono text-zinc-300">₹{Math.abs(d.amount).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
