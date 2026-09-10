import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Star,
  X,
  MessageCircle,
  Tags,
  Download,
  Upload,
  Trash2,
  CheckSquare,
  Square,
  Loader2,
  ClipboardList,
  Plus,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { CardGrid } from "../components/cards/CardGrid";
import { DashboardSkeleton } from "../components/ui/Skeleton";
import type { SavePayload } from "../components/cards/ContentCard";
import { AddContentModal } from "../components/modals/AddContentModal";
import { ShareModal } from "../components/modals/ShareModal";
import { TagsPanel } from "../components/modals/TagsPanel";
import { useAuthStore } from "../store/authStore";
import { useAgentStore } from "../store/agentStore";
import { useContentStore } from "../store/contentStore";
import { useContent } from "../hooks/useContent";
import { toast } from "../components/ui/Toast";
import { contentAPI, shareAPI } from "../api/axios";
import type { ContentPayload } from "../api/axios";
import type { ContentFilter, DashboardStats, ShareInfo } from "../types";

const PAGE_SIZE = 12;

const StatChip: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-sm">
    <span className="capitalize text-text-muted">{label}</span>
    <span className="font-semibold text-text">{value}</span>
  </div>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const setAgentsOpen = useAgentStore((s) => s.setOpen);
  const updateItem = useContentStore((s) => s.updateItem);
  const { content, loading, pagination, fetchAll, update, toggleFavorite, remove } = useContent();

  const [activeType, setActiveType] = useState<ContentFilter>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [shareData, setShareData] = useState<ShareInfo>({ isShared: false, shareLink: null });
  const [copied, setCopied] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkTagName, setBulkTagName] = useState("");
  const [exporting, setExporting] = useState<"json" | "csv" | "markdown" | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadContent = useCallback(
    (opts?: { page?: number; append?: boolean }) => {
      fetchAll({
        type: activeType,
        tag: activeTag ?? undefined,
        q: appliedQ,
        favorite: favOnly,
        page: opts?.page ?? 1,
        limit: PAGE_SIZE,
        append: opts?.append,
      });
    },
    [activeType, activeTag, appliedQ, favOnly, fetchAll]
  );

  useEffect(() => {
    setPage(1);
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    contentAPI
      .getStats()
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    shareAPI
      .getStatus()
      .then(({ data }) => setShareData(data))
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQ(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setAppliedQ("");
  };

  const handleOpenShare = useCallback(() => {
    setShowShare(true);
  }, []);

  const handleCopyLink = useCallback(() => {
    if (shareData.shareLink) {
      navigator.clipboard.writeText(shareData.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [shareData.shareLink]);

  const handleSave = useCallback(
    async (id: string, payload: SavePayload) => {
      await update(id, payload);
    },
    [update]
  );

  const handleToggleFav = useCallback(
    (id: string, currentValue: boolean) => {
      toggleFavorite(id, !currentValue);
    },
    [toggleFavorite]
  );

  const handleSummarized = useCallback(
    (item: { _id: string; summary?: string }) => {
      const existing = useContentStore.getState().content.find((c) => c._id === item._id);
      if (existing) updateItem({ ...existing, summary: item.summary });
    },
    [updateItem]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await remove(id);
      } catch {
        toast("Failed to delete item");
      }
    },
    [remove]
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/signin");
  }, [logout, navigate]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadContent({ page: next, append: true });
  };

  const openAdd = () => {
    setShowModal(true);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkClear = () => {
    setSelected(new Set());
    setBulkMode(false);
  };

  const bulkRun = async (fn: () => Promise<unknown>) => {
    setBulkBusy(true);
    try {
      await fn();
      const ids = Array.from(selected);
      ids.forEach((id) => useContentStore.getState().removeContent(id));
      setSelected(new Set());
      loadContent();
    } catch {
      toast("Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selected.size} item(s)? This cannot be undone.`)) return;
    void bulkRun(async () => {
      await contentAPI.bulkDelete(Array.from(selected));
    });
  };

  const handleBulkFavorite = (value: boolean) => {
    void bulkRun(async () => {
      await contentAPI.bulkFavorite(Array.from(selected), value);
    });
  };

  const handleBulkTag = () => {
    const tag = bulkTagName.trim().toLowerCase();
    if (!tag) return;
    void bulkRun(async () => {
      await contentAPI.bulkTag(Array.from(selected), [tag]);
    });
  };

  const handleExport = async (format: "json" | "csv" | "markdown") => {
    setExporting(format);
    try {
      const blob = (await contentAPI.exportData(format)) as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `second-brain.${format === "markdown" ? "md" : format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      let parsed: unknown;
      const text = await file.text();
      const data = JSON.parse(text);
      parsed = Array.isArray(data) ? data : (data as { items?: unknown }).items;
      if (!Array.isArray(parsed)) throw new Error("bad format");
      await contentAPI.importData(parsed as ContentPayload[]);
      setPage(1);
      loadContent();
    } catch {
      window.alert("Import failed. Expected a JSON file with an array of content items (see Export → JSON).");
    } finally {
      setImporting(false);
    }
  };

  const isFiltered = useMemo(() => appliedQ !== "" || favOnly || activeTag !== null, [appliedQ, favOnly, activeTag]);
  const emptyDashboard = !loading && content.length === 0 && !isFiltered;
  const title = activeTag
    ? `#${activeTag}`
    : activeType === "all"
      ? "All Content"
      : `${activeType}s`;

  return (
    <Layout
      activeType={activeType}
      onTypeChange={setActiveType}
      onManageTags={() => setShowTags(true)}
      onSettings={() => navigate("/settings")}
      onProfile={() => navigate("/settings")}
      username={user?.username}
      avatar={user?.avatar}
      shareData={shareData}
      loadingShare={false}
      copied={copied}
      onToggleShare={handleOpenShare}
      onCopyLink={handleCopyLink}
      onAdd={openAdd}
      onLogout={handleLogout}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-text capitalize mr-auto">
          {title}
        </h2>
        {activeTag && (
          <button
            onClick={() => setActiveTag(null)}
            className="inline-flex items-center gap-1 text-sm text-text-muted bg-surface border border-border px-3 py-1.5 rounded-full hover:bg-surface-hover"
          >
            <Tags size={12} /> #{activeTag} <X size={12} />
          </button>
        )}
        {appliedQ && (
          <span className="text-sm text-text-muted bg-surface border border-border px-3 py-1.5 rounded-full">
            Search: "{appliedQ}"
          </span>
        )}
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-3 text-text-faint" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search your brain…"
              className="input-field pl-10 pr-24"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-24 top-2.5 p-1 rounded-lg hover:bg-surface-hover text-text-faint"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
            <button type="submit" className="absolute right-2 top-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-accent-text hover:bg-accent-hover transition-all">
              Search
            </button>
          </form>
          <button
            onClick={() => setFavOnly((f) => !f)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
              favOnly
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "bg-surface border-border text-text-muted hover:bg-surface-hover"
            }`}
          >
            <Star size={16} fill={favOnly ? "currentColor" : "none"} />
            Favorites only
          </button>
          <button
            onClick={() => setBulkMode((b) => !b)}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
              bulkMode
                ? "bg-accent/10 border-accent/20 text-accent"
                : "bg-surface border-border text-text-muted hover:bg-surface-hover"
            }`}
          >
            {bulkMode ? <CheckSquare size={16} /> : <Square size={16} />}
            Select
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowTags(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all">
            <Tags size={13} /> Manage tags
          </button>
          <div className="relative inline-flex">
            <button
              onClick={() => void handleExport("json")}
              disabled={!!exporting || content.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-l-xl text-xs bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all disabled:opacity-40"
              title="Export as JSON"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Export
            </button>
            <div className="border-l border-border">
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) void handleExport(v as "csv" | "markdown");
                }}
                disabled={content.length === 0}
                className="h-full bg-transparent text-xs text-text-muted px-1.5 py-2 rounded-r-xl appearance-none cursor-pointer disabled:opacity-40 focus:outline-none"
                aria-label="Export format"
              >
                <option value="" className="bg-surface">▾</option>
                <option value="json" className="bg-surface">JSON</option>
                <option value="csv" className="bg-surface">CSV</option>
                <option value="markdown" className="bg-surface">Markdown</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all disabled:opacity-40"
            title="Import items from a JSON export"
          >
            {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Import
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={handleImport} />
        </div>

        {bulkMode && (
          <div className="flex flex-wrap items-center gap-2 bg-accent/5 border border-accent/20 rounded-xl px-3 py-2.5">
            <span className="text-sm text-accent font-medium mr-auto flex items-center gap-1.5">
              <ClipboardList size={15} /> {selected.size} selected
            </span>
            <button
              onClick={() => setSelected(new Set(content.map((c) => c._id)))}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all"
            >
              Select all
            </button>
            <button onClick={bulkClear} className="px-2.5 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all">
              Clear
            </button>
            <div className="flex gap-1.5">
              <input
                value={bulkTagName}
                onChange={(e) => setBulkTagName(e.target.value)}
                placeholder="# tag to add"
                className="w-36 input-field text-xs py-1.5 px-2.5"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleBulkTag();
                }}
              />
              <button
                onClick={handleBulkTag}
                disabled={!bulkTagName.trim() || bulkBusy || selected.size === 0}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-accent/20 border border-accent/30 text-accent hover:bg-accent/30 transition-all disabled:opacity-40"
              >
                {bulkBusy ? <Loader2 size={12} className="animate-spin" /> : <TagIcon />}
              </button>
            </div>
            <button
              onClick={() => handleBulkFavorite(true)}
              disabled={bulkBusy || selected.size === 0}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all disabled:opacity-40"
            >
              <Star size={13} className="inline -mt-0.5" /> Favorite
            </button>
            <button
              onClick={() => handleBulkDelete()}
              disabled={bulkBusy || selected.size === 0}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all disabled:opacity-40"
            >
              <Trash2 size={13} className="inline -mt-0.5" /> Delete
            </button>
          </div>
        )}

        {stats && (
          <div className="flex flex-wrap gap-2">
            <StatChip label="Total" value={stats.total} />
            <StatChip label="Favorites" value={stats.favorites} />
            {Object.entries(stats.types).map(([type, count]) => (
              <StatChip key={type} label={type} value={count} />
            ))}
          </div>
        )}
      </div>

      {loading && content.length === 0 ? (
        <DashboardSkeleton />
      ) : emptyDashboard ? (
        <div className="flex flex-col items-center justify-center h-64 sm:h-80 text-center">
          <div className="text-5xl sm:text-6xl mb-4">🧠</div>
          <p className="text-text-muted font-medium">Your brain is empty</p>
          <p className="text-text-faint text-sm mt-1 px-4">
            Start capturing knowledge — save tweets, videos, docs, links and notes.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent text-accent-text hover:bg-accent-hover transition-all">
              <Plus size={15} /> Add your first item
            </button>
            <button onClick={() => setAgentsOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all">
              <MessageCircle size={15} /> Ask Nuro
            </button>
            <button onClick={() => setShowTags(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all">
              <Tags size={15} /> Manage tags
            </button>
          </div>
        </div>
      ) : content.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 sm:h-80 text-center">
          <div className="text-5xl sm:text-6xl mb-4">🔍</div>
          <p className="text-text-muted font-medium">No matching items found</p>
          <p className="text-text-faint text-sm mt-1 px-4">Try adjusting your search or filters.</p>
          <button onClick={handleClearSearch} className="mt-4 px-4 py-2 rounded-xl text-sm bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <CardGrid
            items={content}
            onDelete={handleDelete}
            onSave={handleSave}
            onToggleFavorite={handleToggleFav}
            onSummarized={handleSummarized}
            selectable={bulkMode}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
          />
          {pagination && content.length < pagination.total && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all disabled:opacity-50"
              >
                {loading ? "Loading..." : `Load more (${pagination.total - content.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {showModal && <AddContentModal onClose={() => setShowModal(false)} />}
      {showTags && <TagsPanel open onClose={() => setShowTags(false)} onFilterTag={(tag) => setActiveTag(tag)} />}
      {showShare && (
        <ShareModal
          shareData={shareData}
          onSaved={(data) => {
            setShareData(data);
            setShowShare(false);
          }}
          onClose={() => setShowShare(false)}
        />
      )}
    </Layout>
  );
};

const TagIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l8.58-8.58a1 1 0 0 0 0-1.42L12 2Z" />
    <circle cx="7" cy="7" r="1.5" />
  </svg>
);
