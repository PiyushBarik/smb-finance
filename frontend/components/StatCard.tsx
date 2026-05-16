interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color?: "green" | "red" | "blue" | "default";
}

const colorMap = {
  green: "text-emerald-400 border-emerald-900 bg-emerald-950/30",
  red: "text-red-400 border-red-900 bg-red-950/30",
  blue: "text-sky-400 border-sky-900 bg-sky-950/30",
  default: "text-white border-zinc-800 bg-zinc-900/40",
};

export default function StatCard({ label, value, sub, color = "default" }: StatCardProps) {
  return (
    <div className={`rounded-xl border px-5 py-4 ${colorMap[color]}`}>
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color !== "default" ? "" : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
