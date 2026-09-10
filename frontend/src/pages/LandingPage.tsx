import React from "react";
import { Link } from "react-router-dom";
import { Brain, Sparkles, Globe, Heart, Tags, Shield, Zap } from "lucide-react";
import { useThemeStore } from "../store/themeStore";

const features = [
  {
    icon: <Brain size={24} className="text-text" />,
    title: "Capture Everything",
    desc: "Save tweets, videos, docs, links and notes in one place — your personal knowledge base.",
  },
  {
    icon: <Tags size={24} className="text-text" />,
    title: "Organize Effortlessly",
    desc: "Tag and categorize everything so you always find it when you need it.",
  },
  {
    icon: <Globe size={24} className="text-text" />,
    title: "Share Your Brain",
    desc: "Publish a read-only public link so others can learn from your curated knowledge.",
  },
  {
    icon: <Sparkles size={24} className="text-text" />,
    title: "AI-Powered Brain",
    desc: "Get automatic summaries, AI-suggested tags, and smart organization without extra effort.",
  },
  {
    icon: <Heart size={24} className="text-text" />,
    title: "Favorites & Search",
    desc: "Pin your most important items, search instantly across your entire collection.",
  },
  {
    icon: <Shield size={24} className="text-text" />,
    title: "Secure & Private",
    desc: "JWT-authenticated, encrypted passwords, full ownership of your data.",
  },
];

export const LandingPage: React.FC = () => {
  const { theme, toggle } = useThemeStore();

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="border-b border-border bg-bg/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Brain className="w-5 h-5 text-accent-text" />
            </div>
            <span className="text-lg font-bold gradient-text">Second Brain</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:bg-surface-hover hover:text-text transition-all"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sparkles size={16} /> : <Sparkles size={16} />}
            </button>
            <Link
              to="/signin"
              className="px-4 py-2 rounded-xl text-sm font-medium bg-surface border border-border text-text-muted hover:bg-surface-hover hover:text-text transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-accent-text hover:bg-accent-hover transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border text-xs text-text-muted mb-6">
              <Zap size={12} className="text-text" />
              AI-powered knowledge management
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              <span className="text-text">Your ideas, links & notes — </span>
              <span className="gradient-text">organized in one brain.</span>
            </h1>
            <p className="mt-6 text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
              Capture anything. Search everything. Share your knowledge with a single link —
              powered by AI that organizes and summarizes your content for you.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-base font-bold bg-accent text-accent-text hover:bg-accent-hover transition-all text-center"
              >
                Start building your brain — Free
              </Link>
              <Link
                to="/signin"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-base font-medium bg-surface border border-border text-text-muted hover:bg-surface-hover hover:text-text transition-all text-center"
              >
                Sign in to your brain
              </Link>
            </div>
            <p className="mt-4 text-xs text-text-faint">No credit card required · Start saving knowledge in seconds</p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-text mb-4">
            Everything you need to remember smarter
          </h2>
          <p className="text-center text-text-muted mb-12 max-w-xl mx-auto">
            A personal knowledge base that works as hard as your brain does — with AI doing the heavy lifting.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass-card">
                <div className="mb-3">{f.icon}</div>
                <h3 className="text-text font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="glass rounded-3xl p-10 sm:p-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-text mb-4">
              Ready to upgrade your memory?
            </h2>
            <p className="text-text-muted mb-8 max-w-lg mx-auto">
              Join Second Brain and start organizing everything that matters — with AI working for you, not against you.
            </p>
            <Link
              to="/signup"
              className="inline-block px-10 py-4 rounded-2xl text-base font-bold bg-accent text-accent-text hover:bg-accent-hover transition-all"
            >
              Create your free brain →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6 text-center text-sm text-text-faint">
        © {new Date().getFullYear()} Second Brain · A personal knowledge base
      </footer>
    </div>
  );
};
