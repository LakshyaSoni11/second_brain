import React, { useState } from "react";
import { ArrowLeft, Play, Loader2, Wrench } from "lucide-react";
import { agentAPI } from "../../api/agentAPI";
import type { AgentInfo, AgentToolCall } from "../../types/agent";

const renderMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^### (.*)$/gm, "$1")
    .replace(/^## (.*)$/gm, "$1")
    .replace(/^# (.*)$/gm, "$1")
    .trim();
};

export const RunAgentView: React.FC<{ agent: AgentInfo; onBack: () => void }> = ({ agent, onBack }) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ content: string; toolCalls?: AgentToolCall[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await agentAPI.run(agent.id, input.trim());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white flex items-center gap-1.5 mb-3">
        <ArrowLeft size={14} /> All agents
      </button>
      <p className="text-sm text-gray-400 mb-3">{agent.description}</p>

      <form onSubmit={run} className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder={
            agent.id === "digest"
              ? "Describe the period (e.g. last 7 days)…"
              : agent.id === "organizer"
                ? "Optional: focus on a set of tags…"
                : "Research topic: e.g. LLM agents in production"
          }
          className="input-field resize-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary px-4 py-2.5 text-sm w-full"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
          {loading ? "Running…" : "Run agent"}
        </button>
      </form>

      {error && <p className="text-xs text-rose-400 mt-3">{error}</p>}

      {result && (
        <div className="mt-4 glass rounded-2xl p-4 space-y-3">
          {result.toolCalls && result.toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.toolCalls.map((tc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-400 border border-white/10 rounded-full px-2 py-0.5"
                >
                  <Wrench size={10} /> {tc.name}
                </span>
              ))}
            </div>
          )}
          <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
            {renderMarkdown(result.content)}
          </pre>
        </div>
      )}
    </div>
  );
};