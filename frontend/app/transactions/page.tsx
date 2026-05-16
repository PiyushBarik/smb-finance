"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Nav from "@/components/Nav";
import OrgSelector, { Org } from "@/components/OrgSelector";
import { CategoryBadge, StatusBadge } from "@/components/Badge";
import { TableSkeleton } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import { Search, ChevronLeft, ChevronRight, Edit2, Check, X, Download } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Txn {
  id: number; date?: string; description?: string;
  amount: number; currency: string; category?: string;
  gst_amount?: number; is_reconciled: boolean; batch_id: number;
}
interface TxnList {
  items: Txn[]; total: number; page: number;
  page_size: number; total_pages: number;
}

const CATEGORIES = [
  "All","Income / Revenue","Advertising & Marketing","Software & Subscriptions",
  "Logistics & Shipping","Inventory & COGS","Salaries & Payroll",
  "Rent & Utilities","GST & Tax","Banking & Finance","Travel & Meals","Uncategorised",
];

const fmtINR = (v: number) => {
  const abs = Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `${v < 0 ? "−" : "+"}₹${abs}`;
};

export default function TransactionsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [org, setOrg]           = useState<Org | null>(null);
  const [data, setData]         = useState<TxnList | null>(null);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [editId, setEditId]     = useState<number | null>(null);
  const [editCat, setEditCat]   = useState("");

  useEffect(() => { if (!localStorage.getItem("smb_token")) router.push("/login"); }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), page_size: "50" });
      if (debouncedSearch)    p.set("search",    debouncedSearch);
      if (category !== "All") p.set("category",  category);
      if (dateFrom)           p.set("date_from", dateFrom);
      if (dateTo)             p.set("date_to",   dateTo);
      const d = await apiFetch<TxnList>(`/transactions/list/${org.id}?${p}`);
      setData(d);
    } finally { setLoading(false); }
  }, [org, page, debouncedSearch, category, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [org, debouncedSearch, category, dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  async function saveCategory(id: number) {
    try {
      await apiFetch(`/transactions/${id}/category`, {
        method: "PATCH",
        body: JSON.stringify({ category: editCat }),
      });
      toast("Category updated");
      setEditId(null);
      load();
    } catch {
      toast("Failed to update", "error");
    }
  }

  const clearFilters = () => {
    setSearch(""); setCategory("All"); setDateFrom(""); setDateTo("");
  };
  const hasFilters = search || category !== "All" || dateFrom || dateTo;
  const exportUrl  = `${API}/transactions/export/${org?.id}${dateFrom ? `?date_from=${dateFrom}` : ""}${dateTo ? `${dateFrom ? "&" : "?"}date_to=${dateTo}` : ""}`;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Transaction Ledger</h1>
            {data && <p className="text-xs text-zinc-500 mt-0.5">{data.total.toLocaleString()} transactions</p>}
          </div>
          <div className="flex items-center gap-2">
            {org && (
              <a href={exportUrl} download
                className="flex items-center gap-1.5 text-xs border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white rounded-lg px-3 py-1.5 transition-colors">
                <Download size={12} /> Export CSV
              </a>
            )}
            <OrgSelector selected={org} onSelect={setOrg} />
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search description…"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-52"
            />
          </div>

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 px-2.5 py-1.5 focus:outline-none focus:border-emerald-500" />
            <span className="text-zinc-600 text-xs">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 px-2.5 py-1.5 focus:outline-none focus:border-emerald-500" />
          </div>

          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded-lg px-2.5 py-1.5 transition-colors">
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Content */}
        {!org ? (
          <div className="text-center py-20 text-zinc-500">Select an organisation to view transactions.</div>
        ) : loading ? (
          <TableSkeleton rows={12} />
        ) : !data?.items.length ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
            {hasFilters ? "No transactions match your filters." : "No transactions yet. Upload a CSV to get started."}
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-zinc-800 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="border-b border-zinc-800 bg-zinc-900/60">
                  <tr>
                    {["Date","Description","Category","Amount","GST Est.","Status",""].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-xs text-zinc-400 font-medium ${i >= 3 ? "text-right" : "text-left"} ${i === 5 ? "text-center" : ""} ${[4,5].includes(i) ? "hidden md:table-cell" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {data.items.map(txn => (
                    <tr key={txn.id} className="hover:bg-zinc-900/40 transition-colors group">
                      <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap font-mono">
                        {txn.date || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 max-w-[220px]">
                        <span className="truncate block text-sm" title={txn.description || ""}>
                          {txn.description || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {editId === txn.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={editCat}
                              onChange={e => setEditCat(e.target.value)}
                              className="rounded border border-zinc-600 bg-zinc-800 text-xs text-white px-1.5 py-1 focus:outline-none focus:border-emerald-500"
                            >
                              {CATEGORIES.filter(c => c !== "All").map(c => (
                                <option key={c}>{c}</option>
                              ))}
                            </select>
                            <button onClick={() => saveCategory(txn.id)} className="text-emerald-400 hover:text-emerald-300 p-0.5">
                              <Check size={13} />
                            </button>
                            <button onClick={() => setEditId(null)} className="text-zinc-500 hover:text-zinc-300 p-0.5">
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <CategoryBadge category={txn.category} />
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${txn.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {fmtINR(txn.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-500 hidden md:table-cell font-mono">
                        {txn.gst_amount
                          ? `₹${txn.gst_amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <StatusBadge reconciled={txn.is_reconciled} />
                      </td>
                      <td className="px-4 py-3 w-8">
                        <button
                          onClick={() => { setEditId(txn.id); setEditCat(txn.category || "Uncategorised"); }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 transition-all"
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-xs text-zinc-500">
                  Page {data.page} of {data.total_pages} · {data.total.toLocaleString()} total
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-zinc-700 p-1.5 disabled:opacity-30 hover:border-zinc-500 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-zinc-400 px-2">{page}</span>
                  <button
                    onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                    disabled={page === data.total_pages}
                    className="rounded-lg border border-zinc-700 p-1.5 disabled:opacity-30 hover:border-zinc-500 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
