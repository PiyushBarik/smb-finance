"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Nav from "@/components/Nav";
import { useToast } from "@/components/Toast";
import {
  CheckCircle2, XCircle, Loader2, Shield, Building2,
  User, Users, Plus, Trash2, Copy, RefreshCw, Crown,
  Eye, Pencil, Key, AlertTriangle, Clock,
} from "lucide-react";

interface UserMe   { id: number; name: string; email: string; }
interface Org      { id: number; name: string; slug: string; gst_number?: string; }
interface Member   { id: number; user_id: number; role: string; name: string; email: string; }
interface Invite   { id: number; email: string; role: string; accepted: boolean; expires_at: string; invite_url?: string; }
interface GSTINRes { valid: boolean; state?: string; pan?: string; state_code?: string; error?: string; }
interface AuditLog { id: number; action: string; user_id?: number; resource?: string; detail?: string; ip_address?: string; created_at: string; }
interface APIKey   { id: number; name: string; key_prefix: string; is_active: boolean; created_at: string; last_used?: string; }

const ROLE_ICON: Record<string, React.ReactNode> = {
  owner:  <Crown  size={12} className="text-yellow-400" />,
  admin:  <Pencil size={12} className="text-sky-400" />,
  viewer: <Eye    size={12} className="text-zinc-400" />,
};
const ROLE_COLOR: Record<string, string> = {
  owner:  "text-yellow-400 border-yellow-800 bg-yellow-950/40",
  admin:  "text-sky-400   border-sky-800   bg-sky-950/40",
  viewer: "text-zinc-400  border-zinc-700  bg-zinc-800/40",
};

export default function SettingsPage() {
  const router    = useRouter();
  const { toast } = useToast();

  const [me, setMe]       = useState<UserMe | null>(null);
  const [orgs, setOrgs]   = useState<Org[]>([]);
  const [org, setOrg]     = useState<Org | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgGST, setOrgGST]   = useState("");
  const [saving, setSaving]   = useState(false);

  // Team
  const [members, setMembers]   = useState<Member[]>([]);
  const [invites, setInvites]   = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState("viewer");
  const [inviting, setInviting]       = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState("");

  // GSTIN
  const [gstinInput, setGstinInput]     = useState("");
  const [gstinResult, setGstinResult]   = useState<GSTINRes | null>(null);
  const [validating, setValidating]     = useState(false);

  // API Keys
  const [apiKeys, setApiKeys]           = useState<APIKey[]>([]);
  const [newKeyName, setNewKeyName]     = useState("");
  const [creatingKey, setCreatingKey]   = useState(false);
  const [revealedKey, setRevealedKey]   = useState<string>("");

  // Audit
  const [auditLogs, setAuditLogs]       = useState<AuditLog[]>([]);

  const [tab, setTab] = useState<"org"|"team"|"keys"|"audit"|"gstin">("org");

  useEffect(() => {
    if (!localStorage.getItem("smb_token")) { router.push("/login"); return; }
    apiFetch<UserMe>("/auth/me").then(setMe).catch(() => router.push("/login"));
    apiFetch<Org[]>("/orgs/").then(data => { setOrgs(data); if (data.length > 0) setOrg(data[0]); });
  }, []);

  useEffect(() => {
    if (!org) return;
    setOrgName(org.name); setOrgGST(org.gst_number || "");
    loadTeam(org.id);
    loadKeys(org.id);
    loadAudit(org.id);
  }, [org]);

  const loadTeam = useCallback(async (id: number) => {
    const [m, i] = await Promise.all([
      apiFetch<Member[]>(`/invites/${id}/members`).catch(() => []),
      apiFetch<Invite[]>(`/invites/${id}`).catch(() => []),
    ]);
    setMembers(m); setInvites(i);
  }, []);

  const loadKeys = useCallback(async (id: number) => {
    apiFetch<APIKey[]>(`/api-keys/${id}`).then(setApiKeys).catch(() => {});
  }, []);

  const loadAudit = useCallback(async (id: number) => {
    apiFetch<AuditLog[]>(`/audit/${id}?limit=50`).then(setAuditLogs).catch(() => {});
  }, []);

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault(); if (!org) return; setSaving(true);
    try {
      await apiFetch<Org>(`/orgs/${org.id}`, { method: "PATCH", body: JSON.stringify({ name: orgName, gst_number: orgGST || undefined }) });
      toast("Saved", "success");
      apiFetch<Org[]>("/orgs/").then(setOrgs);
    } catch (err: unknown) { toast(err instanceof Error ? err.message : "Failed", "error"); }
    finally { setSaving(false); }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault(); if (!org) return; setInviting(true); setNewInviteUrl("");
    try {
      const inv = await apiFetch<Invite>(`/invites/${org.id}`, { method: "POST", body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
      toast(`Invite sent to ${inviteEmail}`, "success");
      setNewInviteUrl(inv.invite_url || ""); setInviteEmail(""); loadTeam(org.id);
    } catch (err: unknown) { toast(err instanceof Error ? err.message : "Failed", "error"); }
    finally { setInviting(false); }
  }

  async function removeM(mid: number) {
    if (!org) return;
    try { await apiFetch(`/invites/${org.id}/members/${mid}`, { method: "DELETE" }); toast("Member removed", "success"); loadTeam(org.id); }
    catch (err: unknown) { toast(err instanceof Error ? err.message : "Failed", "error"); }
  }

  async function changeRole(mid: number, role: string) {
    if (!org) return;
    try { await apiFetch(`/invites/${org.id}/members/${mid}?role=${role}`, { method: "PATCH" }); toast("Role updated", "success"); loadTeam(org.id); }
    catch (err: unknown) { toast(err instanceof Error ? err.message : "Failed", "error"); }
  }

  async function revokeInvite(id: number) {
    try { await apiFetch(`/invites/revoke/${id}`, { method: "DELETE" }); toast("Revoked", "success"); if (org) loadTeam(org.id); }
    catch { toast("Failed", "error"); }
  }

  async function createAPIKey(e: React.FormEvent) {
    e.preventDefault(); if (!org) return; setCreatingKey(true); setRevealedKey("");
    try {
      const k = await apiFetch<{ full_key: string } & APIKey>(`/api-keys/${org.id}`, { method: "POST", body: JSON.stringify({ name: newKeyName }) });
      setRevealedKey(k.full_key); setNewKeyName(""); toast("API key created — copy it now!", "success");
      loadKeys(org.id); loadAudit(org.id);
    } catch (err: unknown) { toast(err instanceof Error ? err.message : "Failed", "error"); }
    finally { setCreatingKey(false); }
  }

  async function revokeKey(keyId: number) {
    if (!org) return;
    try { await apiFetch(`/api-keys/${org.id}/${keyId}`, { method: "DELETE" }); toast("Key revoked", "success"); loadKeys(org.id); loadAudit(org.id); }
    catch { toast("Failed", "error"); }
  }

  async function validateGSTIN() {
    if (gstinInput.length < 15) return; setValidating(true); setGstinResult(null);
    try { const r = await apiFetch<GSTINRes>("/orgs/validate-gstin", { method: "POST", body: JSON.stringify({ gstin: gstinInput.trim().toUpperCase() }) }); setGstinResult(r); }
    finally { setValidating(false); }
  }

  const myRole  = members.find(m => m.user_id === me?.id)?.role || "owner";
  const canAdmin = ["owner", "admin"].includes(myRole);

  const TABS = [
    { id: "org",   label: "Organisation", icon: Building2 },
    { id: "team",  label: "Team",         icon: Users     },
    { id: "keys",  label: "API Keys",     icon: Key       },
    { id: "audit", label: "Audit Log",    icon: Clock     },
    { id: "gstin", label: "GSTIN Tool",   icon: Shield    },
  ] as const;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Nav />
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-6">

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-xl font-bold">Settings</h1>
          <div className="flex gap-2 flex-wrap">
            {orgs.map(o => (
              <button key={o.id} onClick={() => setOrg(o)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${org?.id === o.id ? "bg-emerald-500 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"}`}>
                {o.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === id ? "bg-emerald-500 text-zinc-950" : "border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* ── Organisation ── */}
        {tab === "org" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30">
              <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                <User size={14} className="text-zinc-400" /><h2 className="text-sm font-semibold">Profile</h2>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 gap-3">
                {me ? (<>
                  <div><p className="text-xs text-zinc-500 mb-1">Name</p><p className="text-sm text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">{me.name}</p></div>
                  <div><p className="text-xs text-zinc-500 mb-1">Email</p><p className="text-sm text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 font-mono">{me.email}</p></div>
                </>) : <div className="col-span-2 h-14 animate-pulse bg-zinc-800 rounded-lg" />}
              </div>
            </div>
            {org && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30">
                <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                  <Building2 size={14} className="text-zinc-400" /><h2 className="text-sm font-semibold">Organisation</h2>
                </div>
                <form onSubmit={saveOrg} className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Business Name</label>
                    <input value={orgName} onChange={e => setOrgName(e.target.value)} required
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">GSTIN <span className="text-zinc-600">(15 characters)</span></label>
                    <input value={orgGST} onChange={e => setOrgGST(e.target.value.toUpperCase())} placeholder="27AAPFU0939F1ZV"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-emerald-500 placeholder-zinc-600" />
                  </div>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold px-5 py-2 text-sm">
                    {saving && <Loader2 size={13} className="animate-spin" />}Save changes
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── Team ── */}
        {tab === "team" && org && (
          <div className="space-y-5">
            {/* Members */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                <Users size={14} className="text-zinc-400" /><h2 className="text-sm font-semibold">Members</h2>
                <span className="ml-auto text-xs text-zinc-500">{members.length}</span>
              </div>
              <div className="divide-y divide-zinc-800/60">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-300 shrink-0">
                      {m.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 font-medium">{m.name}{m.user_id === me?.id && <span className="ml-2 text-xs text-zinc-600">(you)</span>}</p>
                      <p className="text-xs text-zinc-500 font-mono">{m.email}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROLE_COLOR[m.role] || ROLE_COLOR.viewer}`}>
                      {ROLE_ICON[m.role]}{m.role}
                    </span>
                    {canAdmin && m.user_id !== me?.id && (
                      <div className="flex items-center gap-1">
                        <select value={m.role} onChange={e => changeRole(m.id, e.target.value)}
                          className="rounded border border-zinc-700 bg-zinc-800 text-xs text-zinc-300 px-1.5 py-1 focus:outline-none">
                          <option value="viewer">viewer</option>
                          <option value="admin">admin</option>
                          <option value="owner">owner</option>
                        </select>
                        <button onClick={() => removeM(m.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pending invites */}
            {invites.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-zinc-800"><h2 className="text-sm font-semibold text-zinc-300">Pending Invites</h2></div>
                <div className="divide-y divide-zinc-800/60">
                  {invites.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1">
                        <p className="text-sm text-zinc-300 font-mono">{inv.email}</p>
                        <p className="text-xs text-zinc-600">Role: {inv.role} · Expires {new Date(inv.expires_at).toLocaleDateString("en-IN")}</p>
                      </div>
                      <span className="text-xs border border-amber-800 text-amber-400 rounded-full px-2 py-0.5">Pending</span>
                      {canAdmin && <button onClick={() => revokeInvite(inv.id)} className="text-zinc-600 hover:text-red-400 p-1"><Trash2 size={13} /></button>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite form */}
            {canAdmin && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                  <Plus size={14} className="text-zinc-400" /><h2 className="text-sm font-semibold">Invite Team Member</h2>
                </div>
                <form onSubmit={sendInvite} className="px-5 py-4 flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs text-zinc-400 mb-1.5">Email address</label>
                    <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required
                      placeholder="accountant@example.com"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-zinc-600" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Role</label>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                      className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-300 focus:outline-none">
                      <option value="viewer">Viewer — read-only</option>
                      <option value="admin">Admin — upload & reconcile</option>
                      <option value="owner">Owner — full access</option>
                    </select>
                  </div>
                  <button type="submit" disabled={inviting}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold px-4 py-2 text-sm">
                    {inviting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}Send Invite
                  </button>
                </form>
                {newInviteUrl && (
                  <div className="mx-5 mb-4 rounded-lg border border-emerald-800 bg-emerald-950/30 p-3">
                    <p className="text-xs text-emerald-400 font-semibold mb-1.5">Share this invite link:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-zinc-300 bg-zinc-900 rounded px-2 py-1.5 font-mono truncate">{newInviteUrl}</code>
                      <button onClick={() => { navigator.clipboard.writeText(newInviteUrl); toast("Copied!", "success"); }}
                        className="text-zinc-400 hover:text-white p-1.5 rounded border border-zinc-700 hover:border-zinc-500">
                        <Copy size={13} />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1.5">Valid for 7 days. Invitee must have an account.</p>
                  </div>
                )}
              </div>
            )}

            {/* Role guide */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
              <p className="text-xs font-semibold text-zinc-400 mb-2">Role permissions</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { role: "viewer", perms: "View dashboard, ledger, reports" },
                  { role: "admin",  perms: "Upload CSV, reconcile, edit categories" },
                  { role: "owner",  perms: "All + manage team, API keys, org settings" },
                ].map(r => (
                  <div key={r.role} className="rounded-lg bg-zinc-900 p-2.5">
                    <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium mb-1.5 ${ROLE_COLOR[r.role]}`}>{ROLE_ICON[r.role]}{r.role}</div>
                    <p className="text-zinc-500 leading-relaxed">{r.perms}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── API Keys ── */}
        {tab === "keys" && org && (
          <div className="space-y-5">
            <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4 flex gap-3">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                API keys grant programmatic access to your organisation&apos;s data. 
                Store them securely — they&apos;re shown only once. Rotate keys regularly and revoke any you no longer use.
              </p>
            </div>

            {/* Existing keys */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                <Key size={14} className="text-zinc-400" /><h2 className="text-sm font-semibold">Active Keys</h2>
                <span className="ml-auto text-xs text-zinc-500">{apiKeys.length} key{apiKeys.length !== 1 ? "s" : ""}</span>
              </div>
              {apiKeys.length === 0 ? (
                <div className="px-5 py-8 text-center text-xs text-zinc-600">No API keys yet.</div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {apiKeys.map(k => (
                    <div key={k.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 font-medium">{k.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <code className="text-xs text-zinc-500 font-mono">{k.key_prefix}•••••••••••••</code>
                          {k.last_used && <span className="text-xs text-zinc-600">Last used {new Date(k.last_used).toLocaleDateString("en-IN")}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-600">{new Date(k.created_at).toLocaleDateString("en-IN")}</span>
                      {canAdmin && (
                        <button onClick={() => revokeKey(k.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1" title="Revoke">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revealed key */}
            {revealedKey && (
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4">
                <p className="text-xs text-emerald-400 font-semibold mb-2">New API key — copy it now, it won&apos;t be shown again:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 font-mono break-all">{revealedKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(revealedKey); toast("Copied!", "success"); }}
                    className="shrink-0 p-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white">
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Create key */}
            {canAdmin && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
                  <Plus size={14} className="text-zinc-400" /><h2 className="text-sm font-semibold">Create API Key</h2>
                </div>
                <form onSubmit={createAPIKey} className="px-5 py-4 flex gap-3 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-zinc-400 mb-1.5">Key name</label>
                    <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} required
                      placeholder="e.g. Shopify Webhook, Zapier Integration"
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-zinc-600" />
                  </div>
                  <button type="submit" disabled={creatingKey}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold px-4 py-2 text-sm">
                    {creatingKey ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}Generate Key
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── Audit Log ── */}
        {tab === "audit" && org && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
              <Clock size={14} className="text-zinc-400" /><h2 className="text-sm font-semibold">Audit Log</h2>
              <span className="ml-auto text-xs text-zinc-500">Last 50 events</span>
              <button onClick={() => loadAudit(org.id)} className="text-zinc-500 hover:text-zinc-300 p-1"><RefreshCw size={13} /></button>
            </div>
            {auditLogs.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-zinc-600">No audit events yet. Actions like uploads, reconciliations, and team changes will appear here.</div>
            ) : (
              <div className="divide-y divide-zinc-800/50 max-h-[500px] overflow-y-auto">
                {auditLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-zinc-900/40">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-emerald-400 font-mono">{log.action}</code>
                        {log.resource && <span className="text-xs text-zinc-600 font-mono">{log.resource}</span>}
                      </div>
                      {log.detail && <p className="text-xs text-zinc-600 mt-0.5 truncate">{log.detail}</p>}
                    </div>
                    <span className="text-xs text-zinc-600 whitespace-nowrap shrink-0">
                      {new Date(log.created_at).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GSTIN Tool ── */}
        {tab === "gstin" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
              <Shield size={14} className="text-zinc-400" /><h2 className="text-sm font-semibold">GSTIN Validator</h2>
              <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5">Free</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-zinc-500 mb-3">Verify any GSTIN before raising an invoice or filing GSTR-1 / GSTR-3B.</p>
              <div className="flex gap-2">
                <input value={gstinInput} onChange={e => setGstinInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && validateGSTIN()}
                  placeholder="27AAPFU0939F1ZV" maxLength={15}
                  className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-emerald-500 placeholder-zinc-600" />
                <button onClick={validateGSTIN} disabled={validating || gstinInput.length < 15}
                  className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-semibold px-4 py-2 text-sm flex items-center gap-1.5">
                  {validating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}Check
                </button>
              </div>
              {gstinResult && (
                <div className={`mt-3 rounded-lg border px-4 py-3 ${gstinResult.valid ? "border-emerald-800 bg-emerald-950/40" : "border-red-800 bg-red-950/40"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {gstinResult.valid ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
                    <span className={`text-sm font-semibold ${gstinResult.valid ? "text-emerald-400" : "text-red-400"}`}>{gstinResult.valid ? "Valid GSTIN" : "Invalid GSTIN"}</span>
                  </div>
                  {gstinResult.valid ? (
                    <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
                      <div><span className="text-zinc-600">State: </span>{gstinResult.state}</div>
                      <div><span className="text-zinc-600">Code: </span>{gstinResult.state_code}</div>
                      <div><span className="text-zinc-600">PAN: </span><span className="font-mono">{gstinResult.pan}</span></div>
                    </div>
                  ) : <p className="text-xs text-red-400">{gstinResult.error}</p>}
                </div>
              )}
              <details className="mt-4">
                <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">View all state codes</summary>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                  {[["01","J&K"],["02","Himachal Pradesh"],["03","Punjab"],["06","Haryana"],["07","Delhi"],["08","Rajasthan"],["09","Uttar Pradesh"],["10","Bihar"],["19","West Bengal"],["20","Jharkhand"],["21","Odisha"],["22","Chhattisgarh"],["23","Madhya Pradesh"],["24","Gujarat"],["27","Maharashtra"],["29","Karnataka"],["30","Goa"],["32","Kerala"],["33","Tamil Nadu"],["36","Telangana"],["37","Andhra Pradesh"]].map(([code, name]) => (
                    <div key={code} className="flex gap-2 text-zinc-500"><span className="font-mono text-zinc-600 w-6">{code}</span><span>{name}</span></div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
