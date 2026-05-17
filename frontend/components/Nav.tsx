"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";
import {
  BarChart3, LogOut, LayoutDashboard, Upload, List,
  GitMerge, TrendingUp, Settings, CreditCard,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard",    label: "Dashboard",  icon: LayoutDashboard },
  { href: "/transactions", label: "Ledger",     icon: List            },
  { href: "/reports",      label: "Reports",    icon: TrendingUp      },
  { href: "/reconcile",    label: "Reconcile",  icon: GitMerge        },
  { href: "/upload",       label: "Upload",     icon: Upload          },
  { href: "/billing",      label: "Billing",    icon: CreditCard      },
];

export default function Nav() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      borderBottom: "1px solid rgba(30,41,59,0.8)",
      background: "rgba(10,14,26,0.85)",
      backdropFilter: "blur(16px)",
      fontFamily: "'Manrope', system-ui, sans-serif",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56,
      }}>
        {/* Brand */}
        <Link href="/dashboard" style={{
          display: "flex", alignItems: "center", gap: 8,
          textDecoration: "none", color: "#34d399",
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontSize: 20, fontWeight: 400, letterSpacing: "-0.01em",
          flexShrink: 0,
        }}>
          <BarChart3 size={18} />
          ClarityBooks
        </Link>

        {/* Desktop links */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }} className="hidden-mobile">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                fontSize: 13, textDecoration: "none", fontWeight: 500,
                color: active ? "#34d399" : "#64748b",
                background: active ? "rgba(52,211,153,0.08)" : "transparent",
                transition: "all 150ms",
              }}>
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Link href="/settings" style={{
            padding: 8, borderRadius: 8, display: "flex", alignItems: "center",
            color: pathname === "/settings" ? "#34d399" : "#475569",
            textDecoration: "none", transition: "color 150ms",
          }}>
            <Settings size={15} />
          </Link>
          <button onClick={() => { clearToken(); router.push("/login"); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 8, border: "none",
            background: "transparent", cursor: "pointer",
            color: "#475569", fontSize: 13, fontFamily: "inherit",
            transition: "color 150ms",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "#fb7185")}
            onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div style={{
        borderTop: "1px solid rgba(30,41,59,0.6)",
        display: "flex", overflowX: "auto", gap: 4,
        padding: "6px 16px 8px",
      }} className="show-mobile">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 10px", borderRadius: 7, fontSize: 11,
              whiteSpace: "nowrap", textDecoration: "none", fontWeight: 500,
              color: active ? "#34d399" : "#64748b",
              background: active ? "rgba(52,211,153,0.08)" : "transparent",
            }}>
              <Icon size={11} />
              {label}
            </Link>
          );
        })}
      </div>

      <style>{`
        @media (min-width: 768px) { .show-mobile { display: none !important; } }
        @media (max-width: 767px) { .hidden-mobile { display: none !important; } }
      `}</style>
    </nav>
  );
}            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-emerald-950/60 text-emerald-400"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className={`p-2 rounded-lg text-sm transition-colors ${
              pathname === "/settings" ? "text-emerald-400" : "text-zinc-500 hover:text-white"
            }`}
          >
            <Settings size={16} />
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-950/30"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2 border-t border-zinc-800/50">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                active ? "bg-emerald-950/60 text-emerald-400" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon size={12} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
