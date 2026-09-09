import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Brain, Loader2, CheckCircle2, XCircle, MailQuestion } from "lucide-react";
import { authAPI } from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { userAPI } from "../api/axios";

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const hasToken = useMemo(() => !!token, [token]);

  const login = useAuthStore((s) => s.login);
  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">(hasToken ? "loading" : "idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    const verify = async () => {
      try {
        const { data } = await authAPI.verifyEmail(token as string);
        if (cancelled) return;
        const user = data.user ?? (await userAPI.getProfile()).data;
        login(user, data.token);
        setStatus("success");
        setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Verification failed");
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [hasToken, token, login, navigate]);

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

        <div className="glass rounded-3xl p-6 sm:p-8 text-center">
          {status === "loading" && (
            <div className="py-6">
              <Loader2 size={36} className="mx-auto mb-4 text-indigo-400 animate-spin" />
              <h2 className="text-lg font-semibold text-white mb-1">Verifying your email…</h2>
              <p className="text-sm text-gray-400">Just a moment.</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-6">
              <CheckCircle2 size={40} className="mx-auto mb-4 text-green-400" />
              <h2 className="text-lg font-semibold text-white mb-1">Email verified!</h2>
              <p className="text-sm text-gray-400">Taking you to your brain…</p>
            </div>
          )}

          {status === "error" && (
            <div className="py-6">
              <XCircle size={40} className="mx-auto mb-4 text-red-400" />
              <h2 className="text-lg font-semibold text-white mb-2">Verification failed</h2>
              <p className="text-sm text-gray-400 mb-5 break-words">{error || "The link may be invalid or expired."}</p>
              <Link to="/" className="inline-block btn-primary px-6 py-2.5">
                Back home
              </Link>
            </div>
          )}

          {status === "idle" && (
            <div className="py-6">
              <MailQuestion size={40} className="mx-auto mb-4 text-indigo-300" />
              <h2 className="text-lg font-semibold text-white mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-400 mb-5">
                We sent you a verification link when you signed up. Open it in your browser to activate your account — or
                use the <span className="text-gray-200">resend link sent in dev mode</span> if set up.
              </p>
              <Link to="/signin" className="inline-block btn-primary px-6 py-2.5">
                Go to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};