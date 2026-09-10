import React from "react";
import { X, MessageCircle } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";
import type { AgentInfo } from "../../types/agent";
import { ChatStream } from "./ChatStream";

const NURO_AGENT: AgentInfo = {
  id: "nuro",
  name: "Nuro",
  description: "Chat with your brain — ask questions, get digests, research topics, organize tags.",
  icon: "bot",
  mode: "chat",
  tools: ["brain_search", "brain_get", "brain_stats", "summarize_item", "save_item", "recent_items", "top_tags"],
};

export const AgentPanel: React.FC = () => {
  const { open, setOpen } = useAgentStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end" onClick={() => setOpen(false)}>
      <aside
        className="w-full max-w-md h-full bg-bg border-l border-border shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-text flex items-center gap-2">
              <MessageCircle size={18} className="text-accent" /> Nuro
            </h3>
            <p className="text-xs text-text-faint mt-0.5">Your AI assistant · asks, digests, research, tags</p>
          </div>
          <button className="icon-btn p-2" onClick={() => setOpen(false)} aria-label="Close chat">
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <ChatStream agent={NURO_AGENT} />
        </div>
      </aside>
    </div>
  );
};