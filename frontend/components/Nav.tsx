"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";
import { BarChart3, LogOut, LayoutDashboard, Upload, List, GitMerge, TrendingUp, Settings, CreditCard } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard",    label: "Dashboard",     icon: LayoutDashboard },
  { href: "/transactions", label: "Ledger",         icon: List },
  { href: "/reports",      label: "Reports",        icon: TrendingUp },
  { href: "/reconcile",    label: "Reconcile",      icon: GitMerge },
  { href: "/upload",       label: "Upload",         icon: Upload },
  { href: "/billing",      label: "Billing",        icon: CreditCard },
];

export default function Nav() {
  const pathname = usePathname();
  const router   = useRouter();

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-14">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-2 text-emerald-400 font-bold text-base tracking-tight shrink-0">
          <BarChart3 size={20} />
          <span>ClarityBooks</span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
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
