import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Brain, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { authAPI } from "../api/axios";

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Reset link is missing. Please request a new one.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, form.password);
      setDone(true);
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Second Brain</h1>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 size={40} className="mx-auto mb-4 text-green-400" />
              <h2 className="text-lg font-semibold text-white mb-2">Password changed</h2>
              <p className="text-sm text-gray-400 mb-5">You can now sign in with your new password.</p>
              <button onClick={() => navigate("/signin")} className="w-full btn-primary py-2.5">
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-6">Choose a new password</h2>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-words">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      minLength={8}
                      required
                      placeholder="Min. 8 characters"
                      className="input-field pr-12"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm new password</label>
                  <input
                    type={showPass ? "text" : "password"}
                    minLength={8}
                    required
                    placeholder="Repeat the password"
                    className="input-field"
                    value={form.confirm}
                    onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-3 mt-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Reset password"}
                </button>
              </form>

              <p className="text-center text-gray-400 text-sm mt-6">
                <Link to="/signin" className="text-indigo-400 hover:text-indigo-300 font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};