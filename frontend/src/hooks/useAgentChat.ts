import { useCallback, useRef, useState } from "react";
import { streamAgentChat } from "../api/agentAPI";
import type { AgentMessage, AgentToolCall } from "../types/agent";

const uid = (): string => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

export const useAgentChat = (agentId: string) => {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    setMessages([]);
    setRunning(false);
    setError(null);
  }, []);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || running) return;

      setRunning(true);
      setError(null);

      const userMsg: AgentMessage = {
        id: uid(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const assistantMsg: AgentMessage = {
        id: uid(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        toolCalls: [],
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      const history = messages
        .filter((m) => m.content || (m.toolCalls?.length ?? 0) > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      ctrlRef.current = streamAgentChat({
        agentId,
        message: trimmed,
        history,
        onEvent: (e) => {
          if (e.type === "delta") {
            setMessages((prev) =>
              prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: m.content + e.text } : m))
            );
          } else if (e.type === "tool") {
            const call: AgentToolCall = { name: e.name, args: e.args, result: e.result };
            setMessages((prev) =>
              prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, toolCalls: [...(m.toolCalls ?? []), call] } : m
              )
            );
          } else if (e.type === "done") {
            setMessages((prev) =>
              prev.map((m, i) =>
                i === prev.length - 1
                  ? { ...m, content: e.content || m.content, toolCalls: e.toolCalls ?? m.toolCalls }
                  : m
              )
            );
            setRunning(false);
          } else if (e.type === "error") {
            setError(e.message);
            setRunning(false);
          }
        },
      });
    },
    [agentId, messages, running]
  );

  const stop = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    setRunning(false);
  }, []);

  return { messages, running, error, send, stop, reset };
};