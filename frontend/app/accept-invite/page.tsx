"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, getToken } from "@/lib/api";
import { Loader2, CheckCircle2, XCircle, BarChart3 } from "lucide-react";

function AcceptInviteInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token");

  const [status, setStatus]   = useState<"loading"|"success"|"error"|"login">("loading");
  const [message, setMessage] = useState("");
  const [orgId, setOrgId]     = useState<number | null>(null);

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("No invite token found in URL."); return; }
    if (!getToken()) { setStatus("login"); return; }
    accept();
  }, [token]);

  async function accept() {
    setStatus("loading");
    try {
      const r = await apiFetch<{ message: string; org_id: number }>("/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setOrgId(r.org_id);
      setStatus("success");
      setMessage(r.message);
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to accept invite");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-400 font-bold text-lg mb-8">
          <BarChart3 size={22} /> ClarityBooks
        </Link>

        {status === "loading" && (
          <div>
            <Loader2 size={36} className="animate-spin text-emerald-400 mx-auto mb-3" />
            <p className="text-zinc-400">Accepting invite…</p>
          </div>
        )}

        {status === "success" && (
          <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-6">
            <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">You're in! 🎉</h2>
            <p className="text-zinc-400 text-sm mb-4">{message}</p>
            <p className="text-xs text-zinc-500">Redirecting to dashboard…</p>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-800 bg-red-950/30 p-6">
            <XCircle size={36} className="text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Invite failed</h2>
            <p className="text-zinc-400 text-sm mb-4">{message}</p>
            <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline">
              Go to dashboard
            </Link>
          </div>
        )}

        {status === "login" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold mb-2">Sign in first</h2>
            <p className="text-zinc-400 text-sm mb-4">
              You need to be logged in to accept this invite.
            </p>
            <Link
              href={`/login?redirect=/accept-invite?token=${token}`}
              className="block w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 text-sm transition-colors"
            >
              Sign in
            </Link>
            <Link href={`/register?redirect=/accept-invite?token=${token}`}
              className="block mt-2 text-xs text-zinc-500 hover:text-zinc-300">
              New here? Create account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-400" size={28} /></div>}>
      <AcceptInviteInner />
    </Suspense>
  );
}
