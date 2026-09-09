import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Brain, Globe, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { CardGrid } from "../components/cards/CardGrid";
import { shareAPI } from "../api/axios";
import type { Content } from "../types";

export interface SharedBrainData {
  username: string;
  content: Content[];
}

export const SharedBrainPage: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [data, setData] = useState<SharedBrainData | null>(null);
  const [error, setError] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (pw?: string) => {
      if (!hash) return;
      setLoading(true);
      setError("");
      try {
        const { data } = await shareAPI.getSharedBrain(hash, pw);
        setData(data);
        setNeedsPassword(false);
        setPassword("");
      } catch (e) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          setNeedsPassword(true);
          setError("This brain is password-protected.");
        } else if (status === 410) {
          setError("This shared brain link has expired.");
        } else {
          setError("This brain is not found or is no longer shared.");
        }
      } finally {
        setLoading(false);
      }
    },
    [hash]
  );

  useEffect(() => {
    if (!hash) return;
    setData(null);
    setNeedsPassword(false);
    setError("");
    void load();
  }, [hash, load]);

  if (error && !needsPassword) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-white mb-2">Brain Not Found</h2>
        <p className="text-gray-400 text-sm max-w-sm">{error}</p>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass rounded-3xl p-6 sm:p-8 animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Password protected</h2>
            <p className="text-sm text-gray-400 mt-1">Enter the password to view this brain.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(password);
            }}
            className="space-y-4"
          >
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Share password"
                className="input-field pr-12"
                autoFocus
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
            <button type="submit" disabled={loading || !password} className="w-full btn-primary py-3">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "View brain"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="glass border-b border-white/10 px-4 sm:px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-sm gradient-text font-semibold truncate block">
                {data.username || "Shared"}&apos;s Brain
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <Globe size={11} />
                <span>Public · Read only</span>
              </div>
            </div>
          </div>
          <span className="text-xs text-gray-600 glass px-3 py-1 rounded-full border border-white/10 shrink-0">
            {data.content.length} items
          </span>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-6">
        {data.content.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-5xl mb-4">🧠</div>
            <p className="text-gray-400 font-medium">This brain is empty</p>
            <p className="text-gray-600 text-sm mt-1">Nothing shared yet.</p>
          </div>
        ) : (
          <CardGrid items={data.content} readOnly />
        )}
      </main>
    </div>
  );
};