import React from "react";
import { Twitter, Youtube, FileText, Link2, Tag, LineChart, LayoutDashboard, Settings, X } from "lucide-react";
import type { ContentFilter } from "../../types";

type NavItem = { label: string; value: ContentFilter; icon: React.ReactNode };

const navItems: NavItem[] = [
  { label: "All", value: "all", icon: <LayoutDashboard size={16} /> },
  { label: "Tweets", value: "tweet", icon: <Twitter size={16} /> },
  { label: "Videos", value: "video", icon: <Youtube size={16} /> },
  { label: "Docs", value: "doc", icon: <FileText size={16} /> },
  { label: "Links", value: "link", icon: <Link2 size={16} /> },
  { label: "Notes", value: "note", icon: <LineChart size={16} /> },
  { label: "Tags", value: "tag", icon: <Tag size={16} /> },
];

interface SidebarProps {
  activeType: ContentFilter;
  onTypeChange: (type: ContentFilter) => void;
  onManageTags?: () => void;
  onSettings?: () => void;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeType, onTypeChange, onManageTags, onSettings, onClose }) => {
  const handleSelect = (value: ContentFilter) => {
    onTypeChange(value);
    onClose?.();
  };

  return (
    <aside className="flex flex-col gap-1 p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between px-3 mb-3">
        <p className="text-xs text-text-faint uppercase font-semibold tracking-wider">
          Filter by type
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-all lg:hidden"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {navItems.map(({ label, value, icon }) => (
        <button
          key={value}
          onClick={() => handleSelect(value)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeType === value
              ? "bg-accent/10 border border-accent/20 text-accent"
              : "text-text-muted hover:bg-surface-hover hover:text-text border border-transparent"
          }`}
        >
          <span className={activeType === value ? "text-accent" : ""}>{icon}</span>
          {label}
        </button>
      ))}

      {(onManageTags || onSettings) && (
        <div className="mt-4 pt-4 border-t border-border space-y-1">
          {onManageTags && (
            <button
              onClick={() => {
                onManageTags();
                onClose?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeType === "tag"
                  ? "bg-accent/10 border border-accent/20 text-accent"
                  : "text-text-muted hover:bg-surface-hover hover:text-text border border-transparent"
              }`}
            >
              <Tag size={16} />
              Manage tags
            </button>
          )}
          {onSettings && (
            <button
              onClick={() => {
                onSettings();
                onClose?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-hover hover:text-text transition-all duration-200 border border-transparent"
            >
              <Settings size={16} />
              Settings
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
