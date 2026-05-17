"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, setToken } from "@/lib/api";
import { BarChart3, Loader2, AlertCircle } from "lucide-react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; }
  input::placeholder { color: #334155; }
  input:focus { outline: none; border-color: #34d399 !important; }
  .auth-input {
    width: 100%; padding: 11px 14px;
    border-radius: 10px; border: 1px solid rgba(30,41,59,0.9);
    background: rgba(15,23,42,0.7); color: #f1f5f9;
    font-size: 14px; font-family: 'Manrope', system-ui, sans-serif;
    transition: border-color 150ms;
  }
  .auth-btn {
    width: 100%; padding: 11px;
    border-radius: 10px; border: none; cursor: pointer;
    background: #f1f5f9; color: #0f172a;
    font-size: 14px; font-weight: 700;
    font-family: 'Manrope', system-ui, sans-serif;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 150ms;
  }
  .auth-btn:hover:not(:disabled) { background: #e2e8f0; }
  .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
`;

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") || "/dashboard";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0e1a", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "'Manrope', system-ui, sans-serif",
    }}>
      <style>{CSS}</style>

      {/* Grain */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
      {/* Glow */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 300, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(52,211,153,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#34d399" }}>
            <BarChart3 size={22} />
            <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22 }}>ClarityBooks</span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          borderRadius: 20, border: "1px solid rgba(30,41,59,0.8)",
          background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)",
          padding: "36px 32px",
        }}>
          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, color: "#f8fafc", margin: "0 0 4px", lineHeight: 1 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 28px" }}>Sign in to your account</p>

          {error && (
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-start",
              padding: "12px 14px", marginBottom: 20,
              borderRadius: 10, background: "rgba(251,113,133,0.08)",
              border: "1px solid rgba(251,113,133,0.2)", color: "#fda4af", fontSize: 13,
            }}>
              <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", marginBottom: 6 }}>
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@company.com" className="auth-input" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569" }}>
                  Password
                </label>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" className="auth-input" />
            </div>
            <button type="submit" disabled={loading} className="auth-btn">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Sign in
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(30,41,59,0.8)" }} />
            <span style={{ fontSize: 11, color: "#334155" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(30,41,59,0.8)" }} />
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "#475569", marginTop: 20 }}>
            No account?{" "}
            <Link href={`/register${redirect !== "/dashboard" ? `?redirect=${redirect}` : ""}`}
              style={{ color: "#34d399", textDecoration: "none", fontWeight: 500 }}>
              Create one free
            </Link>
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#1e293b", marginTop: 20 }}>
          Secured with JWT · Data stays in your org
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0e1a" }} />}>
      <LoginForm />
    </Suspense>
  );
}          <Link href="/" className="flex items-center gap-2 text-emerald-400 font-bold text-xl">
            <BarChart3 size={24} /> ClarityBooks
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
          <h1 className="text-xl font-bold mb-1">Welcome back</h1>
          <p className="text-sm text-zinc-500 mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-950/60 border border-red-900 text-red-400 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 font-semibold py-2.5 transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            No account?{" "}
            <Link href={`/register${redirect !== "/dashboard" ? `?redirect=${redirect}` : ""}`}
              className="text-emerald-400 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <LoginForm />
    </Suspense>
  );
}
