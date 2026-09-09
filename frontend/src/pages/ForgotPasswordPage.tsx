import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Loader2, MailCheck, ArrowLeft } from "lucide-react";
import { authAPI } from "../api/axios";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
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
          {sent ? (
            <div className="text-center py-4">
              <MailCheck size={40} className="mx-auto mb-4 text-green-400" />
              <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
              <p className="text-sm text-gray-400">
                If an account exists for <span className="text-gray-200 break-all">{email}</span>, we've sent a password
                reset link. Follow the link to choose a new password (the link expires in 1 hour).
              </p>
              <Link to="/signin" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mt-5">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Reset your password</h2>
              <p className="text-sm text-gray-400 mb-6">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-words">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-3 mt-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
                </button>
              </form>

              <p className="text-center text-gray-400 text-sm mt-6">
                Remembered it?{" "}
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