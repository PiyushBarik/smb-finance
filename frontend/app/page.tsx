import Link from "next/link";
import { BarChart3, ShieldCheck, Zap, Receipt } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/50 px-4 py-1.5 text-emerald-400 text-sm mb-8">
          <Zap size={14} />
          Built for Indian SMBs & Shopify Sellers
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl">
          Your finances,{" "}
          <span className="text-emerald-400">crystal clear.</span>
        </h1>

        <p className="text-zinc-400 text-lg max-w-xl mb-10">
          Upload your Shopify or bank CSV, get instant GST reconciliation, expense categorisation,
          and plain-English CFO insights — no accountant needed.
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/register"
            className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-6 py-3 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 hover:border-zinc-500 text-white px-6 py-3 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="border-t border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-5xl px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Receipt size={22} />,
              title: "GST Reconciliation",
              desc: "Match your Shopify payouts against bank statements. Spot discrepancies instantly.",
            },
            {
              icon: <BarChart3 size={22} />,
              title: "Smart Categorisation",
              desc: "Expenses auto-tagged into marketing, logistics, salaries, subscriptions and more.",
            },
            {
              icon: <ShieldCheck size={22} />,
              title: "CFO Insights",
              desc: "Plain-English summaries of cashflow health, top cost drivers, and action items.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-zinc-800 p-6">
              <div className="text-emerald-400 mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-zinc-800 text-center py-6 text-zinc-600 text-xs">
        ClarityBooks MVP — Phase 1 · Built with FastAPI + Next.js
      </footer>
    </main>
  );
}
