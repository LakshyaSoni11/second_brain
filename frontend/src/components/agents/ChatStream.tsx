import React, { useEffect, useRef, useState } from "react";
import { Send, Wrench, OctagonX } from "lucide-react";
import { useAgentChat } from "../../hooks/useAgentChat";
import { MarkdownBlock } from "../common/Markdown";
import type { AgentInfo } from "../../types/agent";

export const ChatStream: React.FC<{ agent: AgentInfo }> = ({ agent }) => {
  const [input, setInput] = useState("");
  const { messages, running, error, send, stop, greet } = useAgentChat(agent.id);
  const greetedRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!greetedRef.current && messages.length === 0 && !running) {
      greetedRef.current = true;
      greet();
    }
  }, [messages.length, running, greet]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
        {running && (
          <span className="text-xs text-text-muted flex items-center gap-2">
            <OctagonX size={14} className="cursor-pointer" onClick={stop} /> Nuro is typing…
          </span>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && !running && (
          <p className="text-sm text-text-faint text-center py-8">Opening chat…</p>
        )}
        {messages.map((m, i) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] px-4 py-2.5 rounded-2xl bg-accent text-accent-text text-sm whitespace-pre-wrap"
                  : "max-w-[85%] px-4 py-2.5 rounded-2xl bg-surface border border-border text-sm text-text"
              }
            >
              {m.role === "assistant" ? (
                <MarkdownBlock content={m.content} />
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
              {m.role === "assistant" && running && i === messages.length - 1 && m.content === "" && (
                <span className="inline-flex gap-1 ml-1 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0.3s]" />
                </span>
              )}
              {(m.toolCalls?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.toolCalls?.map((tc, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] text-text-muted border border-border rounded-full px-2 py-0.5"
                    >
                      <Wrench size={10} /> {tc.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {error && <p className="text-xs text-red-500 px-1">{error}</p>}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 mt-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Message Nuro…"
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