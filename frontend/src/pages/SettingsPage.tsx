import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Settings, User as UserIcon, ChevronLeft, Save, Shield, KeyRound, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { useAuthStore } from "../store/authStore";
import { userAPI } from "../api/axios";
import type { ShareInfo } from "../types";

const inputCls =
  "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm";

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="glass rounded-2xl p-5 sm:p-6">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
      <span className="text-indigo-300">{icon}</span>
      {title}
    </h3>
    {children}
  </section>
);

const StatusPill: React.FC<{ ok: boolean; msg: string }> = ({ ok, msg }) => (
  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ok ? "bg-green-500/15 text-green-400 border border-green-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"}`}>
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
      setProfile({
        displayName: data.displayName ?? "",
        avatar: data.avatar ?? "",
        username: data.username ?? "",
        email: data.email ?? "",
      });
      setUser(data);
    };
    fetch().catch(() => {
      /* non-fatal */
    });
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
      setUser(data);
      setProfile((p) => ({ ...p, username: data.username, email: data.email, displayName: data.displayName ?? "", avatar: data.avatar ?? "" }));
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
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 mb-5 transition-all">
          <ChevronLeft size={16} /> Back to dashboard
        </Link>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Settings size={22} className="text-indigo-400" /> Settings
        </h2>

        {err && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-words">{err}</div>}
        {msg && <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{msg}</div>}
        {pwErr && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-words">{pwErr}</div>}
        {pwMsg && <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{pwMsg}</div>}

        <div className="space-y-5">
          <Card title="Profile" icon={<UserIcon size={16} />}>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-14 h-14 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-semibold text-white">
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
                  <p className="text-[11px] text-gray-500 mt-1">Shown in your brain header</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Avatar URL (optional)</label>
                <input value={profile.avatar} onChange={(e) => setProfile((p) => ({ ...p, avatar: e.target.value }))} placeholder="https://..." className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <span className="text-[11px] text-gray-500 block">Username</span>
                  <span className="text-gray-200">{profile.username}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <span className="text-[11px] text-gray-500 block">Email</span>
                  <span className="text-gray-200 break-all">{profile.email}</span>
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
              <button type="button" onClick={() => setShowCreds((s) => !s)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-200 hover:border-white/20 transition-all">
                <span className="flex items-center gap-2"><KeyRound size={14} className="text-gray-400" /> Email & password login</span>
                <StatusPill ok={!isOAuth} msg={isOAuth ? "OAuth account" : "Active"} />
              </button>
              {showCreds && !isOAuth && (
                <div className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs">
                  Credentials provider is enabled for your account.
                </div>
              )}
              {showCreds && (
                <div className="px-3 py-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                    <Shield size={12} /> {isOAuth ? "Signed in via OAuth — password change not available." : "Change your password"}
                  </p>
                  {!isOAuth && (
                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <input type="password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="Current password" className={inputCls} required />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} placeholder="New password (min 8)" className={inputCls} required />
                        <input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" className={inputCls} required />
                      </div>
                      <button type="submit" disabled={changingPw} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm glass border-white/20 text-gray-200 hover:bg-white/10 transition-all disabled:opacity-50">
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
            <p className="text-sm text-gray-400 mb-3">
              Deleting your account removes all your saved content permanently. This cannot be undone.
            </p>
            <button onClick={handleDelete} disabled={deleting} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all ${confirmDelete ? "bg-red-500 text-white border-red-500" : "border-red-500/40 text-red-400 hover:bg-red-500/10"}`}>
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {confirmDelete ? "Click again to confirm" : "Delete my account"}
            </button>
          </Card>
        </div>
      </div>
    </Layout>
  );
};