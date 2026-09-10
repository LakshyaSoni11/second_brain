import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Loader2, XCircle } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { userAPI } from "../api/axios";

export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    const finish = async () => {
      if (!token) {
        navigate("/signin?error=oauth", { replace: true });
        return;
      }
      try {
        const { data } = await userAPI.getProfile();
        login(data.user ?? data, token);
        navigate("/dashboard", { replace: true });
      } catch {
        localStorage.removeItem("token");
        navigate("/signin?error=oauth", { replace: true });
      }
    };
    finish();
  }, [token, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md animate-fade-in text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
            <Brain className="w-6 h-6 text-accent-text" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Second Brain</h1>
        </div>
        <div className="bg-surface border border-border rounded-3xl p-8">
          {token ? (
            <>
              <Loader2 size={32} className="mx-auto mb-4 text-text animate-spin" />
              <p className="text-text-muted">Signing you in…</p>
            </>
          ) : (
            <>
              <XCircle size={32} className="mx-auto mb-4 text-red-500" />
              <p className="text-text-muted">Sign in failed. Please try again.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
