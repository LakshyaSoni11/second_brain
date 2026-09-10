import { create } from "zustand";

interface AgentState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));