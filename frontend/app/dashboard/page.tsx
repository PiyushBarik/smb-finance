"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import Nav from "@/components/Nav";
import StatCard from "@/components/StatCard";
import { DashboardSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { Building2, Plus, Loader2, Upload, Lightbulb, TrendingUp, Download, X, ChevronDown } from "lucide-react";
import { apiDownload } from "@/lib/api";

// ── All three charts loaded client-only via dynamic imports ──────────────────
const PieChartWidget   = dynamic(() => import("@/components/Charts").then(m => ({ default: m.PieChartWidget   })), { ssr: false });
const BarChartWidget   = dynamic(() => import("@/components/Charts").then(m => ({ default: m.BarChartWidget   })), { ssr: false });
const TrendChartWidget = dynamic(() => import("@/components/Charts").then(m => ({ default: m.TrendChartWidget })), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Org { id: number; name: string; slug: string; gst_number?: string; }
interface CategoryTotal { category: string; total: number; count: number; percentage: number; }
interface MonthlyPoint  { month: string; month_label: string; income: number; expenses: number; net: number; }
interface Summary {
  org_id: number; period_label: string;
  total_income: number; total_expenses: number; net_cashflow: number;
  transaction_count: number;
  category_totals: CategoryTotal[];
  monthly_trend: MonthlyPoint[];
  insights: string[];
}

const fmt = (v: number) => `₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function DashboardPage() {
  const router    = useRouter();
  const { toast } = useToast();

  const [orgs, setOrgs]               = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [orgDropOpen, setOrgDropOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [summary, setSummary]         = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [newOrgName, setNewOrgName]   = useState("");
  const [newGST, setNewGST]           = useState("");
  const [creating, setCreating]       = useState(false);
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [activeTab, setActiveTab]     = useState<"pie"|"bar"|"trend">("pie");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("smb_token")) { router.push("/login"); return; }
    apiFetch<Org[]>("/orgs/")
      .then(data => { setOrgs(data); if (data.length > 0) setSelectedOrg(data[0]); else setLoadingOrgs(false); })
      .catch(() => router.push("/login"));
  }, []);

  useEffect(() => {
    if (!selectedOrg) return;
    setLoadingOrgs(false);
    loadSummary(selectedOrg.id, dateFrom, dateTo);
  }, [selectedOrg, dateFrom, dateTo]);

  async function loadSummary(orgId: number, from: string, to: string) {
    setLoadingSummary(true); setSummary(null);
    try {
      const p = new URLSearchParams();
      if (from) p.set("date_from", from);
      if (to)   p.set("date_to",   to);
      const data = await apiFetch<Summary>(`/transactions/summary/${orgId}${p.toString() ? `?${p}` : ""}`);
      setSummary(data);
    } catch { toast("Could not load summary", "error"); }
    finally  { setLoadingSummary(false); }
  }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault(); setCreating(true);
    try {
      const org = await apiFetch<Org>("/orgs/", { method: "POST", body: JSON.stringify({ name: newOrgName, gst_number: newGST || undefined }) });
      setOrgs(prev => [...prev, org]); setSelectedOrg(org);
      setShowCreate(false); setNewOrgName(""); setNewGST("");
      toast("Organisation created", "success");
    } catch (err: unknown) { toast(err instanceof Error ? err.message : "Failed", "error"); }
    finally { setCreating(false); }
  }

  async function handleExport() {
    if (!selectedOrg) return;
    setDownloading(true);
    try {
      const p = new URLSearchParams();
      if (dateFrom) p.set("date_from", dateFrom);
      if (dateTo)   p.set("date_to",   dateTo);
      const qs = p.toString() ? `?${p}` : "";
      await apiDownload(`/transactions/export/${selectedOrg.id}${qs}`, `claritybooks-${selectedOrg.slug || selectedOrg.id}.csv`);
      toast("CSV exported", "success");
    } catch (err: unknown) { toast(err instanceof Error ? err.message : "Export failed", "error"); }
    finally { setDownloading(false); }
  }

  if (loadingOrgs) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-emerald-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">

        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {orgs.length > 0 && (
            <div className="relative">
              <button onClick={() => setOrgDropOpen(o => !o)}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm hover:border-zinc-500 transition-colors">
                <Building2 size={14} className="text-zinc-400" />
                <span className="font-medium">{selectedOrg?.name ?? "Select org"}</span>
                <ChevronDown size={13} className="text-zinc-500" />
              </button>
              {orgDropOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl z-30">
                  {orgs.map(org => (
                    <button key={org.id} onClick={() => { setSelectedOrg(org); setOrgDropOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm first:rounded-t-xl last:rounded-b-xl transition-colors ${selectedOrg?.id === org.id ? "bg-emerald-950/60 text-emerald-400" : "text-zinc-300 hover:bg-zinc-800"}`}>
                      {org.name}
                      {org.gst_number && <div className="text-xs text-zinc-500 mt-0.5 font-mono">{org.gst_number}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={() => setShowCreate(o => !o)}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-600 px-3 py-2 text-sm text-zinc-500 hover:text-white hover:border-zinc-400 transition-colors">
            <Plus size={13} /> New org
          </button>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500" />
            <span className="text-zinc-600 text-xs">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-zinc-500 hover:text-zinc-300 p-1"><X size={13} /></button>
            )}
          </div>
        </div>

        {showCreate && (
          <form onSubmit={createOrg} className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900/60 p-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Business Name</label>
              <input value={newOrgName} onChange={e => setNewOrgName(e.target.value)} required placeholder="My Shop Pvt Ltd"
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-52" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">GSTIN (optional)</label>
              <input value={newGST} onChange={e => setNewGST(e.target.value.toUpperCase())} placeholder="27AAPFU0939F1ZV"
                className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 w-52" />
            </div>
            <button type="submit" disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold px-5 py-2 text-sm">
              {creating && <Loader2 size={13} className="animate-spin" />}Create
            </button>
          </form>
        )}

        {orgs.length === 0 && (
          <div className="text-center py-24">
            <Building2 size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500 mb-6 text-sm">Create your first business to get started.</p>
            <button onClick={() => setShowCreate(true)} className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-2.5">
              Create organisation
            </button>
          </div>
        )}

        {selectedOrg && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-xl font-bold">{selectedOrg.name}</h1>
                {summary && <p className="text-xs text-zinc-500 mt-0.5">{summary.period_label}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExport} disabled={downloading}
                  className="flex items-center gap-1.5 text-xs border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
                  {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Export CSV
                </button>
                <Link href="/upload"
                  className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg px-3 py-1.5 transition-colors">
                  <Upload size={12} /> Upload CSV
                </Link>
              </div>
            </div>

            {loadingSummary && <DashboardSkeleton />}

            {!loadingSummary && summary && summary.transaction_count === 0 && (
              <div className="text-center py-24 border border-dashed border-zinc-800 rounded-xl">
                <Upload size={40} className="mx-auto text-zinc-700 mb-4" />
                <h2 className="text-lg font-semibold mb-2">No transactions yet</h2>
                <p className="text-zinc-500 text-sm mb-6">Upload a Shopify payout or bank CSV to see your dashboard.</p>
                <Link href="/upload" className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-5 py-2.5 text-sm">
                  <Upload size={14} /> Upload CSV now
                </Link>
              </div>
            )}

            {!loadingSummary && summary && summary.transaction_count > 0 && (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <StatCard label="Total Income"   value={fmt(summary.total_income)}   color="green" sub={`${summary.transaction_count} transactions`} />
                  <StatCard label="Total Expenses"  value={fmt(summary.total_expenses)}  color="red" />
                  <StatCard label="Net Cashflow"
                    value={(summary.net_cashflow >= 0 ? "+" : "−") + fmt(summary.net_cashflow)}
                    color={summary.net_cashflow >= 0 ? "green" : "red"} />
                  <StatCard label="Net Margin"
                    value={summary.total_income > 0 ? `${(summary.net_cashflow / summary.total_income * 100).toFixed(1)}%` : "—"}
                    color={summary.net_cashflow >= 0 ? "blue" : "red"} />
                </div>

                {/* Charts */}
                {summary.category_totals.length > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 mb-6">
                    <div className="flex items-center gap-1.5 mb-5">
                      {([
                        { id: "pie",   label: "Expense Breakdown" },
                        { id: "bar",   label: "By Category"       },
                        { id: "trend", label: "Monthly Trend"     },
                      ] as const).map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeTab === t.id ? "bg-emerald-500 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {/* Fixed-height container — key forces remount on tab switch */}
                    <div style={{ minHeight: 280 }}>
                      {activeTab === "pie"   && <PieChartWidget   key="pie"   data={summary.category_totals} />}
                      {activeTab === "bar"   && <BarChartWidget   key="bar"   data={summary.category_totals} />}
                      {activeTab === "trend" && <TrendChartWidget key="trend" data={summary.monthly_trend}   />}
                    </div>
                  </div>
                )}

                {/* Insights */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={15} className="text-yellow-400" />
                    <h3 className="text-sm font-semibold text-zinc-200">CFO Insights</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {summary.insights.map((ins, i) => (
                      <li key={i} className="text-sm text-zinc-300 leading-relaxed pl-3 border-l-2 border-zinc-700">{ins}</li>
                    ))}
                  </ul>
                  <Link href="/reports" className="inline-flex items-center gap-1.5 mt-4 text-xs text-emerald-400 hover:underline">
                    <TrendingUp size={12} /> View full P&L and GST report →
                  </Link>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
