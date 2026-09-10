import { AgentChatMessage, AgentDef, AgentStreamEvent, AgentToolCall, AgentToolResult, AssistantTurn } from "./types";
import Content, { IContent } from "../models/Content";
import { groq } from "@ai-sdk/groq";
import { AGENT_TOOLS } from "./tools";
import { generateText, streamText, tool, ToolSet } from "ai";
import { AGENTS } from "./registry";

export const llmEnabled = (): boolean => {
    const key = (process.env.GROQ_API_KEY || "").trim();
    return key.length > 0 && key !== "your_groq_api_key_here";
};
export const llmModel = (): string =>
    process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

type StepShape = {
    toolCalls?: Array<{toolName?:string; args?: unknown}>;
    toolResults?: Array<{toolName?: string; args?: unknown; 
    result?: unknown; isError?: boolean}>;
}
//this aisdk v5+ result.steps is asynciterable/promise; in older versions its an array hence handling all the cases
async function* collectSteps<T>(steps: T[] | AsyncIterable<T> | Promise<T[]> | undefined) : AsyncGenerator<T> {
    if(!steps) return ;
    if(steps instanceof Promise){
        steps = await steps;
    }
    if(Array.isArray(steps)){//if its array
        for(const s of steps) yield s;//return one by one
        return;
    }
    // if asynciterable then yeild in that way
    if(typeof (steps as AsyncIterable<T>)[Symbol.asyncIterator] === "function"){
        for await (const s of steps as AsyncIterable<T>) yield s;
    }
}

const toToolCalls = (raw : StepShape[]) : AgentToolCall[] =>{
    const calls: AgentToolCall[] = [];
    //for setting steps and which tool to call for what queries hence creating array of object consisting of tool_name and args
    for(const step of raw){
        for(const tools of step.toolCalls ?? []){
            calls.push({name: tools.toolName ?? "", args: (tools.args as Record<string, unknown>) ?? {}})
        }
    }

    //nowo for results
    for(const step of raw){
        for(const results of step.toolResults ?? []){
            const name = results.toolName ?? "";
            const last = calls.filter((c) => c.name === name).at(-1);
            if(last) last.result = results.result ?? {ok: results.isError === false, error: "tool failed"};
        }
    }
    return calls;//array of calls 
}

//brain notes := will have all the context of the user brain

const buildBrainNotes = async (userId: string):Promise<string> =>{
    const docs = await Content.find({userId}).sort({createdAt: -1}).limit(8);
    if(docs.length === 0) return "No saved content yet";
    return docs.map(
        (d: IContent) =>
             `- [${d.type}] ${d.title}${(d.tags ?? []).length ? ` (tags: ${d.tags.join(", ")})` : ""}` +
                `${d.summary ? ` — ${d.summary}` : ""}${d.link ? ` — <${d.link}>` : ""}`
        
    ).join("\n");
}; 

const model = () => groq(llmModel());

const looksLikeRawJson = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (/^[\[{]/.test(trimmed)) return true;
    if (/^\s*("items"|"tags"|"total"|"topTags"|"ok"|"data")\s*:/m.test(trimmed)) return true;
    if (/^\s*\{[\s\S]*\}\s*$/.test(trimmed) && trimmed.length > 80) return true;
    return false;
};

const formatToolResults = (toolCalls: AgentToolCall[]): string => {
    const lines: string[] = [];
    for (const tc of toolCalls) {
        const data = (tc.result as { ok?: boolean; data?: unknown })?.data;
        if (!data) continue;
        if (tc.name === "recent_items") {
            const items = (data as { items?: Array<{ title: string; tags: string[]; summary?: string; createdAt: string }> })?.items;
            if (items?.length) {
                lines.push("## Recent saved items:");
                for (const it of items) {
                    const day = new Date(it.createdAt).toLocaleDateString();
                    const tagStr = it.tags?.length ? ` (${it.tags.join(", ")})` : "";
                    const oneLiner = it.summary || "";
                    lines.push(`- ${day} — **${it.title}**${tagStr}${oneLiner ? ` — ${oneLiner}` : ""}`);
                }
            }
        } else if (tc.name === "brain_stats") {
            const stats = data as { total?: number; favourites?: number; topTags?: Array<{ name: string; count: number }> };
            if (stats.total !== undefined) {
                lines.push(`## Brain stats: ${stats.total} items, ${stats.favourites ?? 0} favorites`);
            }
            if (stats.topTags?.length) {
                lines.push("Top tags: " + stats.topTags.slice(0, 8).map((t) => `${t.name}(${t.count})`).join(", "));
            }
        } else if (tc.name === "top_tags") {
            const tags = (data as { tags?: Array<{ name: string; count: number }> })?.tags;
            if (tags?.length) {
                lines.push("## Top tags: " + tags.slice(0, 10).map((t) => `${t.name}(${t.count})`).join(", "));
            }
        } else if (tc.name === "brain_search") {
            const items = (data as { items?: Array<{ title: string; tags: string[]; summary?: string; link?: string }> })?.items;
            if (items?.length) {
                lines.push("## Search results:");
                for (const it of items) {
                    const tagStr = it.tags?.length ? ` (${it.tags.join(", ")})` : "";
                    const snippet = it.summary ? ` — ${it.summary}` : "";
                    lines.push(`- **${it.title}**${tagStr}${snippet}`);
                }
            }
        }
    }
    return lines.join("\n");
};

//for emitting the agent calls
type Emit = (event: AgentStreamEvent) => void;

//llm chat logic which will have knowledge of full user brain and will use it accordingly

export const llmChat = async (opts: {
    agent: AgentDef;
    userId: string;
    message: string;
    history: AgentChatMessage[];
    emit?: Emit;
    aborted?: () => boolean;
}): Promise<{ text: string; toolCalls: AgentToolCall[] }> => {
    const { agent, userId, message, history, emit } = opts;
    const notes = await buildBrainNotes(userId);

    const tools = Object.fromEntries(
        agent.tools.map((name) => {
            const t = AGENT_TOOLS[name];
            return [
                name,
                tool({
                    description: t?.description ?? "",
                    inputSchema: (t?.parameters ?? {}) as never,
                    execute: async (input: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> =>
                        t
                            ? t.execute(userId, (input || {}) as Record<string, unknown>)
                            : { ok: false, error: `Unknown tool: ${name}` },
                }),
            ];
        })
    ) as ToolSet;

    const messages = [
        {role: "system" as const, content: `${agent.buildSystemPrompt({userId, now: new Date()})}\n\nBRAINNOTES:\n${notes}`},
        ...history.map((m) => ({role: m.role, content: m.content})),
        {role: "user" as const, content: message },
    ];

    const result = streamText({
        model: model(),
        system: undefined as never,//because its already embedded in the above messages secrtion
        messages,
        tools,
        temperature: agent.temperature,
        maxRetries: 1,
    });

    const text: string[] = [];
    const rawSteps: StepShape[] =[];
    for await (const chunk of result.textStream){
        if(opts.aborted?.()) break;
        text.push(chunk);
        if(opts.emit) opts.emit({type: "delta", text:chunk});
    }

    for await(const step of collectSteps(result.steps as never)){
        rawSteps.push(step as unknown as StepShape);
    }
    const toolCalls = toToolCalls(rawSteps);

    for(const calls of toolCalls){
        if(opts.emit) opts.emit({type: "tool", name: calls.name, args: calls.args, result: calls.result});
    }

    return {text: text.join(""), toolCalls};

};


const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const emitWords = async (emit: Emit | undefined, text: string, aborted?: () => boolean): Promise<void> => {
    const words = text.split(/\s+/).filter(Boolean);
    for (const word of words) {
        if (aborted?.()) return;
        if (emit) emit({ type: "delta", text: word + " " });
        if (emit) await sleep(8);
    }
};

const finishTurn = async (
    text: string,
    toolCalls: AgentToolCall[],
    emit?: Emit,
    aborted?: () => boolean
): Promise<{ text: string; toolCalls: AgentToolCall[] }> => {
    await emitWords(emit, text, aborted);
    return { text, toolCalls };
};

const buildNuroIntro = (): string[] => [
    "Hey! 👋 I'm **Nuro**, your brain assistant.",
    "",
    "I can help you with anything you've saved:",
    "- **Ask** — search your brain for topics you've saved (e.g. \"what do I know about React?\")",
    "- **Digest** — \"give me my weekly digest\" to recap what you saved recently",
    "- **Research** — \"research LLM agents\" for a mini report on a topic",
    "- **Organize** — \"organize my tags\" to clean up your tag structure",
    "- **Save** — \"save this link: <url>\" to capture something new",
    "- **Summarize** — \"summarize <title>\" for a short take on a saved item",
    "",
    "Type anything above and I'll take care of it. 😊",
];

const fallbackChat = async(opts:{
    userId: string;
    message: string;
    emit?: Emit;
    aborted?: () => boolean;
}): Promise<{text: string; toolCalls: AgentToolCall[]}> =>{
    const {userId, message, emit} =opts;
    const query = message.toLowerCase().trim();
    const tokens = query.split(/\s+/).filter((w)=> w.length > 2);
    const toolCalls:AgentToolCall[] = [];

    // --- Intent: reserved auto-greeting (opened the chat) or casual chit-chat ---
    const casual = query === "OPENAI_GREETING_TOKEN" || query === "__nuro_greet__" ||
        /^(hey|hi|hello|yo|sup|howdy|hola|namaste|good\s*(morning|afternoon|evening|night)|hiya)\b/.test(query) ||
        /^(how are you|whats up|what'?s up|thanks|thank you|thx|ty|good|nice|awesome)\b/.test(query);
    if (casual) {
        const lines = buildNuroIntro();
        return await finishTurn(lines.join("\n"), toolCalls, emit, opts.aborted);
    }

    // --- Intent: weekly digest / recap ---
    if (/(digest|weekly|recap|saved recently|recent activity|last week|this week)/.test(query)) {
        const recent = (await runToolRaw("recent_items", userId, { limit: 12 })
        )?.data as {items: Array<{createdAt: string; title: string; tags: string[]; summary?: string}>} | undefined;
        toolCalls.push({name: "recent_items", args: {limit:12}, result: recent});
        const stats = (
            await runToolRaw("brain_stats", userId, {}) )?.data as {total: number; favourites: number; topTags: Array<{name: string; count: number}>} | undefined;
        toolCalls.push({name: "brain_stats", args: {}, result: stats});
        const lines = ["# Your Brain Digest", "", "## Most recent saved", ""];
        if(!recent?.items?.length){
            lines.push("Nothing saved yet — add links and notes to create your first digest.");
        }else{
            for( const it of recent.items){
                const day = new Date(it.createdAt).toDateString();
                const oneLiner = it.summary || it.title;
                lines.push(`- ${day} — **${it.title}**${(it.tags ?? []).length ? ` (${it.tags.join(", ")})` : ""} — ${oneLiner}`);
            }
        }
        lines.push("", "## Top categories");
        for(const t of (stats?.topTags ?? []).slice(0, 8)){
            lines.push(`- ${t.name} (${t.count})`);
        }
        lines.push("",
            (stats?.total ?? 0) === 0
                ? "Save a few links this week and come back for a smarter digest."
                : `You saved ${stats?.total ?? 0} items (${stats?.favourites ?? 0} favorites) — pick the top 2 favorites and re-read them this week.`
        );
        return await finishTurn(lines.join("\n"), toolCalls, emit, opts.aborted);
    }

    // --- Intent: organize tags ---
    if (/(organi[sz]e|organi[sz]ing)/.test(query) && /(tag)/.test(query) || /(merge tags|tag.*clean|clean.*tag)/.test(query)) {
        const tags = (await runToolRaw("top_tags", userId, {limit: 12}))?.data as {
            tags: Array<{name: string; count: number}>;
        };
        toolCalls.push({name: "top_tags", args: {limit:12}, result:tags});
        const lines = ["# Tag Organization Plan", "", "## Keep as-is"];
        for (const t of (tags.tags ?? []).slice(0, 6)) lines.push(`- ${t.name} (${t.count})`);
        lines.push("","## Suggested merges", "- (your similar tags will appear here — e.g. `ml` vs `machine-learning`)");
        lines.push("", `> You currently have ${tags?.tags?.length ?? 0} tags. For AI-generated merge suggestions, set GROQ_API_KEY in backend/.env.`);
        return await finishTurn(lines.join("\n"), toolCalls, emit, opts.aborted);
    }

    // --- Research a topic ---
    const researchIntent = /(research|deep dive|deep-dive|what do i know|what.*know about|study|learn about|report on)/.test(query);
    const res = await runToolRaw("brain_search", userId, {q: tokens.join(" ") || "recent", limit: 8});
    const matches = res?.data as
        | {items: Array<{_id: string; title: string; tags: string[]; summary?: string}>}
        | undefined;
    toolCalls.push({name: "brain_search", args: {q: tokens.join(" ") || "recent", limit: 8}, result: matches});

    if (researchIntent) {
        const lines = [`# Research: ${message.trim()}`, "", "## What you already have", ""];
        if(!matches?.items.length){
            lines.push("Nothing saved yet on this topic.", "");
        }else{
            for( const it of matches.items) lines.push(`- **${it.title}**${(it.tags ?? []).length ? ` (${it.tags.join(", ")})` : ""}${it.summary ? ` — ${it.summary}` : ""}`);
            lines.push("");
        }
        lines.push("## Quick overview");
        lines.push(
            matches?.items.length
              ? `You have ${matches.items.length} saved item(s) matching this topic. Review them above — each is a good starting point for a deeper dive.`
                : "No sources on this topic yet — you're a blank canvas.", "",
                "## Recommended next reads",
            `1. Search: "${message.trim()} best practices"`,
            `2. Search: "${message.trim()} for beginners"`,
            `3. Follow the people/accounts that write about "${message.trim()}"`,
            "",
            "> For a deeper AI-generated report, set GROQ_API_KEY in backend/.env."
        );
        return await finishTurn(lines.join("\n"), toolCalls, emit, opts.aborted);
    }

    // --- Default: chat Q&A ---
    const lines2: string[] = [];
    if(matches?.items.length){
        lines2.push(`Here's what I found in your brain for **"${message.trim()}"**:`);
        for( const item of matches.items){
              lines2.push(`- **${item.title}**${(item.tags ?? []).length ? ` (${item.tags.join(", ")})` : ""}${item.summary ? ` — ${item.summary}` : ""}`);
        }
        lines2.push("", "Ask me to summarize any of these, tell me to research the topic, or ask for a weekly digest.");
    }
    else{
        lines2.push( `I don't have anything saved about **"${message.trim()}"** yet.`,
            "",
            "Here's what I can do instead:",
            `- Tell me what to save (e.g. "save this article: <url>") and I'll add it to your brain`,
            `- Ask for a broad recap: "what's saved about X?"`,
            `- Say "weekly digest" and I'll summarize everything you saved recently`);
    }
    return await finishTurn(lines2.join("\n"), toolCalls, emit, opts.aborted);
};

const runToolRaw = (
    name: string,
    userId: string,
    args: Record<string, unknown>
): Promise<AgentToolResult> | undefined => AGENT_TOOLS[name]?.execute(userId, args);

const llmRun = async (opts: {
    agent: AgentDef;
    userId: string;
    input: string;
}): Promise<AssistantTurn> =>{
    const notes = await buildBrainNotes(opts.userId);
    const tools = Object.fromEntries(
        opts.agent.tools.map((name) =>{
            const t = AGENT_TOOLS[name];
            return [
                name,
                tool({
                    description: t?.description ?? "",
                    inputSchema: (t?.parameters ?? {}) as never,
                    execute: async (input: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> =>
                        t
                            ? t.execute(opts.userId, (input || {}) as Record<string, unknown>)
                            : { ok: false, error: `Unknown tool: ${name}` },
                }),
            ];
        })
    ) as ToolSet;

    const result = await generateText({
        model: model(),
        system: `${opts.agent.buildSystemPrompt({ userId: opts.userId, now: new Date() })}\n\n` +
            `IMPORTANT: Format your response as clean markdown. Never output raw JSON objects.\n` +
            `Use the tool data to produce human-readable sections with headers, bullets, and bold text.\n\n` +
            `BRAIN NOTES:\n${notes}`,
        prompt: opts.input,
        tools,
        temperature: opts.agent.temperature,
        maxRetries: 1,
    });

    const toolCalls = toToolCalls(result.steps as unknown as StepShape[]);
    let content = result.text;

    // If the LLM echoed raw JSON instead of formatting, rebuild from tool results
    if (!content.trim() || looksLikeRawJson(content)) {
        const formatted = formatToolResults(toolCalls);
        if (formatted) {
            content = `# Your Brain Digest\n\n${formatted}\n\n> Generated from your saved content.`;
        }
    }

    return { content, toolCalls };
};

//fallbacks for oneshot agents

const fallbackRun = async(opts:{
    agent: AgentDef;
    userId: string;
    input: string;
}) : Promise<AssistantTurn> =>{
    const toolCalls : AgentToolCall[] =[];
    const input = opts.input.trim() || "recent activity";

    if(opts.agent.id === "digest") {
        const recent = (await runToolRaw("recent_items", opts.userId, {limit: 12})
    )?.data as {items: Array<{createdAt: string; title: string; tags: string[]; summary?: string}>} | undefined;
    toolCalls.push({name: "recent_items", args: {limit:12}, result: recent});
    const stats = (
        await runToolRaw("brain_stats", opts.userId, {}) )?.data as {total: number; favourites: number; topTags: Array<{name: string; count: number}>} | undefined;
        toolCalls.push({name: "brain_stats", args: {}, result: stats});
        const lines = ["# Your Brain Digest", "## Most recent saved", ""];
        if(!recent?.items?.length){
            lines.push("Nothing saved yet — add links and notes to create your first digest.");
        }else{
            for( const it of recent.items){
                const day = new Date(it.createdAt).toDateString();
                const oneLiner = it.summary || it.title;
                lines.push(`- ${day} — **${it.title}** (${it.tags.join(", ")}) — ${oneLiner}`);
            }
        }
        lines.push("", "## Top Categories");
        for(const t of (stats?.topTags ?? []).slice(0, 8)){
            lines.push(`- ${t.name} (${t.count})`);
        }
        lines.push("",
            (stats?.total ?? 0) === 0
                ? "Save a few links this week and come back for a smarter digest."
                : `You saved ${stats?.total ?? 0} items (${stats?.favourites ?? 0} favorites) — pick the top 2 favorites and re-read them this week.`
        );
        return {content: lines.join("\n"), toolCalls};
    }

    //research or organizer work
    const matches = (
        await runToolRaw("brain_search", opts.userId, {q: input, limit: 8})
    )?.data as {items: Array<{title: string; tags: string[]; }>};
    toolCalls.push({name: "brain_search", args: {q: input, limit: 8}, result: matches});
    if(opts.agent.id === "organizer"){
        const tags = (await runToolRaw("top_tags", opts.userId, {limit: 12}))?.data as {
            tags: Array<{name: string; count: number}>;
        };
        toolCalls.push({name: "top_tags", args: {limit:12}, result:tags});
        const lines = ["# Tag Organization Plan", "", "## Keep as-is"];
        for (const t of (tags.tags ?? []).slice(0, 6)) lines.push(`- ${t.name} (${t.count})`);
        lines.push("","## Suggested merges", "- (provide your list of similar tags — e.g. `ml`/`machine-learning`)");
        lines.push("", "> AI-assisted tag cleanup requires a GROQ_API_KEY. The current list is shown above."); 
        return {content: lines.join("\n"), toolCalls};
    }
    const lines = [`Research: ${input}`, "", "## What you already have", ""];
    if(!matches.items.length){
        lines.push("Nothing saved yet on this topic.", "");
    }else{
        for(const it of matches.items) lines.push(`- **${it.title}**${it.tags.length ? ` (${it.tags.join(", ")})` : ""}`);
        lines.push("");
    }
    lines.push("##Quick overview");
    lines.push(
        matches.items.length
          ? `You have ${matches.items.length} saved item(s) matching this topic. Review them above — each is a good starting point for a deeper dive.`
            : "No sources on this topic yet — you're a blank canvas.", "",
            "## Recommended next reads",
        `1. Search: "${input} best practices"`,
        `2. Search: "${input} for beginners"`,
        `3. Follow the people/accounts that write about "${input}"`,
        "",
        "> For a deeper, AI-generated report, set GROQ_API_KEY in backend/.env."
    );
    return {content: lines.join("\n"), toolCalls};
};

export const runAgentChat = async(opts:{
    agent: AgentDef;
    userId: string;
    message: string;
    history: AgentChatMessage[];
    emit: Emit;
    aborted?: ()=> boolean;
}): Promise<{content: string; toolCalls: AgentToolCall[]}> =>{
    opts.emit({type: "start", agentId: opts.agent.id});
    let turn: { text: string; toolCalls: AgentToolCall[] };

    // Reserved greeting: always use the deterministic intro so it is instant + reliably streamed
    if (opts.message === "__nuro_greet__") {
        turn = await fallbackChat({
            userId: opts.userId,
            message: opts.message,
            emit: opts.emit,
            ...(opts.aborted ? { aborted: opts.aborted } : {}),
        });
    } else if (llmEnabled()) {
        try {
            turn = await llmChat({
                agent: opts.agent,
                userId: opts.userId,
                message: opts.message,
                history: opts.history,
                emit: opts.emit,
                ...(opts.aborted ? { aborted: opts.aborted } : {}),
            });
        } catch (error) {
            console.error("LLM chat failed, falling back:", error);
            turn = await fallbackChat({ userId: opts.userId, message: opts.message, emit: opts.emit, ...(opts.aborted ? { aborted: opts.aborted } : {}) });
        }
    } else {
        turn = await fallbackChat({ userId: opts.userId, message: opts.message, emit: opts.emit, ...(opts.aborted ? { aborted: opts.aborted } : {}) });
    }
    opts.emit({ type: "done", content: turn.text, toolCalls: turn.toolCalls });
    return { content: turn.text, toolCalls: turn.toolCalls };
};

export const runAgent = async (opts: {
    agent: AgentDef;
    userId: string;
    input: string;
}): Promise<AssistantTurn> =>{
    if (llmEnabled()) {
        try {
            return await llmRun({ agent: opts.agent, userId: opts.userId, input: opts.input });
        } catch (error) {
            console.error("LLM run failed, falling back:", error);
        }
    }
    return fallbackRun({ agent: opts.agent, userId: opts.userId, input: opts.input });
};

export const agentInfo = () =>({
    agents: AGENTS.map((a) =>({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        mode: a.mode,
        tools: a.tools,
    })),
    llmEnabled: llmEnabled(),
    model: llmEnabled() ? llmModel() : null,
});