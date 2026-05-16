const CATEGORY_COLORS: Record<string, string> = {
  "Income / Revenue":          "bg-emerald-950/60 text-emerald-400 border-emerald-800",
  "Advertising & Marketing":   "bg-purple-950/60 text-purple-400 border-purple-800",
  "Software & Subscriptions":  "bg-sky-950/60 text-sky-400 border-sky-800",
  "Logistics & Shipping":      "bg-orange-950/60 text-orange-400 border-orange-800",
  "Inventory & COGS":          "bg-yellow-950/60 text-yellow-400 border-yellow-800",
  "Salaries & Payroll":        "bg-blue-950/60 text-blue-400 border-blue-800",
  "Rent & Utilities":          "bg-cyan-950/60 text-cyan-400 border-cyan-800",
  "GST & Tax":                 "bg-red-950/60 text-red-400 border-red-800",
  "Banking & Finance":         "bg-indigo-950/60 text-indigo-400 border-indigo-800",
  "Travel & Meals":            "bg-pink-950/60 text-pink-400 border-pink-800",
  "Uncategorised":             "bg-zinc-800/60 text-zinc-400 border-zinc-700",
};

export function CategoryBadge({ category }: { category?: string | null }) {
  const cat = category || "Uncategorised";
  const cls = CATEGORY_COLORS[cat] || "bg-zinc-800/60 text-zinc-400 border-zinc-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}>
      {cat}
    </span>
  );
}

export function StatusBadge({ reconciled }: { reconciled: boolean }) {
  return reconciled ? (
    <span className="inline-flex items-center rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 px-2 py-0.5 text-xs">✓ Matched</span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-zinc-800/60 border border-zinc-700 text-zinc-500 px-2 py-0.5 text-xs">Pending</span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    shopify: "bg-green-950/60 text-green-400 border-green-800",
    bank:    "bg-blue-950/60 text-blue-400 border-blue-800",
    manual:  "bg-zinc-800/60 text-zinc-400 border-zinc-700",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs capitalize ${map[source] || map.manual}`}>
      {source}
    </span>
  );
}
