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
        login(data, token);
        navigate("/dashboard", { replace: true });
      } catch {
        localStorage.removeItem("token");
        navigate("/signin?error=oauth", { replace: true });
      }
    };
    finish();
  }, [token, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Second Brain</h1>
        </div>
        <div className="glass rounded-3xl p-8">
          {token ? (
            <>
              <Loader2 size={32} className="mx-auto mb-4 text-indigo-400 animate-spin" />
              <p className="text-gray-300">Signing you in…</p>
            </>
          ) : (
            <>
              <XCircle size={32} className="mx-auto mb-4 text-red-400" />
              <p className="text-gray-300">Sign in failed. Please try again.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};