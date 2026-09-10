import React, { useState } from "react";
import { Share2, Copy, Check, Loader2, Lock } from "lucide-react";
import { Modal } from "../ui/Modal";
import { shareAPI } from "../../api/axios";
import type { ShareInfo } from "../../types";

interface ShareModalProps {
  shareData: ShareInfo;
  onSaved: (data: ShareInfo) => void;
  onClose: () => void;
}

const inputCls =
  "w-full bg-surface border border-border rounded-xl px-3 py-2 text-text placeholder-text-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm";

export const ShareModal: React.FC<ShareModalProps> = ({ shareData, onSaved, onClose }) => {
  const [enabled, setEnabled] = useState(shareData.isShared);
  const [slug, setSlug] = useState(shareData.slug ?? "");
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await shareAPI.toggle({
        isShared: enabled,
        slug: slug.trim() || undefined,
        password: password || undefined,
        ...(expiry ? { expiresInDays: Number(expiry) } : {}),
      });
      onSaved(data);
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to update sharing");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareData.shareLink) {
      navigator.clipboard.writeText(shareData.shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal open onClose={onClose} title="Share your brain">
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm break-words">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-text">Public share link</p>
            <p className="text-xs text-text-faint">Anyone with the link can read your saved items.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-all ${enabled ? "bg-accent" : "bg-border-strong"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-bg transition-all ${enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </label>

        {enabled && (
          <>
            {shareData.shareLink && (
              <div className="flex items-center gap-2">
                <input readOnly value={shareData.shareLink} className={`${inputCls} flex-1 min-w-0 text-xs text-text-muted`} />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-xl bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all"
                  aria-label="Copy link"
                >
                  {copied ? <Check size={15} className="text-accent" /> : <Copy size={15} />}
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Custom link (optional)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-faint shrink-0 select-none">{window.location.origin}/brain/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="my-brain"
                  className={`${inputCls} flex-1 min-w-0`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Password (optional)</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-2.5 text-text-faint" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Protect with a password"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Expire after (optional)</label>
              <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className={`${inputCls} appearance-none`}>
                <option value="" className="bg-surface">Never</option>
                <option value="1" className="bg-surface">1 day</option>
                <option value="7" className="bg-surface">1 week</option>
                <option value="30" className="bg-surface">1 month</option>
                <option value="90" className="bg-surface">3 months</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button type="button" onClick={handleSave} disabled={loading} className="flex-1 btn-primary py-2.5">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
          {enabled ? "Save settings" : "Disable sharing"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-surface border border-border text-text-muted hover:bg-surface-hover transition-all">
          Close
        </button>
      </div>
    </Modal>
  );
};
