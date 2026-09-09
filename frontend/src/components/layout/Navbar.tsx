import React from "react";
import { Brain, Plus, Share2, LogOut, Check, Copy, Menu, Settings, UserRound } from "lucide-react";
import type { ShareInfo } from "../../types";

interface NavbarProps {
  username?: string;
  avatar?: string | null;
  shareData: ShareInfo;
  loadingShare: boolean;
  copied: boolean;
  onMenuClick: () => void;
  onToggleShare: () => void;
  onCopyLink: () => void;
  onAdd: () => void;
  onLogout: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  username,
  avatar,
  shareData,
  loadingShare,
  copied,
  onMenuClick,
  onToggleShare,
  onCopyLink,
  onAdd,
  onLogout,
  onSettings,
  onProfile,
}) => {
  return (
    <header className="sticky top-0 z-30 glass border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl glass border-white/20 text-gray-300 hover:bg-white/10 transition-all"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        {onProfile ? (
          <button onClick={onProfile} className="flex items-center gap-2 min-w-0 text-left">
            {avatar ? (
              <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10" />
            ) : (
              <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <UserRound size={15} className="text-white" />
              </span>
            )}
            <span className="text-sm text-gray-300 truncate hidden md:inline">{username ?? ""}</span>
          </button>
        ) : (
          <span className="text-lg font-semibold gradient-text hidden sm:inline">Second Brain</span>
        )}
        {username && onProfile && (
          <span className="text-sm text-gray-500 truncate hidden md:inline">· {username}</span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleShare}
          disabled={loadingShare}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
            shareData.isShared
              ? "bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
              : "glass border-white/20 text-gray-300 hover:bg-white/10"
          }`}
        >
          <Share2 size={16} />
          <span className="hidden sm:inline">
            {shareData.isShared ? "Brain Shared" : "Share Brain"}
          </span>
        </button>

        {shareData.isShared && shareData.shareLink && (
          <button
            onClick={onCopyLink}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-sm glass border-white/20 text-gray-300 hover:bg-white/10 transition-all"
            aria-label="Copy share link"
          >
            {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy link"}</span>
          </button>
        )}

        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 transition-all duration-200"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add new</span>
        </button>

        {onSettings && (
          <button
            onClick={onSettings}
            className="p-2 rounded-xl glass border-white/20 text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-all"
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
        )}

        <button
          onClick={onLogout}
          className="p-2 rounded-xl glass border-white/20 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          aria-label="Log out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};