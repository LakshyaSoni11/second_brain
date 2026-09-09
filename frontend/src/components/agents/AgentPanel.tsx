import React, { useEffect, useState } from "react";
import { X, Bot, Sparkles, Loader2 } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import type { AgentInfo } from "../../types/agent";
import { ChatStream } from "./ChatStream";
import { RunAgentView } from "./RunAgentView";

const iconMap: Record<string, React.ReactNode> = {
  bot: <Bot size={18} className="text-indigo-400" />,
  search: <Sparkles size={18} className="text-sky-400" />,
  chart: <Sparkles size={18} className="text-green-400" />,
  sparkles: <Sparkles size={18} className="text-purple-400" />,
};

export const AgentPanel: React.FC = () => {
  const { open, setOpen, agents, agentsLoading, llmEnabled, loadAgents } = useAgentStore();
  const [selected, setSelected] = useState<AgentInfo | null>(null);

  useEffect(() => {
    if (open && agents.length === 0) loadAgents();
  }, [open, agents.length, loadAgents]);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onClick={() => setOpen(false)}>
      <aside
        className="w-full max-w-md h-full bg-dark-900 border-l border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Bot size={18} className="text-indigo-400" /> AI Agents
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {llmEnabled ? "GPT-powered" : "Smart fallback mode"} · add OPENAI_API_KEY for full power
            </p>
          </div>
          <button className="icon-btn p-2" onClick={() => setOpen(false)} aria-label="Close agents">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {agentsLoading && agents.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : selected ? (
            selected.mode === "chat" ? (
              <ChatStream agent={selected} onBack={() => setSelected(null)} />
            ) : (
              <RunAgentView agent={selected} onBack={() => setSelected(null)} />
            )
          ) : (
            agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelected(agent)}
                className="w-full glass-card text-left cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0">{iconMap[agent.icon] ?? <Bot size={18} />}</div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{agent.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-white/10 rounded-full px-2 py-0.5">
                        {agent.mode === "chat" ? "Chat" : "Run"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 leading-relaxed">{agent.description}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};