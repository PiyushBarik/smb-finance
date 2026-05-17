"use client";

import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ComposedChart, Line, ResponsiveContainer, ReferenceLine,
} from "recharts";

/* ── exported types ───────────────────────────────────────────────────────── */
export interface CategoryTotal {
  category: string;
  total:    number;
  count:    number;
  percentage: number;
}
export interface MonthlyPoint {
  month:       string;
  month_label: string;
  income:      number;
  expenses:    number;
  net:         number;
}

/* ── colour map — matches JSX reference exactly ───────────────────────────── */
const CAT_COLOR: Record<string, string> = {
  "Inventory & COGS":         "#fb7185",
  "Salaries & Payroll":       "#f472b6",
  "Advertising & Marketing":  "#fbbf24",
  "GST & Tax":                "#a78bfa",
  "Logistics & Shipping":     "#60a5fa",
  "Rent & Utilities":         "#34d399",
  "Software & Subscriptions": "#22d3ee",
  "Travel & Meals":           "#f87171",
  "Banking & Finance":        "#94a3b8",
  "Uncategorised":            "#475569",
};
const FALLBACK = ["#60a5fa","#34d399","#f472b6","#fbbf24","#fb923c","#a78bfa","#38bdf8","#f87171","#4ade80","#e879f9"];
function catColor(name: string, idx: number): string {
  return CAT_COLOR[name] ?? FALLBACK[idx % FALLBACK.length];
}

/* ── formatters — identical to JSX reference ──────────────────────────────── */
export function fmtINR(v: number): string {
  const abs  = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000)    return `${sign}₹${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000)       return `${sign}₹${(abs / 1_000).toFixed(0)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}
const fmtFull = (v: number) => `₹${Math.round(Math.abs(v)).toLocaleString("en-IN")}`;

/* ── shared tooltip — ported directly from JSX reference ─────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  const tooltipStyle: React.CSSProperties = {
    borderRadius: 10,
    border: "1px solid rgba(71,85,105,0.6)",
    background: "rgba(15,23,42,0.96)",
    backdropFilter: "blur(8px)",
    padding: "12px 16px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
    fontFamily: "'Manrope', system-ui, sans-serif",
  };
  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" };

  return (
    <div style={tooltipStyle}>
      {/* Monthly trend rows — data keys are lowercase: income, expense, net */}
      {row.income !== undefined && (
        <>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#64748b", marginBottom: 10, fontWeight: 500 }}>
            {label} · FY 25–26
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            {[
              { label: "Income",  swatch: "#34d399", val: fmtINR(row.income),  color: "#6ee7b7" },
              { label: "Expense", swatch: "#fb7185", val: fmtINR(row.expense), color: "#fda4af" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, color: "#cbd5e1" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: r.swatch, display: "inline-block" }} />
                  {r.label}
                </span>
                <span style={{ ...mono, color: r.color }}>{r.val}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid rgba(71,85,105,0.4)", paddingTop: 6, marginTop: 2, display: "flex", justifyContent: "space-between", gap: 24 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, color: "#cbd5e1" }}>
                <span style={{ width: 12, height: 2, background: "#38bdf8", display: "inline-block" }} />
                Net
              </span>
              <span style={{ ...mono, color: "#7dd3fc", fontWeight: 500 }}>{fmtINR(row.net)}</span>
            </div>
          </div>
        </>
      )}
      {/* Category bar rows — data key is value */}
      {row.value !== undefined && row.income === undefined && (
        <div>
          <div style={{ ...mono, color: "#f1f5f9", fontSize: 15 }}>{fmtFull(row.value)}</div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{row.pct?.toFixed(1)}% of total expense</div>
        </div>
      )}
      {/* Donut rows — data key is absVal */}
      {row.absVal !== undefined && (
        <div>
          <div style={{ ...mono, color: "#f1f5f9", fontSize: 15 }}>{fmtFull(row.absVal)}</div>
          <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{row.pct?.toFixed(1)}% of total</div>
        </div>
      )}
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
function expenseItems(data: CategoryTotal[]) {
  return data
    .filter(d => d.total < 0 && d.category !== "Income / Revenue")
    .map((d, i) => ({
      name:   d.category,
      absVal: Math.abs(d.total),               // donut dataKey
      value:  Math.abs(d.total),               // bar dataKey  ← JSX reference uses "value"
      pct:    d.percentage,
      color:  catColor(d.category, i),
    }));
}

function NoData({ h = 320 }: { h?: number }) {
  return (
    <div style={{ height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, border: "1px solid rgba(30,41,59,0.8)", background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📊</div>
      <p style={{ fontSize: 13, color: "#475569", fontFamily: "'Manrope', system-ui, sans-serif" }}>No data yet — upload a CSV to get started.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Chart 1 — Monthly Trend
   Data shape: { month_label, income, expense, net }  (all lowercase, "expense" not "expenses")
   Matches JSX reference exactly.
═══════════════════════════════════════════════════════════════════════════ */
export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  // Map backend field "expenses" (negative) → "expense" (positive absolute) to match JSX reference
  const chartData = useMemo(() =>
    data.map(d => ({
      month:   d.month_label,          // XAxis dataKey
      income:  Math.round(d.income),
      expense: Math.round(Math.abs(d.expenses)),  // lowercase "expense" — matches JSX ref & tooltip
      net:     Math.round(d.net),
    })),
  [data]);

  if (!chartData.length) return <NoData h={360} />;

  const hasMany = chartData.length > 7;

  return (
    <>
      {/* Explicit pixel height — avoids ResponsiveContainer getting 0 in grid layouts */}
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 24, right: 16, left: 4, bottom: hasMany ? 32 : 8 }} barCategoryGap="22%">
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#34d399" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.70} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fb7185" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#e11d48" stopOpacity={0.70} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false} tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12, fontFamily: "var(--font-ui)" }}
            angle={hasMany ? -35 : 0}
            height={hasMany ? 48 : 28}
            textAnchor={hasMany ? "end" : "middle"}
            interval={hasMany ? 0 : "preserveStartEnd"}
            dy={8}
          />
          <YAxis
            axisLine={false} tickLine={false}
            tick={{ fill: "#64748b", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v: number) => fmtINR(v)}
            width={60}
          />
          <ReferenceLine y={0} stroke="#334155" strokeDasharray="2 4" />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
          {/* dataKeys must exactly match the transformed data object keys */}
          <Bar dataKey="income"  fill="url(#incomeFill)"  radius={[4,4,0,0]} maxBarSize={22} minPointSize={2} />
          <Bar dataKey="expense" fill="url(#expenseFill)" radius={[4,4,0,0]} maxBarSize={22} minPointSize={2} />
          <Line
            type="monotone" dataKey="net"
            stroke="#38bdf8" strokeWidth={2.5}
            dot={{ r: 3, fill: "#0f172a", stroke: "#38bdf8", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "#38bdf8", stroke: "#0f172a", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Manual legend — matches JSX reference footer */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20,
        padding: "14px 8px 4px", borderTop: "1px solid rgba(30,41,59,0.7)",
        fontSize: 12, fontFamily: "'Manrope', system-ui, sans-serif",
      }}>
        {[
          { label: "Income",  el: <span style={{ width: 10, height: 10, borderRadius: 2, background: "#34d399", display: "inline-block" }} /> },
          { label: "Expense", el: <span style={{ width: 10, height: 10, borderRadius: 2, background: "#fb7185", display: "inline-block" }} /> },
          { label: "Net",     el: <span style={{ width: 16, height: 2, background: "#38bdf8", display: "inline-block", verticalAlign: "middle" }} /> },
        ].map(({ label, el }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b" }}>
            {el} {label}
          </span>
        ))}
        <span style={{ marginLeft: "auto", color: "#334155", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
          12 months · INR
        </span>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Chart 2 — By Category (horizontal bars)
   Data shape: { name, value, pct, color }
   JSX reference uses dataKey="value" — must match.
═══════════════════════════════════════════════════════════════════════════ */
export function ExpenseBarChart({ data }: { data: CategoryTotal[] }) {
  const chartData = useMemo(() =>
    expenseItems(data)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
  [data]);

  if (!chartData.length) return <NoData h={360} />;

  const h = Math.max(320, chartData.length * 42 + 40);

  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 80, left: 0, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" horizontal={false} />
        <XAxis
          type="number"
          axisLine={false} tickLine={false}
          tick={{ fill: "#64748b", fontSize: 11, fontFamily: "var(--font-mono)" }}
          tickFormatter={(v: number) => fmtINR(v)}
        />
        <YAxis
          type="category" dataKey="name"
          axisLine={false} tickLine={false}
          tick={{ fill: "#cbd5e1", fontSize: 12, fontFamily: "var(--font-ui)" }}
          width={180}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.04)" }} />
        {/* dataKey="value" — matches JSX reference and our data object */}
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26} minPointSize={3}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Chart 3 — Expense Breakdown (donut + hover-synced list)
   Ported directly from JSX reference ExpenseBreakdownChart.
   dataKey="absVal" on Pie — distinct from bar's "value" to avoid tooltip collision.
═══════════════════════════════════════════════════════════════════════════ */
export function ExpensePieChart({ data }: { data: CategoryTotal[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sorted = useMemo(() =>
    expenseItems(data).sort((a, b) => b.absVal - a.absVal),
  [data]);

  const total = useMemo(() => sorted.reduce((s, d) => s + d.absVal, 0), [sorted]);

  if (!sorted.length) return <NoData h={360} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 32, alignItems: "center" }}>

      {/* Donut — fixed height keeps ResponsiveContainer stable in grid */}
      <div style={{ position: "relative", minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Pie
              data={sorted}
              dataKey="absVal"
              cx="50%" cy="50%"
              innerRadius={92} outerRadius={140}
              paddingAngle={1.5}
              stroke="none"
              isAnimationActive={false}
              onMouseEnter={(_, i) => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {sorted.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  fillOpacity={hoverIdx === null ? 0.92 : hoverIdx === i ? 1 : 0.35}
                  style={{ transition: "fill-opacity 200ms", cursor: "pointer" }}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label — absolute positioned over the SVG */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#64748b", fontWeight: 500, fontFamily: "'Manrope', system-ui, sans-serif" }}>
            Total Expense
          </div>
          <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, color: "#f8fafc", lineHeight: 1.1, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
            {fmtINR(total)}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4, fontFamily: "'Manrope', system-ui, sans-serif" }}>
            FY 25–26
          </div>
        </div>
      </div>

      {/* Ranked list — hover-synced with donut slices */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        {sorted.map((c, i) => (
          <div
            key={c.name}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "7px 8px", margin: "0 -8px",
              borderRadius: 7,
              background: hoverIdx === i ? "rgba(30,41,59,0.7)" : "transparent",
              transition: "background 150ms", cursor: "default",
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: "#cbd5e1", fontFamily: "'Manrope', system-ui, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.name}
            </span>
            {/* Mini bar */}
            <div style={{ width: 80, height: 3, borderRadius: 99, background: "#1e293b", flexShrink: 0, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${total > 0 ? (c.absVal / total) * 100 : 0}%`, background: c.color, opacity: 0.85 }} />
            </div>
            <span style={{ width: 60, textAlign: "right", fontSize: 13, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
              {fmtINR(c.absVal)}
            </span>
            <span style={{ width: 40, textAlign: "right", fontSize: 11, color: "#64748b", fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
              {((total > 0 ? c.absVal / total : 0) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
