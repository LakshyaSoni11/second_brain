
export type ContentType = "tweet" | "video" | "doc" | "link" | "tag" | "note";

export type ContentFilter = ContentType | "all";

export interface Content {
  _id: string;
  userId: string;
  type: ContentType;
  title: string;
  link?: string;
  description?: string;
  tags: string[];
  summary?: string;
  isFavorite: boolean;
  image?: string;
  siteName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatar?: string | null;
  provider?: string | null;
  isVerified?: boolean;
}

export interface ShareInfo {
  isShared: boolean;
  shareLink: string | null;
  slug?: string | null;
  hasPassword?: boolean;
  expiresAt?: string | null;
}

export interface ShareConfig {
  isShared?: boolean;
  slug?: string;
  password?: string;
  expiresInDays?: number;
}

export interface TagInfo {
  name: string;
  count: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatar?: string | null;
  provider?: string | null;
  isVerified?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  total: number;
  favorites: number;
  types: Record<string, number>;
  tags: TagInfo[];
}

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
| {type: "start"; agentId: string}
| {type: "delta"; text: string}
| {type: "tool"; name: string; args: Record<string, unknown>; result: unknown}
| {type: "done";  content: string; toolcalls: AgentToolCall[]}
| {type: "error"; message: string};