import * as cheerio from "cheerio";
import dns from "dns";

export interface PageMetadata {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
}

const USER_AGENT = "SecondBrainBot/1.0 (+https://secondbrain.app; metadata fetcher)";
const TIMEOUT_MS = 6000;

const validUrl = (str: string): boolean => /^https?:\/\//i.test(str);

const PRIVATE_IP_RE = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.0\.0\.0|169\.254\.\d+\.\d+|::1|fc00:|fe80:)/i;

const isPrivateOrReserved = async (hostname: string): Promise<boolean> => {
    if (PRIVATE_IP_RE.test(hostname)) return true;
    try {
        const addrs = await dns.promises.resolve4(hostname);
        return addrs.some((a) => PRIVATE_IP_RE.test(a));
    } catch {
        return false;
    }
};

const absoluteUrl = (maybeUrl: string, base: string): string | undefined => {
    if (!maybeUrl) return undefined;
    try {
        return new URL(maybeUrl, base).toString();
    } catch {
        return undefined;
    }
};

export const fetchPageMetadata = async (link: string, signal?: AbortSignal): Promise<PageMetadata> => {
    const result: PageMetadata = {};
    if (!validUrl(link)) return result;

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(link);
    } catch {
        return result;
    }
    if (await isPrivateOrReserved(parsedUrl.hostname)) return result;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const onAbort = () => controller.abort();
    if (signal) {
        if (signal.aborted) {
            clearTimeout(timer);
            return result;
        }
        signal.addEventListener("abort", onAbort);
    }

    try {
        const response = await fetch(link, {
            headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
            redirect: "follow",
            signal: controller.signal,
        });
        if (!response.ok || response.status >= 400) return result;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) return result;

        const html = (await response.text()).slice(0, 200_000);
        const $ = cheerio.load(html);

        const ogTitle = $("meta[property='og:title']").attr("content");
        const ogDesc = $("meta[property='og:description']").attr("content");
        const ogImage = $("meta[property='og:image']").attr("content");
        const metaDesc = $("meta[name='description']").attr("content");
        const htmlTitle = $("title").first().text();
        const siteName = $("meta[property='og:site_name']").attr("content");

        const pageTitle = (ogTitle || htmlTitle)?.replace(/\s+/g, " ").trim().slice(0, 200);
        const pageDescription = (ogDesc || metaDesc)?.replace(/\s+/g, " ").trim().slice(0, 1000);
        const pageImage = ogImage ? absoluteUrl(ogImage, link) : undefined;
        const pageSiteName = siteName?.trim().slice(0, 100);

        if (pageTitle) result.title = pageTitle;
        if (pageDescription) result.description = pageDescription;
        if (pageImage) result.image = pageImage;
        if (pageSiteName) result.siteName = pageSiteName;
        return result;
    } catch {
        return result;
    } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onAbort);
    }
};