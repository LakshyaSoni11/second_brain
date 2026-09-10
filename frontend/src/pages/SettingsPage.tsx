import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Settings, User as UserIcon, ChevronLeft, Save, Shield, KeyRound, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { useAuthStore } from "../store/authStore";
import { userAPI } from "../api/axios";
import type { ShareInfo } from "../types";

const inputCls =
  "w-full bg-surface border border-border rounded-xl px-3 py-2 text-text placeholder-text-faint focus:outline-none focus:ring-1 focus:ring-accent transition-all text-sm";

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="bg-surface border border-border rounded-2xl p-5 sm:p-6">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-text mb-4">
      <span className="text-text-muted">{icon}</span>
      {title}
    </h3>
    {children}
  </section>
);

const StatusPill: React.FC<{ ok: boolean; msg: string }> = ({ ok, msg }) => (
  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"}`}>
    {ok ? <CheckCircle2 size={12} /> : <></>} {msg}
  </span>
);

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();

  const [profile, setProfile] = useState({ displayName: user?.displayName ?? "", avatar: user?.avatar ?? "", username: user?.username ?? "", email: user?.email ?? "" });
  const [showCreds, setShowCreds] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  const [shareData] = useState<ShareInfo>({ isShared: false, shareLink: null });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await userAPI.getProfile();
      const p = data.user ?? data;
      setProfile({
        displayName: p.displayName ?? "",
        avatar: p.avatar ?? "",
        username: p.username ?? "",
        email: p.email ?? "",
      });
      setUser(p);
    };
    fetch().catch(() => {});
  }, [setUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const { data } = await userAPI.updateProfile({
        displayName: profile.displayName || undefined,
        avatar: profile.avatar || undefined,
      });
      const updated = data.user ?? data;
      setUser(updated);
      setProfile((p) => ({ ...p, username: updated.username ?? p.username, email: updated.email ?? p.email, displayName: updated.displayName ?? "", avatar: updated.avatar ?? "" }));
      setMsg("Profile saved.");
    } catch (e) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr("");
    setPwMsg("");
    if (pw.newPassword.length < 8) {
      setPwErr("New password must be at least 8 characters.");
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      setPwErr("Passwords do not match.");
      return;
    }
    setChangingPw(true);
    try {
      await userAPI.changePassword(pw.currentPassword, pw.newPassword);
      setPwMsg("Password changed.");
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (e) {
      setPwErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await userAPI.deleteAccount();
      logout();
      navigate("/");
    } catch (e) {
      setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to delete account");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const isOAuth = !!user?.provider;

  return (
    <Layout
      activeType="all"
      onTypeChange={() => navigate("/dashboard")}
      username={user?.username}
      shareData={shareData}
      loadingShare={false}
      copied={false}
      onToggleShare={() => undefined}
      onCopyLink={() => undefined}
      onAdd={() => navigate("/dashboard")}
      onLogout={() => {
        logout();
        navigate("/signin");
      }}
    >
      <div className="max-w-2xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-5 transition-all">
          <ChevronLeft size={16} /> Back to dashboard
        </Link>
        <h2 className="text-xl sm:text-2xl font-bold text-text mb-6 flex items-center gap-2">
          <Settings size={22} className="text-text-muted" /> Settings
        </h2>

        {err && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm break-words">{err}</div>}
        {msg && <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm">{msg}</div>}
        {pwErr && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm break-words">{pwErr}</div>}
        {pwMsg && <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm">{pwMsg}</div>}

        <div className="space-y-5">
          <Card title="Profile" icon={<UserIcon size={16} />}>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-14 h-14 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-lg font-semibold text-accent-text">
                    {(profile.displayName || profile.username || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <input
                    value={profile.displayName}
                    onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                    placeholder="Display name"
                    className={inputCls}
                  />
                  <p className="text-[11px] text-text-faint mt-1">Shown in your brain header</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Avatar URL (optional)</label>
                <input value={profile.avatar} onChange={(e) => setProfile((p) => ({ ...p, avatar: e.target.value }))} placeholder="https://..." className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-surface border border-border rounded-xl px-3 py-2">
                  <span className="text-[11px] text-text-faint block">Username</span>
                  <span className="text-text">{profile.username}</span>
                </div>
                <div className="bg-surface border border-border rounded-xl px-3 py-2">
                  <span className="text-[11px] text-text-faint block">Email</span>
                  <span className="text-text break-all">{profile.email}</span>
                </div>
              </div>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-sm">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save profile
              </button>
            </form>
          </Card>

          <Card title="Account" icon={<Shield size={16} />}>
            <div className="space-y-2 text-sm">
              <button type="button" onClick={() => setShowCreds((s) => !s)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface border border-border text-text hover:border-border-strong transition-all">
                <span className="flex items-center gap-2"><KeyRound size={14} className="text-text-muted" /> Email & password login</span>
                <StatusPill ok={!isOAuth} msg={isOAuth ? "OAuth account" : "Active"} />
              </button>
              {showCreds && !isOAuth && (
                <div className="px-3 py-3 rounded-xl bg-surface border border-border text-text-muted text-xs">
                  Credentials provider is enabled for your account.
                </div>
              )}
              {showCreds && (
                <div className="px-3 py-3 rounded-xl bg-surface border border-border">
                  <p className="text-xs text-text-muted mb-2 flex items-center gap-1.5">
                    <Shield size={12} /> {isOAuth ? "Signed in via OAuth — password change not available." : "Change your password"}
                  </p>
                  {!isOAuth && (
                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <input type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="Current password" className={inputCls} required />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} placeholder="New password (min 8)" className={inputCls} required />
                        <input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" className={inputCls} required />
                      </div>
                      <button type="submit" disabled={changingPw} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all disabled:opacity-50">
                        {changingPw ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        Update password
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card title="Danger zone" icon={<Trash2 size={16} />}>
            <p className="text-sm text-text-muted mb-3">
              Deleting your account removes all your saved content permanently. This cannot be undone.
            </p>
            <button onClick={handleDelete} disabled={deleting} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all ${confirmDelete ? "bg-red-500 text-white border-red-500" : "border-red-500/30 text-red-500 hover:bg-red-500/10"}`}>
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {confirmDelete ? "Click again to confirm" : "Delete my account"}
            </button>
          </Card>
        </div>
      </div>
    </Layout>
  );
};
