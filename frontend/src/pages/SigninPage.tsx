import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { authAPI } from "../api/axios";
import { OAuthButtons } from "../components/auth/OAuthButtons";

export const SigninPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(params.get("error") === "oauth" ? "Could not complete sign in with that provider. Please try again." : "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await authAPI.signin(form);
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Invalid credentials";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
              <Brain className="w-6 h-6 text-accent-text" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Second Brain</h1>
          </div>
          <p className="text-text-muted text-sm">Welcome back</p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-text mb-6">Sign in to your brain</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm break-words">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-5">
            <OAuthButtons mode="signin" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-muted">Password</label>
              <Link to="/forgot-password" className="text-xs text-text font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-2">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Your password"
                className="input-field pr-12"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 mt-2">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-text-muted text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-text font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <button
          onClick={toggle}
          className="mt-4 mx-auto block text-xs text-text-faint hover:text-text"
        >
          {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        </button>
      </div>
    </div>
  );
};
