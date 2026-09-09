import * as cheerio from "cheerio";

const STOPWORDS = new Set([
    "the", "and", "for", "with", "that", "this", "your", "from", "are", "you", "not",
    "have", "has", "was", "were", "will", "can", "all", "but", "out", "off", "over",
    "into", "about", "than", "them", "they", "their", "there", "which", "what", "when",
    "where", "who", "how", "why", "just", "also", "more", "most", "some", "such",
    "only", "very", "even", "then", "than", "these", "those", "its", "it's", "we", "our",
    "us", "you're", "your", "get", "got", "one", "two", "use", "using", "used", "now",
    "some", "make", "made", "new", "good", "great", "best", "well", "really", "much",
    "many", "don't", "dont", "can't", "cant", "would", "should", "could", "etc", "amp",
    "com", "www", "http", "https",
]);

export interface ExtractedText {
    title: string;
    text: string;
}

export const extractTextFromHtml = (
    html: string,
    maxLength = 12000,
    maxTitleLength = 150
): ExtractedText => {
    const $ = cheerio.load(html);
    $("script, style, noscript, nav, footer, header, aside, iframe, svg, form, button").remove();

    const title =
        $("meta[property='og:title']").attr("content") ||
        $("title").first().text() ||
        $("h1").first().text();

    const text = $("body")
        .text()
        .replace(/[\t\n\r]+/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .trim()
        .slice(0, maxLength);

    return {
        title: title.replace(/\s+/g, " ").trim().slice(0, maxTitleLength),
        text,
    };
};

export const extractiveSummary = (text: string, maxSentences = 3): string => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return "No content available to summarize.";
    // split on sentence-ending punctuation
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
    const summary = sentences
        .slice(0, maxSentences)
        .join(" ")
        .trim();
    return summary.length > 2500 ? `${summary.slice(0, 2500)}…` : summary;
};

export const getKeywords = (text: string, max = 8, minLength = 4): string[] => {
    const counts = new Map<string, number>();
    text.toLowerCase()
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= minLength && !STOPWORDS.has(w) && !/^\d+$/.test(w))
        .forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, max)
        .map(([word]) => word);
};

export const safeHost = (link?: string): string => {
    if (!link) return "";
    try {
        return new URL(link).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
};