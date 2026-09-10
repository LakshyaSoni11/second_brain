import React from "react";
import { MessageCircle, X } from "lucide-react";
import { useAgentStore } from "../../store/agentStore";

export const FloatingChat: React.FC = () => {
  const { open, setOpen } = useAgentStore();

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2"
          aria-label="Chat with Nuro"
        >
          <span className="hidden sm:inline-flex px-4 py-2 rounded-full bg-surface border border-border text-text text-sm font-medium shadow-lg group-hover:bg-surface-hover transition-all">
            Chat with Nuro
          </span>
          <span className="w-14 h-14 rounded-full bg-accent text-accent-text shadow-xl flex items-center justify-center hover:bg-accent-hover transition-all relative">
            <MessageCircle size={24} />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-bg" />
          </span>
        </button>
      )}
      {open && (
        <button
          onClick={() => setOpen(false)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-surface border border-border text-text-muted shadow-xl flex items-center justify-center hover:bg-surface-hover transition-all"
          aria-label="Close chat"
        >
          <X size={22} />
        </button>
      )}
    </>
  );
};