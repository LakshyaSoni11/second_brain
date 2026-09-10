import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Brain, Globe, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { CardGrid } from "../components/cards/CardGrid";
import { shareAPI } from "../api/axios";
import type { Content } from "../types";
import { useThemeStore } from "../store/themeStore";

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
  const { theme, toggle } = useThemeStore();

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
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-bg">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-text mb-2">Brain Not Found</h2>
        <p className="text-text-muted text-sm max-w-sm">{error}</p>
        <button onClick={toggle} className="mt-4 text-xs text-text-faint hover:text-text">
          {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        </button>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
        <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 sm:p-8 animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-accent flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-accent-text" />
            </div>
            <h2 className="text-xl font-semibold text-text">Password protected</h2>
            <p className="text-sm text-text-muted mt-1">Enter the password to view this brain.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
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
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-bg/80 backdrop-blur-xl px-4 sm:px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-accent flex items-center justify-center">
              <Brain className="w-4 h-4 text-accent-text" />
            </div>
            <div className="min-w-0">
              <span className="text-sm gradient-text font-semibold truncate block">
                {data.username || "Shared"}&apos;s Brain
              </span>
              <div className="flex items-center gap-1 text-xs text-text-faint mt-0.5">
                <Globe size={11} />
                <span>Public · Read only</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-1.5 rounded-lg bg-surface border border-border text-text-faint hover:text-text transition-all" aria-label="Toggle theme">
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <span className="text-xs text-text-faint bg-surface border border-border px-3 py-1 rounded-full shrink-0">
              {data.content.length} items
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-6">
        {data.content.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-5xl mb-4">🧠</div>
            <p className="text-text-muted font-medium">This brain is empty</p>
            <p className="text-text-faint text-sm mt-1">Nothing shared yet.</p>
          </div>
        ) : (
          <CardGrid items={data.content} readOnly />
        )}
      </main>
    </div>
  );
};
