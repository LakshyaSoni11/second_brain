import React, { useState } from "react";
import {
  Twitter,
  Youtube,
  FileText,
  LineChart,
  Link2,
  Tag,
  Trash2,
  ExternalLink,
  Star,
  Sparkles,
  Pencil,
  X,
  Loader2,
  Wand2,
  Plus,
  CheckSquare,
} from "lucide-react";
import { aiAPI } from "../../api/axios";
import type { ContentType } from "../../types";
import { MarkdownOrPlain } from "../common/Markdown";
import { MediaEmbed } from "../common/MediaEmbed";
import { hasEmbed } from "../../utils/embeds";

const typeConfig: Record<
  ContentType,
  { icon: React.ReactNode; label: string }
> = {
  tweet: { icon: <Twitter size={14} />, label: "Tweet" },
  video: { icon: <Youtube size={14} />, label: "Video" },
  doc: { icon: <FileText size={14} />, label: "Doc" },
  link: { icon: <Link2 size={14} />, label: "Link" },
  tag: { icon: <Tag size={14} />, label: "Tag" },
  note: { icon: <LineChart size={14} />, label: "Note" },
};

const inputCls =
  "w-full bg-surface border border-border rounded-xl px-3 py-2 text-text placeholder-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm";

export interface SavePayload {
  title: string;
  link?: string;
  description?: string;
  tags: string[];
}

interface ItemShape {
  _id: string;
  type: ContentType;
  title: string;
  link?: string;
  description?: string;
  tags: string[];
  summary?: string;
  isFavorite?: boolean;
  image?: string;
  siteName?: string;
  createdAt: string;
}

interface ContentCardProps {
  item: ItemShape;
  onDelete?: (id: string) => void;
  onSave?: (id: string, payload: SavePayload) => Promise<void>;
  onToggleFavorite?: (id: string, currentValue: boolean) => void;
  onSummarized?: (item: { _id: string; summary?: string }) => void;
  readOnly?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onDelete,
  onSave,
  onToggleFavorite,
  onSummarized,
  readOnly,
  selectable,
  selected,
  onToggleSelect,
}) => {
  const cfg = typeConfig[item.type];
  const canEdit = !readOnly && !!onSave;

  const [editing, setEditing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [summary, setSummary] = useState<string | undefined>(item.summary);
  const [error, setError] = useState("");

  const [editForm, setEditForm] = useState({ title: item.title, link: item.link || "", description: item.description || "" });
  const [editTagInput, setEditTagInput] = useState("");
  const [editTags, setEditTags] = useState<string[]>(item.tags);

  const isLinkType = item.type !== "tag";

  const addEditTag = () => {
    const t = editTagInput.trim().toLowerCase();
    if (t && !editTags.includes(t)) setEditTags((prev) => [...prev, t]);
    setEditTagInput("");
  };

  const removeEditTag = (tag: string) => setEditTags((prev) => prev.filter((t) => t !== tag));

  const resetEdit = () => {
    setEditing(false);
    setEditForm({ title: item.title, link: item.link || "", description: item.description || "" });
    setEditTags(item.tags);
    setError("");
  };

  const handleSave = async () => {
    if (!editForm.title.trim() || !onSave) return;
    setError("");
    try {
      await onSave(item._id, {
        title: editForm.title,
        ...(isLinkType ? { link: editForm.link } : {}),
        description: editForm.description,
        tags: editTags,
      });
      setEditing(false);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to save");
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    setError("");
    try {
      const { data } = await aiAPI.summarize(item._id);
      setSummary(data.summary as string);
      onSummarized?.({ _id: item._id, summary: data.summary as string });
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to summarize");
    } finally {
      setSummarizing(false);
    }
  };

  const handleAutotag = async () => {
    setTagging(true);
    setError("");
    try {
      const { data } = await aiAPI.autotag(item._id);
      setEditTags(data.tags as string[]);
      setEditing(true);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to suggest tags");
    } finally {
      setTagging(false);
    }
  };

  const embeddable = item.link && hasEmbed(item.link) ? item.link : undefined;

  const renderBody = () => {
    if (item.type === "note" && item.description) {
      return <MarkdownOrPlain text={item.description} />;
    }
    if (item.description && item.type === "doc") {
      return <MarkdownOrPlain text={item.description} compact />;
    }
    return item.description ? (
      <p className="text-xs text-text-muted line-clamp-2 leading-relaxed break-words">{item.description}</p>
    ) : null;
  };

  return (
    <div className={`glass-card group relative flex flex-col gap-3 animate-fade-in h-full ${selected ? "ring-2 ring-accent" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface border border-border text-text-muted">
          {cfg.icon} {cfg.label}
        </span>
        <div className="flex items-center gap-1">
          {selectable && (
            <button
              onClick={() => onToggleSelect?.(item._id)}
              className={`p-1.5 rounded-lg transition-all ${selected ? "text-accent bg-accent/10" : "text-text-faint hover:text-accent"}`}
              aria-label={selected ? "Deselect" : "Select for bulk actions"}
            >
              <CheckSquare size={14} />
            </button>
          )}
          {!readOnly && (
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
              {canEdit && (
                <button
                  onClick={() => (editing ? resetEdit() : setEditing(true))}
                  className="p-1.5 rounded-lg hover:bg-surface-hover text-text-faint hover:text-text transition-all"
                  aria-label="Edit"
                >
                  <Pencil size={14} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(item._id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-faint hover:text-red-500 transition-all"
                  aria-label="Delete content"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!editing && item.image && item.type !== "note" && (
        <a href={item.link} target="_blank" rel="noopener noreferrer" className="block -mx-1 rounded-xl overflow-hidden">
          <img src={item.image} alt="" className="w-full h-32 object-cover" loading="lazy" />
        </a>
      )}

      {!editing && embeddable && <MediaEmbed link={embeddable} />}

      {editing ? (
        <div className="space-y-2">
          <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" className={inputCls} />
          {isLinkType && (
            <input value={editForm.link} onChange={(e) => setEditForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://..." className={inputCls} />
          )}
          <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder={item.type === "note" ? "Markdown supported: **bold**, # heading, `code`… " : "Description"} rows={3} className={`${inputCls} resize-none font-mono text-xs`} />
          <div className="flex gap-2">
            <input
              value={editTagInput}
              onChange={(e) => setEditTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEditTag();
                }
              }}
              placeholder="Add tag"
              className={`${inputCls} flex-1 min-w-0`}
            />
            <button
              type="button"
              onClick={handleAutotag}
              disabled={tagging}
              className="px-2.5 py-2 rounded-xl bg-surface border border-border text-accent hover:bg-surface-hover transition-all disabled:opacity-50"
              aria-label="Auto-tag with AI"
              title="Suggest tags with AI"
            >
              {tagging ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            </button>
            <button
              type="button"
              onClick={addEditTag}
              className="px-2.5 py-2 rounded-xl bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all"
              aria-label="Add tag"
            >
              <Plus size={14} />
            </button>
          </div>
          {editTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {editTags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent">
                  #{tag}
                  <button type="button" onClick={() => removeEditTag(tag)} className="hover:text-red-500 ml-0.5" aria-label={`Remove ${tag}`}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-500 break-words">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-accent-text hover:bg-accent-hover transition-all">
              Save
            </button>
            <button onClick={resetEdit} className="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2 break-words">{item.title}</h3>

          {item.siteName && (
            <p className="text-[11px] text-text-faint -mt-1">{item.siteName}</p>
          )}

          {summary && (
            <div className="text-xs text-text-muted leading-relaxed break-words bg-surface border border-border rounded-xl p-2.5">
              {summary}
            </div>
          )}

          {renderBody()}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border text-text-muted">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-500 break-words">{error}</p>}

          {!readOnly && canEdit && (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="inline-flex items-center gap-1 self-start text-[11px] px-2 py-1 rounded-lg bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all disabled:opacity-50"
              title="Summarize with AI"
            >
              {summarizing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {summarizing ? "Summarizing..." : "Summarize with AI"}
            </button>
          )}

          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors truncate"
            >
              <ExternalLink size={12} />
              <span className="truncate">{item.link}</span>
            </a>
          )}

          <div className="flex items-center justify-between mt-auto">
            <p className="text-xs text-text-faint">
              {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {!readOnly && onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(item._id, !!item.isFavorite)}
                className={`p-1 rounded-lg transition-all ${item.isFavorite ? "text-amber-500" : "text-text-faint hover:text-amber-500"}`}
                aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                {item.isFavorite ? <Star size={14} fill="currentColor" /> : <Star size={14} />}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
