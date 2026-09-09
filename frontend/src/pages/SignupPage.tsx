import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brain, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { authAPI } from "../api/axios";
import { OAuthButtons } from "../components/auth/OAuthButtons";

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState<null | { email: string; devVerifyLink?: string }>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await authAPI.signup(form);
      if (data.requiresVerification) {
        setNeedsVerification({ email: form.email, devVerifyLink: data.devVerifyLink });
        return;
      }
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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
          <p className="text-gray-400 text-sm">Your personal knowledge hub</p>
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8">
          {needsVerification ? (
            <div className="text-center py-4">
              <MailCheck size={40} className="mx-auto mb-4 text-green-400" />
              <h2 className="text-lg font-semibold text-white mb-2">Almost there!</h2>
              <p className="text-sm text-gray-400">
                We sent a verification link to <span className="text-gray-200 break-all">{needsVerification.email}</span>.
                Click it to activate your account, then sign in.
              </p>
              {needsVerification.devVerifyLink && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-300 mb-1.5">
                    SMTP not configured — dev mode: open the link below to verify instantly:
                  </p>
                  <a href={needsVerification.devVerifyLink} className="text-amber-200 underline underline-offset-2 text-xs break-all">
                    {needsVerification.devVerifyLink}
                  </a>
                </div>
              )}
              <Link to="/signin" className="inline-block mt-5 text-sm text-indigo-400 hover:text-indigo-300 font-medium">
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-6">Create your account</h2>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-words">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-5">
                <OAuthButtons mode="signup" />
              </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <input
                type="text"
                placeholder="johndoe"
                minLength={3}
                className="input-field"
                value={form.username}
                onChange={set("username")}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                className="input-field"
                value={form.email}
                onChange={set("email")}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  className="input-field pr-12"
                  value={form.password}
                  onChange={set("password")}
                  required
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

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 mt-2">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Already have an account?{" "}
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