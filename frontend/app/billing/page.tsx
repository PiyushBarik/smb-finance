"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Nav from "@/components/Nav";
import { useToast } from "@/components/Toast";
import { CheckCircle2, Loader2, Zap, Crown, Building2, Sparkles, X, ArrowRight } from "lucide-react";

interface Plan {
  id: number; name: string; display_name: string;
  price_monthly: number; price_yearly: number;
  max_orgs: number; max_txns_month: number; max_team_members: number;
  ai_insights: boolean; excel_export: boolean;
  email_reports: boolean; api_access: boolean;
}
interface SubscriptionOut {
  plan: Plan; status: string; billing_cycle: string;
  cancel_at_period_end: boolean; current_period_end?: string;
}

const PLAN_META: Record<string, { icon: React.ReactNode; accent: string; glow: string; badge?: string }> = {
  free:     { icon: <Building2 size={18} />, accent: "#64748b", glow: "rgba(100,116,139,0.12)" },
  starter:  { icon: <Zap       size={18} />, accent: "#38bdf8", glow: "rgba(56,189,248,0.12)" },
  pro:      { icon: <Sparkles  size={18} />, accent: "#a78bfa", glow: "rgba(167,139,250,0.12)", badge: "Most popular" },
  business: { icon: <Crown     size={18} />, accent: "#fbbf24", glow: "rgba(251,191,36,0.12)" },
};

const FEATURES: Array<{ key: keyof Plan; label: string }> = [
  { key: "ai_insights",   label: "AI CFO Insights" },
  { key: "excel_export",  label: "Excel P&L Export" },
  { key: "email_reports", label: "Email Reports"     },
  { key: "api_access",    label: "API Access"        },
];

function fmt(n: number) { return n === -1 ? "Unlimited" : n.toLocaleString("en-IN"); }

function BillingContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { toast }    = useToast();

  const [plans,     setPlans]     = useState<Plan[]>([]);
  const [sub,       setSub]       = useState<SubscriptionOut | null>(null);
  const [billing,   setBilling]   = useState<"monthly"|"yearly">("monthly");
  const [loading,   setLoading]   = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling,setCancelling]= useState(false);

  useEffect(() => {
    if (!localStorage.getItem("smb_token")) { router.push("/login"); return; }
    if (searchParams.get("success")   === "1") toast("Subscription activated!", "success");
    if (searchParams.get("cancelled") === "1") toast("Checkout cancelled", "info");
    Promise.all([
      apiFetch<Plan[]>("/billing/plans"),
      apiFetch<SubscriptionOut>("/billing/subscription"),
    ]).then(([p, s]) => { setPlans(p); setSub(s); })
      .catch(() => apiFetch<Plan[]>("/billing/plans").then(setPlans))
      .finally(() => setLoading(false));
  }, []);

  async function upgrade(planName: string) {
    if (planName === "free") return;
    setUpgrading(planName);
    try {
      const r = await apiFetch<{ url?: string; demo?: boolean; message?: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan_name: planName, billing_cycle: billing }),
      });
      if (r.demo || !r.url) toast(r.message || "Demo mode: plan upgraded locally", "success");
      else window.location.href = r.url;
    } catch (err: unknown) { toast(err instanceof Error ? err.message : "Upgrade failed", "error"); }
    finally { setUpgrading(null); }
  }

  async function cancel() {
    if (!confirm("Cancel subscription? You'll be downgraded to Free at period end.")) return;
    setCancelling(true);
    try {
      await apiFetch("/billing/cancel", { method: "POST" });
      toast("Subscription cancelled", "success");
      setSub(await apiFetch<SubscriptionOut>("/billing/subscription"));
    } catch (err: unknown) { toast(err instanceof Error ? err.message : "Failed", "error"); }
    finally { setCancelling(false); }
  }

  const currentPlan = sub?.plan.name || "free";

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} style={{ color: "#34d399" }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#f8fafc", fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>

      {/* Grain */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      <Nav />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#475569", marginBottom: 16 }}>Pricing</div>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(32px,5vw,52px)", color: "#f8fafc", margin: "0 0 12px", lineHeight: 1.1 }}>
            Simple, <em style={{ fontStyle: "italic", color: "#475569" }}>transparent</em> pricing
          </h1>
          <p style={{ fontSize: 14, color: "#475569", maxWidth: 460, margin: "0 auto 28px" }}>
            Built for Indian SMBs and Shopify sellers. No hidden fees. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div style={{
            display: "inline-flex", padding: 4, borderRadius: 99,
            border: "1px solid rgba(30,41,59,0.8)", background: "rgba(15,23,42,0.6)",
          }}>
            {(["monthly", "yearly"] as const).map(cycle => (
              <button key={cycle} onClick={() => setBilling(cycle)} style={{
                padding: "7px 18px", borderRadius: 99, border: "none", cursor: "pointer",
                background: billing === cycle ? "#f1f5f9" : "transparent",
                color: billing === cycle ? "#0f172a" : "#475569",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                transition: "all 150ms", display: "flex", alignItems: "center", gap: 6,
              }}>
                {cycle === "yearly" ? "Yearly" : "Monthly"}
                {cycle === "yearly" && billing === "yearly" && (
                  <span style={{ fontSize: 10, color: "#34d399", background: "rgba(52,211,153,0.12)", padding: "2px 6px", borderRadius: 99 }}>Save 17%</span>
                )}
                {cycle === "yearly" && billing !== "yearly" && (
                  <span style={{ fontSize: 10, color: "#34d399" }}>−17%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Current plan banner */}
        {sub && (
          <div style={{
            marginBottom: 40, padding: "14px 20px",
            borderRadius: 14, border: "1px solid rgba(30,41,59,0.8)",
            background: "rgba(15,23,42,0.5)",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ color: PLAN_META[currentPlan]?.accent ?? "#64748b" }}>
                {PLAN_META[currentPlan]?.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                  Current plan: <span style={{ color: PLAN_META[currentPlan]?.accent ?? "#64748b" }}>{sub.plan.display_name}</span>
                </div>
                <div style={{ fontSize: 11, color: "#475569" }}>
                  Status: {sub.status}
                  {sub.cancel_at_period_end && " · Cancels at period end"}
                  {sub.current_period_end && ` · Renews ${new Date(sub.current_period_end).toLocaleDateString("en-IN")}`}
                </div>
              </div>
            </div>
            {sub.plan.name !== "free" && !sub.cancel_at_period_end && (
              <button onClick={cancel} disabled={cancelling} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                borderRadius: 8, border: "1px solid rgba(30,41,59,0.8)", background: "transparent",
                color: "#475569", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                transition: "all 150ms",
              }}
                onMouseEnter={e => { (e.currentTarget.style.color = "#fb7185"); (e.currentTarget.style.borderColor = "rgba(251,113,133,0.4)"); }}
                onMouseLeave={e => { (e.currentTarget.style.color = "#475569"); (e.currentTarget.style.borderColor = "rgba(30,41,59,0.8)"); }}
              >
                {cancelling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Cancel subscription
              </button>
            )}
          </div>
        )}

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 48 }}>
          {plans.map(plan => {
            const meta     = PLAN_META[plan.name] ?? PLAN_META.free;
            const isCurrent= plan.name === currentPlan;
            const price    = billing === "yearly" ? Math.round(plan.price_yearly / 12) : plan.price_monthly;

            return (
              <div key={plan.name} style={{
                position: "relative", overflow: "hidden",
                borderRadius: 18, padding: "28px 24px",
                border: `1px solid ${isCurrent ? meta.accent + "44" : "rgba(30,41,59,0.8)"}`,
                background: "rgba(15,23,42,0.5)",
                display: "flex", flexDirection: "column",
                boxShadow: isCurrent ? `0 0 40px ${meta.glow}` : "none",
                transition: "all 200ms",
              }}>
                {/* Glow blob */}
                <div style={{ position: "absolute", top: -40, right: -40, width: 100, height: 100,
                  borderRadius: "50%", background: meta.glow, filter: "blur(28px)", opacity: 0.9 }} />

                {meta.badge && (
                  <div style={{
                    position: "absolute", top: 16, right: 16,
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                    color: meta.accent, background: meta.accent + "18",
                    padding: "3px 8px", borderRadius: 99,
                  }}>
                    {meta.badge}
                  </div>
                )}

                <div style={{ position: "relative" }}>
                  {/* Plan header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, color: meta.accent }}>
                    {meta.icon}
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>{plan.display_name}</span>
                    {isCurrent && (
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "#34d399", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 99, padding: "2px 8px" }}>
                        Current
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 36, color: "#f8fafc", lineHeight: 1 }}>
                      {price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`}
                    </div>
                    {price > 0 && (
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                        /month{billing === "yearly" ? " · billed yearly" : ""}
                      </div>
                    )}
                  </div>

                  {/* Limits */}
                  <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(30,41,59,0.8)", display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      `${fmt(plan.max_orgs)} org${plan.max_orgs !== 1 ? "s" : ""}`,
                      `${fmt(plan.max_txns_month)} txns/month`,
                      `${fmt(plan.max_team_members)} member${plan.max_team_members !== 1 ? "s" : ""}`,
                    ].map(l => (
                      <div key={l} style={{ fontSize: 12, color: "#64748b" }}>{l}</div>
                    ))}
                  </div>

                  {/* Features */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, flex: 1 }}>
                    {FEATURES.map(({ key, label }) => (
                      <div key={String(key)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: plan[key] ? "#cbd5e1" : "#334155" }}>
                        {plan[key]
                          ? <CheckCircle2 size={12} style={{ color: "#34d399", flexShrink: 0 }} />
                          : <span style={{ width: 12, height: 12, borderRadius: "50%", border: "1px solid #1e293b", display: "inline-block", flexShrink: 0 }} />
                        }
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => upgrade(plan.name)}
                    disabled={isCurrent || !!upgrading || plan.name === "free"}
                    style={{
                      width: "100%", padding: "11px", borderRadius: 10, border: "none", cursor: isCurrent || plan.name === "free" ? "default" : "pointer",
                      background: isCurrent ? "rgba(30,41,59,0.6)" : plan.name === "free" ? "rgba(30,41,59,0.4)" : meta.accent,
                      color: isCurrent || plan.name === "free" ? "#334155" : plan.name === "business" ? "#0f172a" : "#0f172a",
                      fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      transition: "all 150ms", opacity: !!upgrading && upgrading !== plan.name ? 0.5 : 1,
                    }}>
                    {upgrading === plan.name
                      ? <><Loader2 size={13} className="animate-spin" />Processing…</>
                      : isCurrent ? "Current plan"
                      : plan.name === "free" ? "Free forever"
                      : <>{`Upgrade to ${plan.display_name}`}<ArrowRight size={13} /></>
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div style={{ borderRadius: 16, border: "1px solid rgba(30,41,59,0.8)", background: "rgba(15,23,42,0.3)", overflow: "hidden", overflowX: "auto", marginBottom: 32 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 11, color: "#475569", fontWeight: 500 }}>Feature</th>
                {plans.map(p => (
                  <th key={p.name} style={{ padding: "14px 16px", textAlign: "center", fontSize: 11, fontWeight: 600,
                    color: p.name === currentPlan ? PLAN_META[p.name]?.accent ?? "#64748b" : "#475569" }}>
                    {p.display_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Organisations",      vals: plans.map(p => fmt(p.max_orgs)) },
                { label: "Transactions/month", vals: plans.map(p => fmt(p.max_txns_month)) },
                { label: "Team members",       vals: plans.map(p => fmt(p.max_team_members)) },
                { label: "AI CFO Insights",    vals: plans.map(p => p.ai_insights) },
                { label: "Excel P&L Export",   vals: plans.map(p => p.excel_export) },
                { label: "Email Reports",      vals: plans.map(p => p.email_reports) },
                { label: "API Access",         vals: plans.map(p => p.api_access) },
                { label: "GST Reconciliation", vals: plans.map(() => true) },
                { label: "CSV Upload",         vals: plans.map(() => true) },
              ].map((row, ri) => (
                <tr key={row.label} style={{ borderBottom: "1px solid rgba(30,41,59,0.5)", background: ri % 2 === 0 ? "transparent" : "rgba(30,41,59,0.1)" }}>
                  <td style={{ padding: "11px 20px", color: "#94a3b8" }}>{row.label}</td>
                  {row.vals.map((v, i) => (
                    <td key={i} style={{ padding: "11px 16px", textAlign: "center" }}>
                      {typeof v === "boolean"
                        ? v
                          ? <CheckCircle2 size={14} style={{ color: "#34d399", margin: "0 auto" }} />
                          : <span style={{ color: "#1e293b" }}>—</span>
                        : <span style={{ fontSize: 12, color: "#64748b", fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#1e293b" }}>
          Payments powered by Stripe · All prices in INR + GST applicable ·{" "}
          <button onClick={() => router.push("/settings")} style={{ background: "none", border: "none", cursor: "pointer", color: "#334155", fontSize: 11, textDecoration: "underline", fontFamily: "inherit" }}>
            Manage billing
          </button>
        </p>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={28} style={{ color: "#34d399" }} className="animate-spin" /></div>}>
      <BillingContent />
    </Suspense>
  );
}  starter:  "bg-sky-600 hover:bg-sky-500 text-white",
  pro:      "bg-purple-600 hover:bg-purple-500 text-white",
  business: "bg-yellow-500 hover:bg-yellow-400 text-zinc-950",
};

function fmt(n: number) { return n === -1 ? "Unlimited" : n.toLocaleString("en-IN"); }
function fmtINR(n: number) { return n === 0 ? "Free" : `₹${n.toLocaleString("en-IN")}/mo`; }

const FEATURES: Array<{ key: keyof Plan; label: string }> = [
  { key: "ai_insights",    label: "AI CFO Insights (Claude)" },
  { key: "excel_export",   label: "Excel P&L Export"         },
  { key: "email_reports",  label: "Email Reports"            },
  { key: "api_access",     label: "API Access"               },
];

function BillingContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { toast }    = useToast();

  const [plans, setPlans]     = useState<Plan[]>([]);
  const [sub, setSub]         = useState<SubscriptionOut | null>(null);
  const [billing, setBilling] = useState<"monthly"|"yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("smb_token")) { router.push("/login"); return; }

    // Show result toasts from Stripe redirect
    if (searchParams.get("success") === "1")   toast("Subscription activated!", "success");
    if (searchParams.get("cancelled") === "1") toast("Checkout cancelled", "info");

    Promise.all([
      apiFetch<Plan[]>("/billing/plans"),
      apiFetch<SubscriptionOut>("/billing/subscription"),
    ]).then(([p, s]) => { setPlans(p); setSub(s); })
      .catch(() => apiFetch<Plan[]>("/billing/plans").then(setPlans))
      .finally(() => setLoading(false));
  }, []);

  async function upgrade(planName: string) {
    if (planName === "free") return;
    setUpgrading(planName);
    try {
      const r = await apiFetch<{ url?: string; demo?: boolean; message?: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan_name: planName, billing_cycle: billing }),
      });
      if (r.demo || !r.url) {
        toast(r.message || "Stripe not configured — add STRIPE_SECRET_KEY to .env", "info");
      } else {
        window.location.href = r.url;
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Upgrade failed", "error");
    } finally { setUpgrading(null); }
  }

  async function cancel() {
    if (!confirm("Cancel subscription? You'll be downgraded to Free at period end.")) return;
    setCancelling(true);
    try {
      await apiFetch("/billing/cancel", { method: "POST" });
      toast("Subscription cancelled", "success");
      const s = await apiFetch<SubscriptionOut>("/billing/subscription");
      setSub(s);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to cancel", "error");
    } finally { setCancelling(false); }
  }

  const currentPlan = sub?.plan.name || "free";

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-emerald-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-8">

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Simple, transparent pricing</h1>
          <p className="text-zinc-400 text-sm">For Indian SMBs and Shopify sellers. Cancel anytime.</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-2 mt-5 rounded-full border border-zinc-700 bg-zinc-900 p-1">
            <button onClick={() => setBilling("monthly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${billing === "monthly" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"}`}>
              Monthly
            </button>
            <button onClick={() => setBilling("yearly")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${billing === "yearly" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"}`}>
              Yearly <span className="text-xs text-emerald-400 ml-1">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Current plan banner */}
        {sub && (
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {PLAN_ICONS[currentPlan]}
              <div>
                <p className="text-sm font-semibold text-white">
                  Current plan: <span className="text-emerald-400">{sub.plan.display_name}</span>
                </p>
                <p className="text-xs text-zinc-500">
                  Status: {sub.status}
                  {sub.cancel_at_period_end && " · Cancels at period end"}
                  {sub.current_period_end && ` · Renews ${new Date(sub.current_period_end).toLocaleDateString("en-IN")}`}
                </p>
              </div>
            </div>
            {sub.plan.name !== "free" && !sub.cancel_at_period_end && (
              <button onClick={cancel} disabled={cancelling}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-800 rounded-lg px-3 py-1.5 transition-colors">
                {cancelling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Cancel subscription
              </button>
            )}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {plans.map(plan => {
            const isCurrent = plan.name === currentPlan;
            const price     = billing === "yearly" ? Math.round(plan.price_yearly / 12) : plan.price_monthly;

            return (
              <div key={plan.name}
                className={`relative rounded-2xl border bg-zinc-900/40 p-5 flex flex-col ${isCurrent ? "border-emerald-600 ring-1 ring-emerald-600/40" : PLAN_COLORS[plan.name]}`}>

                {plan.name === "pro" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 text-white text-xs font-semibold px-3 py-0.5">
                    Most popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  {PLAN_ICONS[plan.name]}
                  <span className="font-semibold text-white">{plan.display_name}</span>
                  {isCurrent && <span className="ml-auto text-xs text-emerald-400 border border-emerald-800 rounded-full px-2 py-0.5">Current</span>}
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-bold text-white">
                    {price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`}
                  </span>
                  {price > 0 && <span className="text-xs text-zinc-500 ml-1">/month{billing === "yearly" ? " (billed yearly)" : ""}</span>}
                </div>

                {/* Limits */}
                <div className="space-y-1.5 mb-5 flex-1">
                  <div className="text-xs text-zinc-400">{fmt(plan.max_orgs)} organisation{plan.max_orgs !== 1 ? "s" : ""}</div>
                  <div className="text-xs text-zinc-400">{fmt(plan.max_txns_month)} transactions/month</div>
                  <div className="text-xs text-zinc-400">{fmt(plan.max_team_members)} team member{plan.max_team_members !== 1 ? "s" : ""}</div>
                  <div className="my-2 border-t border-zinc-800" />
                  {FEATURES.map(({ key, label }) => (
                    <div key={String(key)} className={`flex items-center gap-1.5 text-xs ${plan[key] ? "text-zinc-300" : "text-zinc-600"}`}>
                      {plan[key]
                        ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        : <span className="w-3 h-3 rounded-full border border-zinc-700 inline-block shrink-0" />}
                      {label}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => upgrade(plan.name)}
                  disabled={isCurrent || upgrading === plan.name || plan.name === "free"}
                  className={`w-full rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${isCurrent ? "bg-zinc-800 text-zinc-400 cursor-default" : PLAN_BTN[plan.name]}`}>
                  {upgrading === plan.name
                    ? <span className="flex items-center justify-center gap-1.5"><Loader2 size={13} className="animate-spin" />Processing…</span>
                    : isCurrent ? "Current plan"
                    : plan.name === "free" ? "Free forever"
                    : `Upgrade to ${plan.display_name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3 text-left text-zinc-400 font-medium text-xs">Feature</th>
                {plans.map(p => (
                  <th key={p.name} className={`px-4 py-3 text-center text-xs font-medium ${p.name === currentPlan ? "text-emerald-400" : "text-zinc-400"}`}>
                    {p.display_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {[
                { label: "Organisations",       vals: plans.map(p => fmt(p.max_orgs)) },
                { label: "Transactions/month",  vals: plans.map(p => fmt(p.max_txns_month)) },
                { label: "Team members",        vals: plans.map(p => fmt(p.max_team_members)) },
                { label: "AI CFO Insights",     vals: plans.map(p => p.ai_insights) },
                { label: "Excel P&L Export",    vals: plans.map(p => p.excel_export) },
                { label: "Email Reports",       vals: plans.map(p => p.email_reports) },
                { label: "API Access",          vals: plans.map(p => p.api_access) },
                { label: "GST Reconciliation",  vals: plans.map(() => true) },
                { label: "CSV Upload",          vals: plans.map(() => true) },
                { label: "GSTIN Validator",     vals: plans.map(() => true) },
              ].map(row => (
                <tr key={row.label} className="hover:bg-zinc-900/40">
                  <td className="px-5 py-3 text-zinc-300">{row.label}</td>
                  {row.vals.map((v, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      {typeof v === "boolean"
                        ? v
                          ? <CheckCircle2 size={14} className="mx-auto text-emerald-400" />
                          : <span className="text-zinc-700">—</span>
                        : <span className="text-xs text-zinc-400">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stripe note */}
        <div className="mt-6 text-center text-xs text-zinc-600">
          Payments powered by Stripe · All prices in INR · GST applicable as per regulations ·
          {" "}<button onClick={() => router.push("/settings")} className="hover:text-zinc-400 underline">Manage billing</button>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 size={28} className="animate-spin text-emerald-400" /></div>}>
      <BillingContent />
    </Suspense>
  );
}
