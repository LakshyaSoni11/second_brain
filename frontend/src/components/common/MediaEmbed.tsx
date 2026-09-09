import React from "react";
import { ExternalLink } from "lucide-react";
import { getYouTubeId, getYouTubeTimestamp, isYouTube, isTwitterPost, twitterEmbedUrl } from "../../utils/embeds";

export const MediaEmbed: React.FC<{ link: string; autoHeight?: boolean }> = ({ link, autoHeight }) => {
  if (isYouTube(link)) {
    const id = getYouTubeId(link)!;
    const t = getYouTubeTimestamp(link);
    return (
      <div className={autoHeight ? "" : "aspect-video"}>
        <iframe
          className="w-full h-full rounded-xl border border-white/10 bg-black"
          src={`https://www.youtube-nocookie.com/embed/${id}${t ? `?start=${t}` : ""}`}
          title="YouTube preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      </div>
    );
  }

  if (isTwitterPost(link)) {
    return (
      <div className="flex flex-col items-start gap-2">
        <iframe
          className="w-full rounded-xl border border-white/10 bg-transparent min-h-[100px]"
          src={twitterEmbedUrl(link)}
          title="X/Twitter preview"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups"
          style={{ maxHeight: 480 }}
        />
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
        >
          <ExternalLink size={11} /> Open on X
        </a>
      </div>
    );
  }

  // Generic video/audio file
  const ext = link.toLowerCase().split(".").pop();
  if (ext === "mp4" || ext === "webm" || ext === "ogg") {
    return <video src={link} controls className="w-full rounded-xl border border-white/10 bg-black max-h-56" preload="metadata" />;
  }
  if (ext === "mp3") {
    return <audio src={link} controls className="w-full rounded-xl bg-black/40" preload="metadata" />;
  }

  return null;
};