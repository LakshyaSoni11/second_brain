export const getYouTubeId = (url?: string): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  return m ? m[1]! : null;
};

export const getYouTubeTimestamp = (url?: string): string | null => {
  if (!url) return null;
  const m = url.match(/[?&]t=(\d+)/);
  return m ? m[1]! : null;
};

export const isYouTube = (url?: string): boolean => getYouTubeId(url) !== null;

const TWITTER_HOSTS = ["twitter.com", "x.com", "www.twitter.com", "www.x.com"];

export const isTwitterPost = (url?: string): boolean => {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!TWITTER_HOSTS.includes(u.hostname)) return false;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length >= 2 && (parts[0] === "i" ? parts[1] === "status" : true);
  } catch {
    return false;
  }
};

export const twitterEmbedUrl = (url: string): string => `https://platform.twitter.com/embed/Tweet.html?ref_src=twsrc%5Etfw&url=${encodeURIComponent(url)}`;

const isAudioVideoExt = (url?: string): boolean => {
  if (!url) return false;
  try {
    const ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
    return ext === "mp4" || ext === "webm" || ext === "ogg" || ext === "mp3";
  } catch {
    return false;
  }
};

export const hasEmbed = (url?: string): boolean => isYouTube(url) || isTwitterPost(url) || isAudioVideoExt(url);