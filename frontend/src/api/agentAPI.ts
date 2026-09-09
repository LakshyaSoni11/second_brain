import api from "./axios";
import type { AgentInfo, AgentStreamEvent, AgentToolCall } from "../types/agent";

const BASE_URL = import.meta.env.VITE_API_URL as string;

export interface AgentRunResponse {
  content: string;
  toolCalls?: AgentToolCall[];
}

export const agentAPI = {
  list: () => api.get<{ agents: AgentInfo[]; llmEnabled: boolean; model: string | null }>("/agents"),
  run: (agentId: string, input: string) =>
    api.post<AgentRunResponse>("/agents/run", { agentId, input }),
};

export interface StreamChatArgs {
  agentId: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  onEvent: (e: AgentStreamEvent) => void;
}

// Raw fetch + SSE parse (axios can't stream cleanly).
export const streamAgentChat = ({
  agentId,
  message,
  history,
  onEvent,
}: StreamChatArgs): AbortController => {
  const ctrl = new AbortController();
  const token = localStorage.getItem("token") ?? "";

  (async () => {
    try {
      const res = await fetch(`${BASE_URL}/agents/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ agentId, message, history }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        let msg = "Agent chat failed";
        try {
          const body = await res.json();
          if (body?.message) msg = body.message;
        } catch {
          /* keep default */
        }
        throw new Error(msg);
      }
      if (!res.body) throw new Error("Streaming not supported by this browser");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const parse = (raw: string) => {
        const dataLine = raw
          .split("\n")
          .find((l) => l.startsWith("data:"))
          ?.slice(5)
          .trim();
        if (!dataLine) return;
        try {
          onEvent(JSON.parse(dataLine) as AgentStreamEvent);
        } catch {
          /* skip malformed frame */
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (frame.trim()) parse(frame);
        }
      }
      if (buffer.trim()) parse(buffer);
    } catch (err) {
      if (!ctrl.signal.aborted && err instanceof Error) {
        onEvent({ type: "error", message: err.message });
      }
    }
  })();

  return ctrl;
};