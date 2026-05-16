"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiDownload } from "@/lib/api";
import Nav from "@/components/Nav";
import OrgSelector, { Org } from "@/components/OrgSelector";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import {
  TrendingUp, TrendingDown, Minus, FileText, Receipt,
  Mail, Loader2, RefreshCw, Sparkles, FileSpreadsheet,
} from "lucide-react";

const MonthlyTrendChart = dynamic(
  () => import("@/components/ExpenseChart").then(m => ({ default: m.MonthlyTrendChart })),
  { ssr: false, loading: () => <div className="h-[280px] flex items-center justify-center"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div> }
);

interface CategoryTotal { category: string; total: number; count: number; percentage: number; }
interface MonthlyPoint  { month: string; month_label: string; income: number; expenses: number; net: number; }
interface Summary {
  period_label: string;
  total_income: number; total_expenses: number; net_cashflow: number;
  transaction_count: number;
  category_totals: CategoryTotal[];
  monthly_trend: MonthlyPoint[];
  insights: string[];
}
interface GSTLine { category: string; taxable_amount: number; gst_amount: number; cgst: number; sgst: number; igst: number; }
interface GSTSummary {
  period_label: string;
  total_taxable: number; total_gst: number; total_cgst: number; total_sgst: number; total_igst: number;
  lines: GSTLine[];
}

const fmt = (v: number) => `₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

function PLRow({ label, value, sub, bold, color }:
  { label: string; value: string; sub?: string; bold?: boolean; color?: string }) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-zinc-800/50 last:border-0 ${bold ? "font-semibold" : ""}`}>
      <div>
        <span className="text-sm text-zinc-300">{label}</span>
        {sub && <span className="text-xs text-zinc-500 ml-2">{sub}</span>}
      </div>
      <span className={`font-mono text-sm ${color || "text-white"}`}>{value}</span>
    </div>
  );
}

export default function ReportsPage() {
  const router    = useRouter();
  const { toast } = useToast();

  const [org, setOrg]             = useState<Org | null>(null);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [gst, setGST]             = useState<GSTSummary | null>(null);
  const [loading, setLoading]     = useState(false);
  const [tab, setTab]             = useState<"pl"|"gst"|"monthly">("pl");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [insights, setInsights]   = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [llmUsed, setLlmUsed]     = useState(false);
  const [emailTo, setEmailTo]     = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  useEffect(() => { if (!localStorage.getItem("smb_token")) router.push("/login"); }, []);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo)   p.set("date_to",   dateTo);
    const qs = p.toString() ? `?${p}` : "";
    Promise.all([
      apiFetch<Summary>(`/transactions/summary/${org.id}${qs}`),
      apiFetch<GSTSummary>(`/transactions/gst-summary/${org.id}${qs}`),
    ]).then(([s, g]) => { setSummary(s); setGST(g); setInsights(s.insights); setLlmUsed(false); })
      .finally(() => setLoading(false));
  }, [org, dateFrom, dateTo]);

  async function downloadExcel() {
    if (!org) return;
    setDownloadingExcel(true);
    try {
      const p = new URLSearchParams();
      if (dateFrom) p.set("date_from", dateFrom);
      if (dateTo)   p.set("date_to",   dateTo);
      const qs = p.toString() ? `?${p}` : "";
      const filename = `claritybooks-${org.slug || org.id}-${summary?.period_label?.replace(/[^a-z0-9]/gi, "-") || "report"}.xlsx`;
      await apiDownload(`/reports/excel/${org.id}${qs}`, filename);
      toast("Excel downloaded", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Download failed", "error");
    } finally { setDownloadingExcel(false); }
  }

  async function refreshInsights() {
    if (!org) return;
    setLoadingInsights(true);
    try {
      const p = new URLSearchParams();
      if (dateFrom) p.set("date_from", dateFrom);
      if (dateTo)   p.set("date_to",   dateTo);
      const qs = p.toString() ? `?${p}` : "";
      const r = await apiFetch<{ insights: string[]; llm_used: boolean; period_label: string }>(
        `/reports/insights/${org.id}${qs}`
      );
      setInsights(r.insights);
      setLlmUsed(r.llm_used);
      toast(r.llm_used ? "AI insights refreshed ✨" : "Insights refreshed", "success");
    } catch { toast("Failed to refresh insights", "error"); }
    finally  { setLoadingInsights(false); }
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!org || !emailTo) return;
    setSendingEmail(true);
    try {
      const p = new URLSearchParams();
      if (dateFrom) p.set("date_from", dateFrom);
      if (dateTo)   p.set("date_to",   dateTo);
      const qs = p.toString() ? `?${p}` : "";
      await apiFetch(`/reports/email/${org.id}${qs}`, {
        method: "POST",
        body: JSON.stringify({ to_email: emailTo, attach_excel: true }),
      });
      toast(`Report sent to ${emailTo}`, "success");
      setShowEmailForm(false); setEmailTo("");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to send", "error");
    } finally { setSendingEmail(false); }
  }

  const currentFY = (() => {
    const now = new Date();
    const yr  = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: `${yr}-04-01`, to: `${yr + 1}-03-31`, label: `FY ${yr}–${String(yr + 1).slice(2)}` };
  })();

  const expenseLines = summary?.category_totals.filter(c => c.total < 0 && c.category !== "Income / Revenue") ?? [];

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Reports</h1>
            {summary && <p className="text-xs text-zinc-500 mt-0.5">{summary.period_label}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setDateFrom(currentFY.from); setDateTo(currentFY.to); }}
              className="text-xs border border-zinc-700 hover:border-emerald-600 text-zinc-400 hover:text-emerald-400 rounded-lg px-3 py-1.5 transition-colors">
              {currentFY.label}
            </button>
            <button onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-lg px-3 py-1.5 transition-colors">
              All time
            </button>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 px-2.5 py-1.5 focus:outline-none focus:border-emerald-500" />
            <span className="text-zinc-600 text-xs">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 px-2.5 py-1.5 focus:outline-none focus:border-emerald-500" />
            <OrgSelector selected={org} onSelect={setOrg} />
          </div>
        </div>

        {/* Action bar */}
        {org && summary && summary.transaction_count > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <button onClick={downloadExcel} disabled={downloadingExcel}
              className="flex items-center gap-1.5 text-sm border border-zinc-700 hover:border-emerald-600 hover:text-emerald-400 text-zinc-300 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
              {downloadingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              {downloadingExcel ? "Downloading…" : "Download Excel"}
            </button>
            <button onClick={() => setShowEmailForm(f => !f)}
              className="flex items-center gap-1.5 text-sm border border-zinc-700 hover:border-sky-600 hover:text-sky-400 text-zinc-300 rounded-lg px-3 py-2 transition-colors">
              <Mail size={14} /> Email Report
            </button>
            <button onClick={refreshInsights} disabled={loadingInsights}
              className="flex items-center gap-1.5 text-sm border border-zinc-700 hover:border-yellow-600 hover:text-yellow-400 text-zinc-300 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
              {loadingInsights ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {llmUsed ? "Refresh AI Insights" : "Generate AI Insights"}
            </button>
          </div>
        )}

        {/* Email form */}
        {showEmailForm && (
          <form onSubmit={sendEmail}
            className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-zinc-400 mb-1.5">Send P&L report to</label>
              <input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} required
                placeholder="accountant@example.com"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 placeholder-zinc-600" />
            </div>
            <button type="submit" disabled={sendingEmail}
              className="flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-4 py-2 text-sm">
              {sendingEmail ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              Send with Excel
            </button>
            <p className="w-full text-xs text-zinc-600">
              Requires SMTP config in <code className="text-zinc-500">.env</code> — see <code className="text-zinc-500">.env.example</code> for Gmail/Resend setup.
            </p>
          </form>
        )}

        {!org ? (
          <div className="text-center py-20 text-zinc-500">Select an organisation to view reports.</div>
        ) : loading ? (
          <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-80" /></div>
        ) : (
          <>
            <div className="flex gap-1 mb-6 flex-wrap">
              {[
                { id: "pl",      label: "P&L Statement",  icon: FileText   },
                { id: "gst",     label: "GST Summary",    icon: Receipt    },
                { id: "monthly", label: "Monthly Trend",  icon: TrendingUp },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id as typeof tab)}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === id ? "bg-emerald-500 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"}`}>
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>

            {tab === "pl" && summary && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h2 className="font-semibold">Profit & Loss Statement</h2>
                  <span className="text-xs text-zinc-500">{summary.period_label}</span>
                </div>
                <div className="px-6 py-4">
                  <p className="text-xs uppercase tracking-widest text-emerald-500 mb-2 font-semibold">Revenue</p>
                  <PLRow label="Total Income" value={fmt(summary.total_income)} color="text-emerald-400"
                    sub={`${summary.category_totals.find(c => c.category === "Income / Revenue")?.count ?? 0} transactions`} />
                  <p className="text-xs uppercase tracking-widest text-red-500 mb-2 mt-5 font-semibold">Expenses</p>
                  {expenseLines.map(cat => (
                    <PLRow key={cat.category} label={cat.category} value={fmt(cat.total)} color="text-red-400"
                      sub={`${cat.count} txns · ${cat.percentage.toFixed(1)}% of spend`} />
                  ))}
                  <PLRow label="Total Expenses" value={fmt(summary.total_expenses)} bold color="text-red-400" />
                  <div className="mt-5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {summary.net_cashflow > 0 ? <TrendingUp size={18} className="text-emerald-400" />
                        : summary.net_cashflow < 0 ? <TrendingDown size={18} className="text-red-400" />
                        : <Minus size={18} className="text-zinc-400" />}
                      <span className="font-semibold">Net Cashflow</span>
                    </div>
                    <span className={`font-mono font-bold text-lg ${summary.net_cashflow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {summary.net_cashflow >= 0 ? "+" : "−"}{fmt(summary.net_cashflow)}
                    </span>
                  </div>
                  {summary.total_income > 0 && (
                    <p className="text-xs text-zinc-500 mt-3 text-right">
                      Net margin: {(summary.net_cashflow / summary.total_income * 100).toFixed(1)}% · {summary.transaction_count} transactions
                    </p>
                  )}
                  {insights.length > 0 && (
                    <div className="mt-5 border-t border-zinc-800 pt-5">
                      <div className="flex items-center gap-2 mb-3">
                        {llmUsed ? <Sparkles size={14} className="text-yellow-400" /> : <RefreshCw size={14} className="text-zinc-500" />}
                        <span className="text-xs font-semibold text-zinc-300">
                          {llmUsed ? "AI CFO Insights (Claude)" : "CFO Insights"}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {insights.map((ins, i) => (
                          <li key={i} className="text-sm text-zinc-300 leading-relaxed pl-3 border-l-2 border-zinc-700">{ins}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "gst" && gst && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h2 className="font-semibold">GST Input Tax Credit Summary</h2>
                  <span className="text-xs text-zinc-500">{gst.period_label}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 border-b border-zinc-800">
                  {[
                    { label: "Total Taxable",   value: fmt(gst.total_taxable) },
                    { label: "Total GST (ITC)", value: fmt(gst.total_gst), hi: true },
                    { label: "CGST (9%)",       value: fmt(gst.total_cgst) },
                    { label: "SGST (9%)",       value: fmt(gst.total_sgst) },
                  ].map(({ label, value, hi }) => (
                    <div key={label} className={`rounded-lg p-3 ${hi ? "bg-amber-950/40 border border-amber-900" : "bg-zinc-900"}`}>
                      <p className="text-xs text-zinc-500">{label}</p>
                      <p className={`font-mono font-bold mt-1 ${hi ? "text-amber-400" : "text-white"}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[580px]">
                    <thead className="border-b border-zinc-800">
                      <tr>{["Category","Taxable","GST (18%)","CGST","SGST"].map(h => (
                        <th key={h} className="px-4 py-3 text-xs text-zinc-400 font-medium text-right first:text-left">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {gst.lines.map(l => (
                        <tr key={l.category} className="hover:bg-zinc-900/40">
                          <td className="px-4 py-3 text-zinc-300">{l.category}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-400">{fmt(l.taxable_amount)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-amber-400">{fmt(l.gst_amount)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-400">{fmt(l.cgst)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-400">{fmt(l.sgst)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-zinc-700 bg-zinc-900/40">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-zinc-200">Total</td>
                        {[gst.total_taxable, gst.total_gst, gst.total_cgst, gst.total_sgst].map((v, i) => (
                          <td key={i} className={`px-4 py-3 text-right font-mono font-bold ${i === 1 ? "text-amber-400" : "text-zinc-200"}`}>{fmt(v)}</td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="px-6 py-3 text-xs text-zinc-600 border-t border-zinc-800">* GST estimated at 18%. Verify with your CA before GSTR-3B filing.</p>
              </div>
            )}

            {tab === "monthly" && summary && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800"><h2 className="font-semibold">Monthly Income vs Expenses</h2></div>
                <div className="p-6" style={{ minHeight: 296 }}>
                  <MonthlyTrendChart data={summary.monthly_trend} />
                </div>
                {summary.monthly_trend.length > 0 && (
                  <div className="border-t border-zinc-800 overflow-x-auto">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead className="bg-zinc-900/60">
                        <tr>{["Month","Income","Expenses","Net","Margin"].map(h => (
                          <th key={h} className="px-4 py-2.5 text-xs text-zinc-400 font-medium text-right first:text-left">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {summary.monthly_trend.map(m => {
                          const margin = m.income > 0 ? (m.net / m.income * 100) : 0;
                          return (
                            <tr key={m.month} className="hover:bg-zinc-900/40">
                              <td className="px-4 py-2.5 text-zinc-300">{m.month_label}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{fmt(m.income)}</td>
                              <td className="px-4 py-2.5 text-right font-mono text-red-400">{fmt(m.expenses)}</td>
                              <td className={`px-4 py-2.5 text-right font-mono font-semibold ${m.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {m.net >= 0 ? "+" : "−"}{fmt(m.net)}
                              </td>
                              <td className={`px-4 py-2.5 text-right text-xs ${margin >= 0 ? "text-zinc-400" : "text-red-400"}`}>{margin.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
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
