"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, setToken } from "@/lib/api";
import { BarChart3, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

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

const PERKS = [
  "Free forever plan — no credit card needed",
  "GST reconciliation built in",
  "Shopify payout CSV support",
  "AI CFO insights on Pro",
];

function RegisterForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") || "/dashboard";

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await apiFetch<{ access_token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setToken(data.access_token);
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0e1a",
      display: "grid", gridTemplateColumns: "1fr 1fr",
      fontFamily: "'Manrope', system-ui, sans-serif",
    }}
      className="register-grid"
    >
      <style>{CSS + `
        @media (max-width: 768px) {
          .register-grid { grid-template-columns: 1fr !important; }
          .register-left  { display: none !important; }
        }
      `}</style>

      {/* Grain */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* Left panel — value prop */}
      <div className="register-left" style={{
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "60px 56px",
        borderRight: "1px solid rgba(30,41,59,0.6)",
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(52,211,153,0.05), rgba(56,189,248,0.03))" }} />
        <div style={{ position: "absolute", bottom: -80, right: -80, width: 300, height: 300,
          borderRadius: "50%", background: "rgba(52,211,153,0.06)", filter: "blur(60px)" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48, color: "#34d399" }}>
            <BarChart3 size={20} />
            <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 20 }}>ClarityBooks</span>
          </div>

          <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#475569", marginBottom: 16 }}>
            Built for Indian SMBs
          </div>
          <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(28px,3vw,40px)",
            color: "#f8fafc", lineHeight: 1.15, margin: "0 0 32px" }}>
            Your CFO, <em style={{ color: "#475569", fontStyle: "italic" }}>without the salary</em>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {PERKS.map(p => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={14} style={{ color: "#34d399", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#94a3b8" }}>{p}</span>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 40, padding: "16px 20px",
            borderRadius: 12, border: "1px solid rgba(30,41,59,0.8)",
            background: "rgba(15,23,42,0.5)",
          }}>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, fontStyle: "italic" }}>
              "Reconciled 14 months of Shopify payouts in 20 minutes. GST summary ready for my CA instantly."
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "#475569" }}>
              — Ankit S., D2C brand founder, Jaipur
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>
          {/* Mobile brand */}
          <div style={{ textAlign: "center", marginBottom: 28, display: "none" }} className="mobile-brand">
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#34d399" }}>
              <BarChart3 size={20} />
              <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 20 }}>ClarityBooks</span>
            </Link>
          </div>

          <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 30, color: "#f8fafc", margin: "0 0 4px" }}>
            Create account
          </h1>
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 28px" }}>Free forever — no credit card needed</p>

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
            {[
              { label: "Your name",   type: "text",     val: name,     set: setName,     ph: "Raj Sharma"      },
              { label: "Email",       type: "email",    val: email,    set: setEmail,    ph: "you@company.com" },
              { label: "Password",    type: "password", val: password, set: setPassword, ph: "Min. 6 characters" },
            ].map(({ label, type, val, set, ph }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#475569", marginBottom: 6 }}>
                  {label}
                </label>
                <input type={type} value={val} onChange={e => set(e.target.value)}
                  required minLength={type === "password" ? 6 : undefined}
                  placeholder={ph} className="auth-input" />
              </div>
            ))}

            <button type="submit" disabled={loading} className="auth-btn" style={{ marginTop: 8 }}>
              {loading && <Loader2 size={15} className="animate-spin" />}
              Create free account
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13, color: "#475569", marginTop: 24 }}>
            Already have an account?{" "}
            <Link href={`/login${redirect !== "/dashboard" ? `?redirect=${redirect}` : ""}`}
              style={{ color: "#34d399", textDecoration: "none", fontWeight: 500 }}>
              Sign in
            </Link>
          </p>

          <p style={{ textAlign: "center", fontSize: 11, color: "#1e293b", marginTop: 28 }}>
            By creating an account you agree to our terms · Data hosted securely
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0e1a" }} />}>
      <RegisterForm />
    </Suspense>
  );
}
