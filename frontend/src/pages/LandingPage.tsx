import React from "react";
import { Link } from "react-router-dom";
import { Brain, Sparkles, Globe, Heart, Tags, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: <Brain size={24} className="text-indigo-400" />,
    title: "Capture Everything",
    desc: "Save tweets, videos, docs, links and notes in one place — your personal knowledge base.",
  },
  {
    icon: <Tags size={24} className="text-sky-400" />,
    title: "Organize Effortlessly",
    desc: "Tag and categorize everything so you always find it when you need it.",
  },
  {
    icon: <Globe size={24} className="text-green-400" />,
    title: "Share Your Brain",
    desc: "Publish a read-only public link so others can learn from your curated knowledge.",
  },
  {
    icon: <Sparkles size={24} className="text-purple-400" />,
    title: "AI-Powered Brain",
    desc: "Get automatic summaries, AI-suggested tags, and smart organization without extra effort.",
  },
  {
    icon: <Heart size={24} className="text-amber-400" />,
    title: "Favorites & Search",
    desc: "Pin your most important items, search instantly across your entire collection.",
  },
  {
    icon: <Shield size={24} className="text-rose-400" />,
    title: "Secure & Private",
    desc: "JWT-authenticated, encrypted passwords, full ownership of your data.",
  },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/10 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Second Brain</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/signin"
              className="px-4 py-2 rounded-xl text-sm font-medium glass border-white/20 text-gray-200 hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-3xl" />
          </div>
          <div className="max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-white/10 text-xs text-gray-400 mb-6">
              <Zap size={12} className="text-amber-400" />
              AI-powered knowledge management
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              <span className="text-white">Your ideas, links & notes — </span>
              <span className="gradient-text">organized in one brain.</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Capture anything. Search everything. Share your knowledge with a single link —
              powered by AI that organizes and summarizes your content for you.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-base font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-2xl shadow-indigo-500/30 transition-all text-center"
              >
                Start building your brain — Free
              </Link>
              <Link
                to="/signin"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-base font-medium glass border-white/20 text-gray-200 hover:bg-white/10 transition-all text-center"
              >
                Sign in to your brain
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-600">No credit card required · Start saving knowledge in seconds</p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white mb-4">
            Everything you need to remember smarter
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            A personal knowledge base that works as hard as your brain does — with AI doing the heavy lifting.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass-card">
                <div className="mb-3">{f.icon}</div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="glass rounded-3xl p-10 sm:p-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to upgrade your memory?
            </h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Join Second Brain and start organizing everything that matters — with AI working for you, not against you.
            </p>
            <Link
              to="/signup"
              className="inline-block px-10 py-4 rounded-2xl text-base font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-2xl shadow-indigo-500/30 transition-all"
            >
              Create your free brain →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 px-6 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Second Brain · A personal knowledge base
      </footer>
    </div>
  );
};