

export type AgentMode = "chat" | "run";
export type AgentIcon = "bot" | "search" | "chart" | "sparkles";

export interface AgentDef {
    id: string;
    name: string;
    description: string;
    icon: AgentIcon;
    mode: AgentMode;
    tools: string[];
    temperature: number;
    buildSystemPrompt: (ctx: AgentContext) => string;
}

export interface AgentContext{
    userId: string;
    now: Date;
}

export interface AgentToolResult {
    ok: boolean;
    data?: unknown;
    error?: string
}

export interface AgentToolDef {
    name: string;
    description: string;
    parameters: object;
    execute: (userId: string, args: Record<string, unknown>) => Promise<AgentToolResult>;
}

export interface AgentToolCall {
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
}

export interface AssistantTurn {
    content: string;
    toolCalls: AgentToolCall[];
}

export interface AgentChatMessage {
    role: "user" | "assistant";
    content: string;
}
export type AgentStreamEvent =
|{type: "start"; agentId: string}
| {type: "delta"; text: string}
| {type: "tool"; name: string; args: Record<string, unknown>; result: unknown }
| {type: "done"; content: string; toolCalls: AgentToolCall[]}
| {type: "error"; message: string}