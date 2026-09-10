import React from "react";
import { Brain, Plus, Share2, LogOut, Check, Copy, Menu, Settings, UserRound, Sun, Moon } from "lucide-react";
import type { ShareInfo } from "../../types";
import { useThemeStore } from "../../store/themeStore";

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
  const { theme, toggle } = useThemeStore();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl bg-surface border border-border text-text-muted hover:bg-surface-hover hover:text-text transition-all"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="w-8 h-8 shrink-0 rounded-xl bg-accent flex items-center justify-center">
          <Brain className="w-4 h-4 text-accent-text" />
        </div>
        {onProfile ? (
          <button onClick={onProfile} className="flex items-center gap-2 min-w-0 text-left">
            {avatar ? (
              <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-border" />
            ) : (
              <span className="w-8 h-8 shrink-0 rounded-full bg-accent flex items-center justify-center">
                <UserRound size={15} className="text-accent-text" />
              </span>
            )}
            <span className="text-sm text-text-muted truncate hidden md:inline">{username ?? ""}</span>
          </button>
        ) : (
          <span className="text-lg font-bold gradient-text hidden sm:inline">Second Brain</span>
        )}
        {username && onProfile && (
          <span className="text-sm text-text-faint truncate hidden md:inline">· {username}</span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleShare}
          disabled={loadingShare}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
            shareData.isShared
              ? "bg-accent/10 border-accent/20 text-accent hover:bg-accent/20"
              : "bg-surface border-border text-text-muted hover:bg-surface-hover hover:text-text"
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
            className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-sm bg-surface border border-border text-text-muted hover:bg-surface-hover hover:text-text transition-all"
            aria-label="Copy share link"
          >
            {copied ? <Check size={15} className="text-accent" /> : <Copy size={15} />}
            <span className="hidden sm:inline">{copied ? "Copied!" : "Copy link"}</span>
          </button>
        )}

        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold bg-accent text-accent-text hover:bg-accent-hover transition-all duration-200"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add new</span>
        </button>

        <button
          onClick={toggle}
          className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:bg-surface-hover hover:text-text transition-all"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {onSettings && (
          <button
            onClick={onSettings}
            className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:bg-surface-hover hover:text-text transition-all"
            aria-label="Settings"
          >
            <Settings size={16} />
          </button>
        )}

        <button
          onClick={onLogout}
          className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
          aria-label="Log out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};
