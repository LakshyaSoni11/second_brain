import { create } from "zustand";
import type { Content } from "../types";

interface ContentState {
  content: Content[];
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setContent: (content: Content[]) => void;
  addContent: (item: Content) => void;
  updateItem: (item: Content) => void;
  removeContent: (id: string) => void;
}

export const useContentStore = create<ContentState>((set) => ({
  content: [],
  loading: false,
  setLoading: (loading) => set({ loading }),
  setContent: (content) => set({ content }),
  addContent: (item) => set((state) => ({ content: [item, ...state.content] })),
  updateItem: (item) =>
    set((state) => ({
      content: state.content.map((c) => (c._id === item._id ? item : c)),
    })),
  removeContent: (id) =>
    set((state) => ({ content: state.content.filter((c) => c._id !== id) })),
}));