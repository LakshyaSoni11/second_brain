import React from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import type { ContentFilter, ShareInfo } from "../../types";

interface LayoutProps {
  activeType: ContentFilter;
  onTypeChange: (type: ContentFilter) => void;
  onManageTags?: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
  username?: string;
  avatar?: string | null;
  shareData: ShareInfo;
  loadingShare: boolean;
  copied: boolean;
  onToggleShare: () => void;
  onCopyLink: () => void;
  onAdd: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeType,
  onTypeChange,
  onManageTags,
  onSettings,
  onProfile,
  username,
  avatar,
  shareData,
  loadingShare,
  copied,
  onToggleShare,
  onCopyLink,
  onAdd,
  onLogout,
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen glass border-r border-white/10">
        <Sidebar activeType={activeType} onTypeChange={onTypeChange} onManageTags={onManageTags} onSettings={onSettings} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 max-w-[80vw] glass border-r border-white/10 animate-slide-in shadow-2xl">
            <Sidebar
              activeType={activeType}
              onTypeChange={onTypeChange}
              onManageTags={onManageTags}
              onSettings={onSettings}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          username={username}
          avatar={avatar}
          shareData={shareData}
          loadingShare={loadingShare}
          copied={copied}
          onMenuClick={() => setSidebarOpen(true)}
          onToggleShare={onToggleShare}
          onCopyLink={onCopyLink}
          onAdd={onAdd}
          onLogout={onLogout}
          onSettings={onSettings}
          onProfile={onProfile}
        />
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};