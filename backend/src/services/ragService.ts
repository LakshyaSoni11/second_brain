import { Types } from "mongoose";
import Content, { ContentType, IContent } from "../models/Content";

const STOPWORDS = new Set([
    "the", "and", "for", "with", "that", "this", "your", "from", "are", "you", "not",
    "have", "has", "was", "were", "will", "can", "all", "but", "out", "off", "over",
    "into", "about", "than", "them", "they", "their", "there", "which", "what", "when",
    "where", "who", "how", "why", "just", "also", "more", "most", "some", "such",
    "only", "very", "even", "then", "these", "those", "its", "it's", "we", "our",
    "us", "you're", "get", "got", "one", "two", "use", "using", "used", "now",
    "make", "made", "new", "good", "great", "best", "well", "really", "much",
    "many", "would", "should", "could", "etc", "amp", "com", "www", "http", "https",
    "please", "tell", "give", "about", "know", "what's", "hmm", "lets", "let's",
]);

const QUERY_LIMIT = 400;
const MAX_TOKENS = 8;
const MAX_SNIPPET = 200;

const CONTENT_TYPES: ContentType[] = ["tweet", "video", "doc", "link", "tag", "note"];

const TYPE_ALIASES: Record<string, ContentType> = {
    video: "video", videos: "video", youtube: "video", yt: "video", loom: "video",
    tweet: "tweet", tweets: "tweet", twitter: "tweet", x: "tweet",
    doc: "doc", docs: "doc", document: "doc", documents: "doc", notion: "doc",
    link: "link", links: "link", url: "link", urls: "link", bookmark: "link", bookmarks: "link",
    tag: "tag", tags: "tag", note: "note", notes: "note",
};

const RECENCY_WORDS = new Set([
    "recent", "recently", "latest", "newest", "new", "last", "yesterday",
    "today", "this week", "this month", "old", "oldest", "earliest",
]);

export type QueryAction = "summarize" | "explain" | "list" | "search" | "unknown";

export interface QueryIntent {
    typeFilter: ContentType | null;
    recencyBoost: number; // 0 = none, 1 = mild, 2 = strong
    action: QueryAction;
    remainingTokens: string[];
}

const ACTION_PATTERNS: [QueryAction, RegExp][] = [
    ["summarize", /\b(summari[sz]e|recap|tldr|tl;dr|short\s*version|brief)\b/i],
    ["explain", /\b(what\s+(is|are|does|do)|meaning|define|definition|mean|tell\s+me\s+about|explain|who\s+(is|are|was))\b/i],
    ["list", /\b(show|list|all|every|my|recent|latest|newest|oldest|saved)\b/i],
    ["search", /\b(find|search|look\s+for|query|match)\b/i],
];

export const parseQueryIntent = (question: string): QueryIntent => {
    const lower = question.toLowerCase();
    let typeFilter: ContentType | null = null;
    let recencyBoost = 0;

    // Detect content type
    const words = lower.split(/[^a-z0-9]+/).filter(Boolean);
    for (const word of words) {
        if (TYPE_ALIASES[word]) {
            typeFilter = TYPE_ALIASES[word];
            break;
        }
    }

    // Detect recency intent
    for (const rw of RECENCY_WORDS) {
        if (lower.includes(rw)) {
            if (["oldest", "earliest", "old"].includes(rw)) {
                recencyBoost = -2;
            } else if (["recent", "recently", "latest", "newest", "today", "yesterday"].includes(rw)) {
                recencyBoost = 2;
            } else {
                recencyBoost = 1;
            }
            break;
        }
    }

    // Detect action intent
    let action: QueryAction = "unknown";
    for (const [act, rx] of ACTION_PATTERNS) {
        if (rx.test(lower)) {
            action = act;
            break;
        }
    }
    // "summarize" beats "list" when both match (e.g. "summarize my recent videos")
    if (action === "list" && /\b(summari[sz]e|recap)\b/i.test(lower)) {
        action = "summarize";
    }

    // Build remaining tokens (exclude type, recency, and action words)
    const intentWords = new Set([
        ...Object.keys(TYPE_ALIASES),
        ...RECENCY_WORDS,
        "show", "me", "find", "search", "look", "what", "did", "saved", "saved",
        "have", "my", "me", "want", "see", "list", "show", "fetch",
        "summarize", "summarise", "recap", "tldr", "explain", "tell", "mean",
        "meaning", "define", "definition", "who", "how",
    ]);

    const remainingTokens = words
        .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !intentWords.has(w))
        .slice(0, MAX_TOKENS);

    return { typeFilter, recencyBoost, action, remainingTokens };
};

export interface BrainSource {
    _id: string;
    type: string;
    title: string;
    description?: string;
    summary?: string;
    link?: string;
    tags: string[];
    createdAt: string;
    relevance: number;
    snippet: string;
}

export interface BrainRetrieval {
    sources: BrainSource[];
    context: string;
    hasContent: boolean;
    typeFilter: ContentType | null;
    recencyBoost: number;
    action: QueryAction;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const queryTokens = (question: string): string[] => {
    const intent = parseQueryIntent(question);
    return intent.remainingTokens.length > 0
        ? intent.remainingTokens
        : question
              .toLowerCase()
              .replace(/https?:\/\/\S+/g, " ")
              .split(/[^a-z0-9-]+/)
              .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
              .slice(0, MAX_TOKENS);
};

const wordMatch = (text: string, token: string): boolean =>
    new RegExp(`(^|[^a-z0-9-])(?:${token})(?=$|[^a-z0-9-])`, "i").test(text);

export interface ScorableContent {
    title: string;
    description?: string;
    summary?: string;
    link?: string;
    tags: string[];
    isFavorite: boolean;
    createdAt: Date;
    type?: string;
}

export const scoreBrainContent = (
    doc: ScorableContent,
    tokens: string[],
    now = Date.now(),
    recencyBoost = 0,
    typeFilter: string | null = null
): number => {
    // Intent-only query (no keyword tokens) — rank purely by recency + type match
    if (tokens.length === 0) {
        let score = 50;
        if (typeFilter && doc.type === typeFilter) score += 30;

        if (recencyBoost !== 0) {
            const ageDays = doc.createdAt
                ? Math.max(0, (now - new Date(doc.createdAt).getTime()) / 86400000)
                : 999;
            if (recencyBoost > 0) {
                score += Math.max(0, 1 - ageDays / 30) * recencyBoost * 10;
            } else {
                score += Math.min(1, ageDays / 90) * Math.abs(recencyBoost) * 10;
            }
        }

        if (doc.isFavorite) score += 4;
        return Math.min(100, Math.round(score * 10) / 10);
    }

    const field = {
        title: (doc.title || "").toLowerCase(),
        description: (doc.description || "").toLowerCase(),
        summary: (doc.summary || "").toLowerCase(),
        link: (doc.link || "").toLowerCase(),
        tags: (doc.tags || []).join(" ").toLowerCase(),
    };

    let raw = 0;
    let found = 0;
    for (const token of tokens) {
        let best = 0;
        if (wordMatch(field.title, token)) best += 3;
        else if (field.title.includes(token)) best += 2;

        if (wordMatch(field.tags, token)) best += 2;
        else if (field.tags.includes(token)) best += 1;

        if (wordMatch(field.summary, token)) best += 1.5;
        else if (field.summary.includes(token)) best += 1;

        if (wordMatch(field.description, token)) best += 1.5;
        else if (field.description.includes(token)) best += 1;

        if (field.link.includes(token)) best += 0.5;

        if (best > 0) {
            raw += best;
            found += 1;
        }
    }

    if (found === 0) return 0;

    const maxPossible = tokens.length * 9;
    const coverage = found / tokens.length;
    let score = (0.75 * (raw / maxPossible) + 0.25 * coverage) * 100;

    // Type match bonus
    if (typeFilter && doc.type === typeFilter) score += 20;

    if (doc.isFavorite) score += 4;

    // Recency
    const ageDays = doc.createdAt ? Math.max(0, (now - new Date(doc.createdAt).getTime()) / 86400000) : 0;
    if (recencyBoost > 0) {
        score += Math.max(0, 1 - ageDays / 30) * recencyBoost * 8;
    } else if (recencyBoost < 0) {
        score += Math.min(1, ageDays / 90) * Math.abs(recencyBoost) * 8;
    } else {
        score += Math.max(0, 1 - ageDays / 90) * 4;
    }

    return Math.min(100, Math.round(score * 10) / 10);
};

const snippetOf = (doc: IContent): string => {
    const source = doc.summary || doc.description || "";
    const text = source.replace(/\s+/g, " ").trim();
    return text.length > MAX_SNIPPET ? `${text.slice(0, MAX_SNIPPET)}…` : text;
};

const toSource = (doc: IContent, relevance: number): BrainSource => ({
    _id: String(doc._id),
    type: doc.type,
    title: doc.title,
    ...(doc.description ? { description: doc.description } : {}),
    ...(doc.summary ? { summary: doc.summary } : {}),
    ...(doc.link ? { link: doc.link } : {}),
    tags: doc.tags || [],
    createdAt: doc.createdAt.toISOString(),
    relevance,
    snippet: snippetOf(doc),
});

const buildContext = (sources: BrainSource[]): string =>
    sources
        .map((s, i) => {
            const tagLine = s.tags.length ? s.tags.join(", ") : "none";
            const lines = [
                `[${i + 1}] (${s.type}) ${s.title}`,
                `    tags: ${tagLine}`,
            ];
            if (s.snippet) lines.push(`    ${s.snippet}`);
            if (s.link) lines.push(`    <${s.link}>`);
            return lines.join("\n");
        })
        .join("\n\n");

export const retrieveBrain = async (
    userId: string,
    question: string,
    limit = 6
): Promise<BrainRetrieval> => {
    const intent = parseQueryIntent(question);
    const tokens = queryTokens(question);
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };

    // Apply type filter from intent
    if (intent.typeFilter) {
        filter.type = intent.typeFilter;
    }

    // Apply keyword regex filter
    if (tokens.length > 0) {
        const rx = new RegExp(tokens.map(escapeRegExp).join("|"), "i");
        filter.$or = [
            { title: rx },
            { description: rx },
            { summary: rx },
            { tags: rx },
            { link: rx },
        ];
    }

    let docs = await Content.find(filter).sort({ createdAt: -1 }).limit(QUERY_LIMIT);
    const now = Date.now();

    // If keyword search returned nothing but we have a type filter, try without type filter
    if (docs.length === 0 && intent.typeFilter) {
        const fallbackFilter: Record<string, unknown> = {
            userId: new Types.ObjectId(userId),
        };
        if (tokens.length > 0) {
            const rx = new RegExp(tokens.map(escapeRegExp).join("|"), "i");
            fallbackFilter.$or = [
                { title: rx },
                { description: rx },
                { summary: rx },
                { tags: rx },
                { link: rx },
            ];
        }
        docs = await Content.find(fallbackFilter).sort({ createdAt: -1 }).limit(QUERY_LIMIT);
        // Override type filter since we relaxed it
        if (docs.length > 0) intent.typeFilter = null;
    }

    // If still nothing and no tokens, just get recent content
    if (docs.length === 0 && tokens.length === 0) {
        docs = await Content.find({ userId: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(QUERY_LIMIT);
    }

    const ranked = docs
        .map((doc) => ({
            doc,
            score: scoreBrainContent(doc, tokens, now, intent.recencyBoost, intent.typeFilter),
        }))
        .filter((r) => (tokens.length > 0 && !intent.typeFilter ? r.score > 0 : true))
        .sort((a, b) => b.score - a.score || b.doc.createdAt.getTime() - a.doc.createdAt.getTime())
        .slice(0, limit);

    const sources = ranked.map((r) => toSource(r.doc, r.score));
    return {
        sources,
        context: buildContext(sources),
        hasContent: await Content.exists({ userId: new Types.ObjectId(userId) }) !== null,
        typeFilter: intent.typeFilter,
        recencyBoost: intent.recencyBoost,
        action: intent.action,
    };
};

export const buildFallbackAnswer = (
    question: string,
    sources: BrainSource[],
    typeFilter: ContentType | null = null,
    recencyBoost = 0,
    hasContent = true,
    action: QueryAction = "unknown"
): string => {
    if (!hasContent) {
        return "Your brain is empty right now.\n\nSave your first link, note or doc, then ask me anything about it here.";
    }

    if (sources.length === 0) {
        const parts = ["I couldn't find a strong match for that, but here's what I can do:\n"];

        if (typeFilter) {
            parts.push(`**You asked about ${typeFilter}s** — let me show you your recent ones:`);
        } else if (recencyBoost !== 0) {
            parts.push("**Here are your most recent saves:**");
        } else {
            parts.push("**Tips for better results:**");
            parts.push("- Ask by content type: \"show my videos\", \"my latest links\"");
            parts.push("- Ask about a topic: \"what have I saved about React?\"");
            parts.push("- Ask for recency: \"my recent saves\", \"what did I save today?\"");
        }

        return parts.join("\n");
    }

    const primary = sources[0];

    // Summarize action: use cached summaries if available
    if (action === "summarize") {
        const withSummary = sources.filter((s) => s.summary);
        if (withSummary.length > 0) {
            const lines = withSummary.map((s, i) => {
                const tagLine = s.tags.length ? ` (${s.tags.join(", ")})` : "";
                return `${i + 1}. **${s.title}**${tagLine}\n   ${s.summary}`;
            });
            return `Here's a summary of what I found:\n\n${lines.join("\n\n")}\n\nAsk me to dig deeper into any of these.`;
        }
        // No cached summaries — show what we have
        const lines = sources.map((s, i) => {
            const tagLine = s.tags.length ? ` (${s.tags.join(", ")})` : "";
            const snippet = s.snippet ? `\n   ${s.snippet}` : "";
            return `${i + 1}. **${s.title}**${tagLine}${snippet}`;
        });
        return `Here's what I found for **"${question.trim()}"**:\n\n${lines.join("\n\n")}\n\nNo cached summary available yet — I found the matching items above.`;
    }

    // Explain/meaning action: lead with the best snippet
    if (action === "explain" && primary) {
        const tagLine = primary.tags.length ? ` (${primary.tags.join(", ")})` : "";
        const lines = [`**${primary.title}**${tagLine}`];
        if (primary.summary) {
            lines.push("", primary.summary);
        } else if (primary.snippet) {
            lines.push("", primary.snippet);
        }
        if (primary.link) {
            lines.push("", `🔗 ${primary.link}`);
        }
        if (sources.length > 1) {
            lines.push("", `*I also found ${sources.length - 1} other related item${sources.length > 2 ? "s" : ""} in your brain.*`);
        }
        lines.push("", "Ask me to summarize or dig deeper into any of these.");
        return lines.join("\n");
    }

    // Default list/search action
    const lines = [`Here's what I found in your brain for **"${question.trim()}"**:`, ""];
    sources.forEach((s, i) => {
        const tagLine = s.tags.length ? ` (${s.tags.join(", ")})` : "";
        lines.push(`${i + 1}. **${s.title}**${tagLine}`);
        if (s.snippet) lines.push(`   ${s.snippet}`);
        if (s.link) lines.push(`   ${s.link}`);
    });
    lines.push(
        "",
        "Ask me to summarize any of them, or refine your question for more specific results."
    );
    return lines.join("\n");
};
