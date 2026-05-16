"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ComposedChart, Line,
} from "recharts";

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyPoint {
  month: string;
  month_label: string;
  income: number;
  expenses: number;
  net: number;
}

const COLORS = [
  "#34d399", "#60a5fa", "#f472b6", "#facc15", "#fb923c",
  "#a78bfa", "#38bdf8", "#f87171", "#4ade80", "#e879f9",
];

const fmtINR = (v: number) =>
  `₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: 8,
  fontSize: 12,
};

function Spinner({ height }: { height: number }) {
  return (
    <div style={{ height }} className="flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );
}

function ChartShell({
  height = 280,
  children,
}: {
  height?: number;
  children: (width: number, height: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const measured = Math.floor(el.getBoundingClientRect().width);
      setWidth(measured > 0 ? measured : 0);
    };

    update();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const chartWidth = Math.max(260, width || 640);

  return (
    <div ref={ref} className="w-full min-w-0" style={{ height }}>
      {mounted ? children(chartWidth, height) : <Spinner height={height} />}
    </div>
  );
}

function NoData({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

function expenseItems(data: CategoryTotal[]) {
  return data
    .filter(d => d.total < 0 && d.category !== "Income / Revenue")
    .map(d => ({ ...d, abs: Math.abs(d.total) }));
}

export function ExpensePieChart({ data }: { data: CategoryTotal[] }) {
  const expenses = useMemo(() => expenseItems(data), [data]);

  if (!expenses.length) return <NoData>No expense data yet.</NoData>;

  return (
    <ChartShell height={280}>
      {(width, height) => {
        const outerRadius = Math.max(72, Math.min(104, Math.floor(Math.min(width, height) * 0.36)));
        return (
          <PieChart width={width} height={height}>
            <Pie
              data={expenses}
              dataKey="abs"
              nameKey="category"
              cx="50%"
              cy="48%"
              outerRadius={outerRadius}
              innerRadius={Math.floor(outerRadius * 0.52)}
              label={({ category, percentage }) =>
                Number(percentage) > 6 ? `${String(category).split(" ")[0]} ${Number(percentage).toFixed(0)}%` : ""
              }
              labelLine={false}
            >
              {expenses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => fmtINR(Number(v))} contentStyle={tooltipStyle} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "#a1a1aa", paddingTop: 8 }}
            />
          </PieChart>
        );
      }}
    </ChartShell>
  );
}

export function ExpenseBarChart({ data }: { data: CategoryTotal[] }) {
  const chartData = useMemo(() => expenseItems(data)
    .map(d => ({
      name: d.category.length > 22 ? `${d.category.slice(0, 22)}...` : d.category,
      amount: Math.abs(d.total),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8), [data]);

  if (!chartData.length) return <NoData>No expense data yet.</NoData>;

  return (
    <ChartShell height={280}>
      {(width, height) => {
        const yAxisWidth = Math.min(150, Math.max(96, Math.floor(width * 0.28)));
        return (
          <BarChart
            width={width}
            height={height}
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 24, top: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickFormatter={(v: number) => fmtINR(Number(v))}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              width={yAxisWidth}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip formatter={(v: number) => fmtINR(Number(v))} contentStyle={tooltipStyle} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        );
      }}
    </ChartShell>
  );
}

export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  const chartData = useMemo(() => data.map(d => ({
    name: d.month_label,
    income: Math.round(d.income),
    expenses: Math.round(Math.abs(d.expenses)),
    net: Math.round(d.net),
  })), [data]);

  if (!chartData.length) return <NoData>Upload multiple months of data to see trends.</NoData>;

  return (
    <ChartShell height={280}>
      {(width, height) => (
        <ComposedChart
          width={width}
          height={height}
          data={chartData}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickFormatter={(v: number) => fmtINR(Number(v))}
            width={76}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(v: number) => fmtINR(Number(v))} contentStyle={tooltipStyle} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
          <Bar dataKey="income" name="Income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Line
            type="monotone"
            dataKey="net"
            name="Net"
            stroke="#60a5fa"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={{ r: 3, fill: "#60a5fa" }}
          />
        </ComposedChart>
      )}
    </ChartShell>
  );
}
