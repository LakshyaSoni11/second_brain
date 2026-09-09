import React from "react";
import { Twitter, Youtube, FileText, Link2, Tag, LineChart, LayoutDashboard, Settings, X } from "lucide-react";
import type { ContentFilter } from "../../types";

type NavItem = { label: string; value: ContentFilter; icon: React.ReactNode; color: string };

const navItems: NavItem[] = [
  { label: "All", value: "all", icon: <LayoutDashboard size={16} />, color: "text-gray-400" },
  { label: "Tweets", value: "tweet", icon: <Twitter size={16} />, color: "text-sky-400" },
  { label: "Videos", value: "video", icon: <Youtube size={16} />, color: "text-red-400" },
  { label: "Docs", value: "doc", icon: <FileText size={16} />, color: "text-blue-400" },
  { label: "Links", value: "link", icon: <Link2 size={16} />, color: "text-green-400" },
  { label: "Notes", value: "note", icon: <LineChart size={16} />, color: "text-violet-400" },
  { label: "Tags", value: "tag", icon: <Tag size={16} />, color: "text-yellow-400" },
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
        <p className="text-xs text-gray-600 uppercase font-semibold tracking-wider">
          Filter by type
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-all lg:hidden"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {navItems.map(({ label, value, icon, color }) => (
        <button
          key={value}
          onClick={() => handleSelect(value)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeType === value
              ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300"
              : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
          }`}
        >
          <span className={activeType === value ? "text-indigo-400" : color}>{icon}</span>
          {label}
        </button>
      ))}

      {(onManageTags || onSettings) && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
          {onManageTags && (
            <button
              onClick={() => {
                onManageTags();
                onClose?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeType === "tag"
                  ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              <Tag size={16} className="text-yellow-400" />
              Manage tags
            </button>
          )}
          {onSettings && (
            <button
              onClick={() => {
                onSettings();
                onClose?.();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-all duration-200"
            >
              <Settings size={16} className="text-gray-400" />
              Settings
            </button>
          )}
        </div>
      )}
    </aside>
  );
};