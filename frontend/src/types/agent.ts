export type AgentMode = "chat" | "run";
export type AgentIcon = "bot" | "search" | "chart" | "sparkles";

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  icon: AgentIcon;
  mode: AgentMode;
  tools: string[];
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  toolCalls?: AgentToolCall[];
}

export type AgentStreamEvent =
  | { type: "start"; agentId: string }
  | { type: "delta"; text: string }
  | { type: "tool"; name: string; args: Record<string, unknown>; result: unknown }
  | { type: "done"; content: string; toolCalls: AgentToolCall[] }
  | { type: "error"; message: string };