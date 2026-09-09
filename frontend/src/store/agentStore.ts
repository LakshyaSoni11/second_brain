import { create } from "zustand";
import { agentAPI } from "../api/agentAPI";
import type { AgentInfo } from "../types/agent";

interface AgentState {
  open: boolean;
  agents: AgentInfo[];
  agentsLoading: boolean;
  llmEnabled: boolean;
  model: string | null;
  setOpen: (open: boolean) => void;
  loadAgents: () => Promise<void>;
}

export const useAgentStore = create<AgentState>((set) => ({
  open: false,
  agents: [],
  agentsLoading: false,
  llmEnabled: false,
  model: null,
  setOpen: (open) => set({ open }),
  loadAgents: async () => {
    set({ agentsLoading: true });
    try {
      const { data } = await agentAPI.list();
      set({ agents: data.agents, llmEnabled: data.llmEnabled, model: data.model });
    } catch {
      /* non-fatal */
    } finally {
      set({ agentsLoading: false });
    }
  },
}));