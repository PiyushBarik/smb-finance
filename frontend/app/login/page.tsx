"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, setToken } from "@/lib/api";
import { BarChart3, Loader2 } from "lucide-react";

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirect     = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2 text-emerald-400 font-bold text-xl">
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
