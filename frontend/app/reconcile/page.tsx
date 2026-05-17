"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import OrgSelector, { Org } from "@/components/OrgSelector";
import { useToast } from "@/components/Toast";
import {
  RunDetail, RunSummary, MatchRow, AnomalyRow,
  startRun, listRuns, getRun, scanAnomalies,
} from "@/lib/reconcile";
import { apiFetch } from "@/lib/api";
import { LoadingState, EmptyState, ErrorState } from "@/components/reconcile/states";
import { MatchCard } from "@/components/reconcile/MatchCard";
import { AnomalyCard } from "@/components/reconcile/AnomalyCard";
import { TriageColumn } from "@/components/reconcile/TriageColumn";
import { RunHistoryStrip } from "@/components/reconcile/RunHistoryStrip";
import { DrilldownDrawer } from "@/components/reconcile/DrilldownDrawer";
import { Loader2, Play } from "lucide-react";

interface Batch { id: number; filename: string; source: string; row_count: number; }

export default function ReconcilePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [org, setOrg] = useState<Org | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sourceBatchId, setSourceBatchId] = useState<number | null>(null);
  const [bankBatchId, setBankBatchId] = useState<number | null>(null);

  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [currentRun, setCurrentRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKind, setDrawerKind] = useState<"match" | "anomaly" | null>(null);
  const [drawerData, setDrawerData] = useState<MatchRow | AnomalyRow | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("smb_token")) { router.push("/login"); return; }
  }, []);

  useEffect(() => {
    if (!org) return;
    apiFetch<Batch[]>(`/transactions/batches/${org.id}`).then(setBatches).catch(() => setBatches([]));
    refreshRuns(org.id);
  }, [org]);

  async function refreshRuns(orgId: number) {
    try {
      const list = await listRuns(orgId);
      setRuns(list);
      if (list.length > 0) {
        const detail = await getRun(orgId, list[0].id);
        setCurrentRun(detail);
      } else {
        setCurrentRun(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load runs");
    }
  }

  async function handleStart() {
    if (!org || !sourceBatchId || !bankBatchId) return;
    setStarting(true);
    try {
      const detail = await startRun(org.id, sourceBatchId, bankBatchId);
      setCurrentRun(detail);
      const list = await listRuns(org.id);
      setRuns(list);
      toast("Reconciliation complete", "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Reconciliation failed", "error");
    } finally {
      setStarting(false);
    }
  }

  async function handleSelectRun(runId: number) {
    if (!org) return;
    setLoading(true);
    try {
      const detail = await getRun(org.id, runId);
      setCurrentRun(detail);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load run");
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    if (!org) return;
    try {
      const r = await scanAnomalies(org.id);
      toast(`Scanned ${r.scanned} — ${r.new_anomalies} new anomalies`, "success");
      await refreshRuns(org.id);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Scan failed", "error");
    }
  }

  function updateMatch(updated: MatchRow) {
    setCurrentRun(r => r ? { ...r, matches: r.matches.map(m => m.id === updated.id ? updated : m) } : r);
  }

  function updateAnomaly(updated: AnomalyRow) {
    setCurrentRun(r => r ? { ...r, anomalies: r.anomalies.map(a => a.id === updated.id ? updated : a) } : r);
  }

  function openDrilldown(kind: "match" | "anomaly", id: number) {
    if (!currentRun) return;
    const data = kind === "match"
      ? currentRun.matches.find(m => m.id === id) ?? null
      : currentRun.anomalies.find(a => a.id === id) ?? null;
    setDrawerKind(kind);
    setDrawerData(data);
    setDrawerOpen(true);
  }

  const matches = currentRun?.matches ?? [];
  const anomalies = currentRun?.anomalies ?? [];

  const accepted   = matches.filter(m => m.status === "accepted");
  const pending    = matches.filter(m => m.status === "pending" && m.confidence === "high");
  const reviewable = matches.filter(m => m.status === "pending" && m.confidence !== "high");
  const openAnomalies = anomalies.filter(a => a.status === "open");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#f8fafc",
      fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>
      <Nav />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 36,
              margin: "0 0 6px", lineHeight: 1 }}>
              Reconcile <em style={{ color: "#475569" }}>triage</em>
            </h1>
            <p style={{ fontSize: 13, color: "#475569" }}>
              Match Shopify payouts to bank credits, review anomalies, take action.
            </p>
          </div>
          <OrgSelector selected={org} onSelect={setOrg} />
        </div>

        {!org ? (
          <EmptyState title="Pick an organisation" subtitle="Select one above to view reconciliations." />
        ) : (
          <>
            {/* Run-start form */}
            <div style={{
              padding: 18, borderRadius: 14,
              border: "1px solid rgba(30,41,59,0.7)",
              background: "rgba(15,23,42,0.4)",
              display: "flex", alignItems: "center", gap: 12,
              flexWrap: "wrap", marginBottom: 24,
            }}>
              <select
                value={sourceBatchId ?? ""}
                onChange={e => setSourceBatchId(Number(e.target.value) || null)}
                style={selectStyle}
              >
                <option value="">Source batch (Shopify…)</option>
                {batches.filter(b => b.source !== "bank").map(b => (
                  <option key={b.id} value={b.id}>{b.filename} ({b.row_count} rows)</option>
                ))}
              </select>
              <select
                value={bankBatchId ?? ""}
                onChange={e => setBankBatchId(Number(e.target.value) || null)}
                style={selectStyle}
              >
                <option value="">Bank batch</option>
                {batches.filter(b => b.source === "bank").map(b => (
                  <option key={b.id} value={b.id}>{b.filename} ({b.row_count} rows)</option>
                ))}
              </select>
              <button
                onClick={handleStart}
                disabled={!sourceBatchId || !bankBatchId || starting}
                style={primaryBtn(starting)}
              >
                {starting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                Run reconciliation
              </button>
              <button onClick={handleScan} style={ghostBtn}>
                Rescan anomalies
              </button>
            </div>

            <RunHistoryStrip runs={runs} selectedRunId={currentRun?.id ?? null} onSelect={handleSelectRun} />

            {loading && <LoadingState />}
            {error && <ErrorState message={error} onRetry={() => org && refreshRuns(org.id)} />}

            {!loading && !error && !currentRun && (
              <EmptyState title="No reconciliations yet" subtitle="Start one above to begin." />
            )}

            {!loading && !error && currentRun && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
                <TriageColumn title="Auto-matched" count={accepted.length + pending.length} accent="emerald" defaultCollapsed>
                  {[...pending, ...accepted].map(m => (
                    <MatchCard key={m.id} match={m} onChange={updateMatch}
                      onOpenDrilldown={id => openDrilldown("match", id)} />
                  ))}
                </TriageColumn>

                <TriageColumn title="Needs review" count={reviewable.length} accent="amber">
                  {reviewable.length === 0
                    ? <EmptyState title="Nothing to review" />
                    : reviewable.map(m => (
                        <MatchCard key={m.id} match={m} onChange={updateMatch}
                          onOpenDrilldown={id => openDrilldown("match", id)} />
                      ))}
                </TriageColumn>

                <TriageColumn title="Anomalies" count={openAnomalies.length} accent="rose">
                  {openAnomalies.length === 0
                    ? <EmptyState title="No open anomalies" />
                    : openAnomalies.map(a => (
                        <AnomalyCard key={a.id} anomaly={a} onChange={updateAnomaly}
                          onOpenDrilldown={id => openDrilldown("anomaly", id)} />
                      ))}
                </TriageColumn>
              </div>
            )}
          </>
        )}
      </div>

      <DrilldownDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        kind={drawerKind}
        data={drawerData}
      />
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8,
  border: "1px solid rgba(30,41,59,0.8)",
  background: "rgba(15,23,42,0.7)", color: "#e2e8f0",
  fontSize: 13, fontFamily: "inherit", minWidth: 220,
};

const primaryBtn = (busy: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8, border: "none", cursor: busy ? "wait" : "pointer",
  background: "#34d399", color: "#0f172a", fontSize: 13, fontWeight: 700,
  fontFamily: "inherit", opacity: busy ? 0.6 : 1,
});

const ghostBtn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid rgba(30,41,59,0.8)", background: "transparent",
  color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
};
