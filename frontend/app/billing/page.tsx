"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Nav from "@/components/Nav";
import { useToast } from "@/components/Toast";
import { CheckCircle2, Loader2, Zap, Crown, Building2, Sparkles, X } from "lucide-react";

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

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free:     <Building2 size={20} className="text-zinc-400" />,
  starter:  <Zap       size={20} className="text-sky-400"  />,
  pro:      <Sparkles  size={20} className="text-purple-400" />,
  business: <Crown     size={20} className="text-yellow-400" />,
};

const PLAN_COLORS: Record<string, string> = {
  free:     "border-zinc-700",
  starter:  "border-sky-700",
  pro:      "border-purple-700",
  business: "border-yellow-700",
};

const PLAN_BTN: Record<string, string> = {
  free:     "bg-zinc-700 hover:bg-zinc-600 text-white",
  starter:  "bg-sky-600 hover:bg-sky-500 text-white",
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
