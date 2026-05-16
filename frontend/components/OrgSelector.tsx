"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Building2, ChevronDown } from "lucide-react";

export interface Org { id: number; name: string; slug: string; gst_number?: string; }

interface Props {
  selected: Org | null;
  onSelect: (org: Org) => void;
}

export default function OrgSelector({ selected, onSelect }: Props) {
  const [orgs, setOrgs]     = useState<Org[]>([]);
  const [open, setOpen]     = useState(false);
  const router              = useRouter();

  useEffect(() => {
    apiFetch<Org[]>("/orgs/")
      .then(data => {
        setOrgs(data);
        if (!selected && data.length > 0) onSelect(data[0]);
      })
      .catch(() => router.push("/login"));
  }, []);

  if (!orgs.length) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-sm hover:border-zinc-500 transition-colors"
      >
        <Building2 size={14} className="text-zinc-400" />
        <span>{selected?.name || "Select org"}</span>
        <ChevronDown size={13} className="text-zinc-500" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl z-20">
          {orgs.map(org => (
            <button
              key={org.id}
              onClick={() => { onSelect(org); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm first:rounded-t-xl last:rounded-b-xl transition-colors ${
                selected?.id === org.id
                  ? "bg-emerald-950/60 text-emerald-400"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {org.name}
              {org.gst_number && (
                <div className="text-xs text-zinc-500 mt-0.5">{org.gst_number}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
