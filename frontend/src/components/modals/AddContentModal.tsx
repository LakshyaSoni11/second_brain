import React, { useEffect, useState } from "react";
import { Twitter, Youtube, FileText, Link2, Tag, LineChart, Plus, X, Wand2, Loader2 } from "lucide-react";
import { Modal } from "../ui/Modal";
import { useContent } from "../../hooks/useContent";
import { aiAPI } from "../../api/axios";
import type { Content, ContentType } from "../../types";
import { MarkdownBlock } from "../common/Markdown";

const TYPES: { value: ContentType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "tweet", label: "Tweet", icon: <Twitter size={16} />, color: "sky" },
  { value: "video", label: "Video", icon: <Youtube size={16} />, color: "red" },
  { value: "doc", label: "Doc", icon: <FileText size={16} />, color: "blue" },
  { value: "link", label: "Link", icon: <Link2 size={16} />, color: "green" },
  { value: "note", label: "Note", icon: <LineChart size={16} />, color: "violet" },
  { value: "tag", label: "Tag", icon: <Tag size={16} />, color: "yellow" },
];

const colorMap: Record<string, string> = {
  sky: "border-sky-500 bg-sky-500/20 text-sky-300",
  red: "border-red-500 bg-red-500/20 text-red-300",
  blue: "border-blue-500 bg-blue-500/20 text-blue-300",
  green: "border-green-500 bg-green-500/20 text-green-300",
  violet: "border-violet-500 bg-violet-500/20 text-violet-300",
  yellow: "border-yellow-500 bg-yellow-500/20 text-yellow-300",
};

interface AddContentModalProps {
  onClose: () => void;
  item?: Content | null;
}

export const AddContentModal: React.FC<AddContentModalProps> = ({ onClose, item }) => {
  const { add, update } = useContent();
  const isEditing = !!item;

  const [type, setType] = useState<ContentType>(item?.type ?? "link");
  const [title, setTitle] = useState(item?.title ?? "");
  const [link, setLink] = useState(item?.link ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [loading, setLoading] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setType(item.type);
      setTitle(item.title);
      setLink(item.link ?? "");
      setDescription(item.description ?? "");
      setTags(item.tags ?? []);
    }
  }, [item]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleAutotag = async () => {
    if (!item) return;
    setTagging(true);
    setError("");
    try {
      const { data } = await aiAPI.autotag(item._id);
      setTags(data.tags as string[]);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to suggest tags");
    } finally {
      setTagging(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        type: type as "tweet" | "video" | "doc" | "link" | "tag" | "note",
        title: title.trim(),
        link: type !== "tag" && type !== "note" ? link : undefined,
        description,
        tags,
      };
      if (item) {
        await update(item._id, payload);
      } else {
        await add(payload);
      }
      onClose();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e as Error).message ||
        "Failed to save";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isEditing ? "Edit item" : "Add to your Brain"}>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-words">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {TYPES.map(({ value, label, icon, color }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              type === value
                ? colorMap[color]
                : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Give it a descriptive title" className="input-field" />
        </div>

        {type !== "tag" && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">URL</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className="input-field" />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-400">
              {type === "note" ? "Note (Markdown supported)" : "Description (optional)"}
            </label>
            {type === "note" && description && (
              <button
                type="button"
                onClick={() => setShowPreview((p) => !p)}
                className="text-[11px] text-indigo-300 hover:text-indigo-200"
              >
                {showPreview ? "Hide preview" : "Preview"}
              </button>
            )}
          </div>
          {type === "note" && showPreview ? (
            <div className="input-field min-h-[96px]"><MarkdownBlock content={description || "Nothing to preview yet"} /></div>
          ) : (
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === "note" ? "Write in Markdown — **bold**, # heading, `code`, lists…" : "Add a short note..."} rows={3} className={`input-field resize-none ${type === "note" ? "font-mono text-xs" : ""}`} />
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-400">Tags</label>
            {isEditing && (
              <button
                type="button"
                onClick={handleAutotag}
                disabled={tagging}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 transition-all disabled:opacity-50"
              >
                {tagging ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                Auto-tag with AI
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add tag and press Enter"
              className="input-field flex-1 min-w-0"
            />
            <button type="button" onClick={addTag} className="px-3 py-2.5 rounded-xl glass border-white/20 text-gray-300 hover:bg-white/10 transition-all" aria-label="Add tag">
              <Plus size={14} />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 ml-0.5" aria-label={`Remove ${tag}`}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="w-full btn-primary py-3 mt-2">
          {loading ? "Saving..." : isEditing ? "Save changes" : "Save to Brain"}
        </button>
      </form>
    </Modal>
  );
};