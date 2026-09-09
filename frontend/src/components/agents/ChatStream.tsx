import React, { useState } from "react";
import { Send, Wrench, ArrowLeft, OctagonX } from "lucide-react";
import { useAgentChat } from "../../hooks/useAgentChat";
import type { AgentInfo } from "../../types/agent";

export const ChatStream: React.FC<{ agent: AgentInfo; onBack: () => void }> = ({ agent, onBack }) => {
  const [input, setInput] = useState("");
  const { messages, running, error, send, stop, reset } = useAgentChat(agent.id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !running) {
      send(input);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => {
            reset();
            onBack();
          }}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> All agents
        </button>
        {running && (
          <span className="text-xs text-indigo-300 flex items-center gap-2">
            <OctagonX size={14} className="cursor-pointer" onClick={stop} /> streaming…
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            Ask anything about your saved content — e.g. "summarize my machine-learning notes"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm whitespace-pre-wrap"
                  : "max-w-[85%] px-4 py-2.5 rounded-2xl glass border-white/10 text-sm whitespace-pre-wrap text-gray-200"
              }
            >
              {m.content}
              {m.role === "assistant" && running && i === messages.length - 1 && m.content === "" && (
                <span className="inline-flex gap-1 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.3s]" />
                </span>
              )}
              {(m.toolCalls?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.toolCalls?.map((tc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] text-gray-400 border border-white/10 rounded-full px-2 py-0.5"
                    >
                      <Wrench size={10} /> {tc.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {error && <p className="text-xs text-rose-400 px-1">{error}</p>}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 mt-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Message Curator…"
          className="input-field resize-none flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(e);
            }
          }}
        />
        <button type="submit" disabled={running || !input.trim()} className="btn-primary p-3 rounded-xl">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};