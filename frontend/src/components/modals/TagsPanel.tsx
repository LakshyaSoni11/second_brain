import React, { useCallback, useEffect, useState } from "react";
import { Tag, RefreshCcw, Loader2, X, CornerDownRight, Pencil, Trash2, Search } from "lucide-react";
import { Modal } from "../ui/Modal";
import { tagAPI } from "../../api/axios";
import type { TagInfo } from "../../types";

interface TagsPanelProps {
  open: boolean;
  onClose: () => void;
  onFilterTag?: (tag: string) => void;
}

export const TagsPanel: React.FC<TagsPanelProps> = ({ open, onClose, onFilterTag }) => {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState<{ tag: string; name: string } | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await tagAPI.list(q.trim() || undefined);
      setTags(data.tags ?? []);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to load tags");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleRename = async (tag: string, name: string) => {
    setError("");
    try {
      await tagAPI.rename(tag, name.trim().toLowerCase());
      await load();
      setRenaming(null);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Rename failed");
    }
  };

  const handleMerge = async () => {
    setError("");
    setMerging(true);
    try {
      const [into, ...from] = mergeSelection;
      await tagAPI.merge(from, into);
      setMergeSelection([]);
      await load();
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Merge failed");
    } finally {
      setMerging(false);
    }
  };

  const handleDelete = async (tag: string) => {
    if (!window.confirm(`Delete tag #${tag}? This removes it from all items.`)) return;
    setError("");
    try {
      await tagAPI.remove(tag);
      await load();
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Delete failed");
    }
  };

  const selectable = mergeSelection.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Manage tags">
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm break-words">{error}</div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter tags"
            className="input-field pl-9 py-2"
          />
        </div>
        <button
          type="button"
          onClick={() => setMergeSelection((sel) => (sel.length ? [] : tags.filter((t) => t.count > 0).map((t) => t.name).slice(0, 2)))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all"
          title={mergeSelection.length ? "Clear selection" : "Merge mode"}
        >
          <CornerDownRight size={14} />
          Merge
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all disabled:opacity-50"
          aria-label="Refresh tags"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
        </button>
      </div>

      {loading && tags.length === 0 ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-10 text-text-muted text-sm">
          <Tag size={28} className="mx-auto mb-2 text-text-faint" />
          No tags yet. Tag your items to organize them.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
          {mergeSelection.length > 0 && (
            <p className="text-xs text-text-faint pb-1">
              Select tags to merge into one. {mergeSelection.length >= 2 && (
                <button onClick={handleMerge} disabled={merging} className="ml-1 text-accent hover:underline">
                  {merging ? "Merging..." : `Merge ${mergeSelection.length} into ${mergeSelection[0]}`}
                </button>
              )}
            </p>
          )}
          {tags.map((tag) => {
            const selectedTag = mergeSelection.includes(tag.name);
            const isMergeTarget = selectable && selectedTag && mergeSelection[0] === tag.name;
            return (
              <div
                key={tag.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                  selectedTag ? "bg-accent/10 border-accent/30" : "bg-surface border-border hover:border-border-strong"
                }`}
              >
                {selectable ? (
                  <button
                    type="button"
                    onClick={() =>
                      setMergeSelection((sel) =>
                        sel.includes(tag.name)
                          ? sel.filter((n) => n !== tag.name)
                          : [...sel, tag.name].slice(0, 5)
                      )
                    }
                    className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center text-[10px] ${
                      selectedTag ? "bg-accent border-accent text-accent-text" : "border-border-strong"
                    }`}
                    aria-label={`Toggle ${tag.name}`}
                  >
                    {selectedTag ? "✓" : ""}
                  </button>
                ) : (
                  <Tag size={14} className={`shrink-0 ${selectedTag && isMergeTarget ? "text-text" : "text-text-faint"}`} />
                )}

                {renaming?.tag === tag.name ? (
                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    <input
                      autoFocus
                      defaultValue={tag.name}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(tag.name, (e.target as HTMLInputElement).value);
                        if (e.key === "Escape") setRenaming(null);
                      }}
                      className="flex-1 min-w-0 bg-surface border border-accent rounded-lg px-2 py-1 text-sm text-text focus:outline-none"
                    />
                    <button type="button" onClick={() => setRenaming(null)} className="text-text-muted hover:text-text">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onFilterTag?.(tag.name);
                      onClose();
                    }}
                    className="flex-1 min-w-0 text-left"
                    title={`View all #${tag.name}`}
                  >
                    <span className="text-sm text-text truncate block">#{tag.name}</span>
                    <span className="text-[11px] text-text-faint">{tag.count} item{tag.count === 1 ? "" : "s"}</span>
                  </button>
                )}

                {!selectable && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setRenaming({ tag: tag.name, name: tag.name })}
                      className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted hover:text-text transition-all"
                      aria-label={`Rename ${tag.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tag.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-all"
                      aria-label={`Delete ${tag.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!selectable && tags.length > 1 && (
        <p className="text-xs text-text-faint mt-3 flex items-center gap-1.5">
          <CornerDownRight size={12} /> Merge mode lets you combine similar tags and update every item.
        </p>
      )}
    </Modal>
  );
};
