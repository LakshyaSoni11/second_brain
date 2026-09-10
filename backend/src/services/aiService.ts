import { IContent } from "../models/Content";
import { extractTextFromHtml, extractiveSummary, getKeywords, safeHost } from "../utils/text";
import dns from "dns";

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

const callOpenAI = async (prompt: string, maxTokens = 250): Promise<string | null> => {
    // Prefer Groq (OpenAI-compatible API) when its key is set; fall back to OpenAI.
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    const baseUrl = process.env.GROQ_API_KEY
        ? "https://api.groq.com/openai/v1"
        : "https://api.openai.com/v1";
    const model =
        process.env.GROQ_MODEL ||
        process.env.OPENAI_MODEL ||
        (process.env.GROQ_API_KEY ? "qwen/qwen3.8-27b" : "gpt-4o-mini");
    try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.4,
            }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
        };
        return data.choices?.[0]?.message?.content?.trim() || null;
    } catch {
        return null;
    }
};

interface FetchResult {
    bodyText: string;
    pageTitle: string;
}

const fetchPageText = async (url: string): Promise<FetchResult> => {
    const empty: FetchResult = { bodyText: "", pageTitle: "" };
    try {
        const parsedUrl = new URL(url);
        if (await isPrivateOrReserved(parsedUrl.hostname)) return empty;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            },
            redirect: "follow",
        });
        clearTimeout(timeout);
        if (!res.ok) return empty;
        const html = await res.text();
        const { title, text } = extractTextFromHtml(html, 12000);
        return { bodyText: text, pageTitle: title };
    } catch {
        return empty;
    }
};

// Summarize a saved item. Uses an LLM when OPENAI_API_KEY is set,
// otherwise falls back to an extractive summary so it works out-of-the-box.
export const summarizeContent = async (content: IContent): Promise<string> => {
    const fallbackText = [content.title, content.description].filter(Boolean).join(". ");
    let bodyText = "";
    let pageTitle = "";

    if (content.link) {
        ({ bodyText, pageTitle } = await fetchPageText(content.link));
    }

    const source = bodyText || fallbackText || content.title;
    const llm = await callOpenAI(
        `Summarize the following content in 2-3 concise sentences that capture the key points. ` +
            `Keep it plain text, no markdown, under 120 words.\n\nTitle: ${pageTitle || content.title}\n\nContent:\n${source.slice(0, 14000)}`
    );
    if (llm) return llm;

    const extracted = extractiveSummary(source);
    return bodyText || extracted.length > fallbackText.length ? extracted : fallbackText.slice(0, 400);
};

// Grounded "RAG" answer: the LLM answers strictly from the numbered sources passed in context.
// Returns null when no LLM is available (caller falls back to a deterministic answer).
export const answerFromContext = async (question: string, context: string): Promise<string | null> => {
    const prompt =
        `You are answering a question using ONLY the user's saved notes ("brain"), shown below as numbered sources ` +
        `(a source has type, title, tags, a short snippet, and optionally a link).\n\n` +
        `Rules:\n` +
        `- Answer from the sources. If the sources don't contain the answer, say so plainly ` +
        `(e.g. "This isn't in your brain yet — save something about X and ask me again") without guessing.\n` +
        `- Cite your sources inline like [1], [2] right after the sentence that uses them.\n` +
        `- Keep it concise, under 180 words. Use short markdown bullets where it helps.\n\n` +
        `SOURCES:\n${context}\n\nQUESTION: ${question}`;
    return callOpenAI(prompt, 320);
};

// Suggest tags for a saved item.
export const autotagContent = async (content: IContent): Promise<string[]> => {
    const existing = content.tags || [];
    const urlText: string = content.link ? await fetchPageText(content.link).then((r) => r.pageTitle || r.bodyText.slice(0, 500)) : "";
    const rawText = `${urlText} ${content.title} ${content.description || ""}`;

    const llm = await callOpenAI(
        `You are a tagging assistant. Given the item below, return 3-6 short, specific, lowercase ` +
            `tags as a plain comma-separated list (e.g. "ai, machine-learning, tutorial"). ` +
            `Do not include any other text.\n\nTitle: ${content.title}\n\nText/extract:\n${rawText.slice(0, 2000)}`,
        60
    );

    if (llm) {
        const tags = llm
            .split(",")
            .map((t) => t.trim().replace(/^#/, "").toLowerCase().slice(0, 50))
            .filter((t) => t.length > 1)
            .slice(0, 6);
        if (tags.length) return Array.from(new Set([...tags, ...existing])).slice(0, 30);
    }

    const keywords = getKeywords(rawText, 6);
    const host = safeHost(content.link);
    const hostTag = host.startsWith("youtu") || host === "twitter.com" ? host.split(".")[0] : host;
    const suggested = Array.from(
        new Set([...(hostTag ? [hostTag] : []), ...keywords, ...existing])
    ).slice(0, 30);
    return suggested.length ? suggested : ["uncategorized"];
};