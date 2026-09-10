import Content, { ContentType, hashLink, IContent } from "../models/Content";
import { AgentToolDef, AgentToolResult } from "./types";
import mongoose, { Types } from "mongoose";
import z from "zod";
import { autotagContent, summarizeContent } from "../services/aiService";

const CONTENT_TYPES = ["tweet", "video", "doc", "link", "tag", "note"] as const;

const ofOk = (data: unknown): AgentToolResult => ({ ok: true, data });
const ofErr = (error: string): AgentToolResult => ({ ok: false, error });

const itemToDo = (c: IContent): Record<string, unknown> => ({
    _id: String(c._id),
    type: c.type,
    title: c.title,
    description: c.description,
    link: c.link,
    tags: c.tags,
    summary: c.summary,
    isFavorite: c.isFavorite,
    createdAt: c.createdAt.toISOString(),
});

const idOf = (args: Record<string, unknown>): string => String(args.id ?? args._id ?? "");

const scoredByTokens = (docs: IContent[], q: string): IContent[] => {
    const tokens = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (tokens.length === 0 && docs !== undefined) return docs;
    return docs
        .map((d) => {
            const text = `${d.title}`.toLowerCase().split(" ").slice(0, 3).join(" ") + ` ${d.tags.join(" ")} ${d.description || ""}`;
            let score = 0;
            for (const t of tokens) {
                const idx = text.indexOf(t);
                if (idx !== -1) score += idx < 60 ? 3 : 1;
                if (d.tags.some((tag) => tag.includes(t))) score += 2;
                if ((d.title || "").toLowerCase().includes(t)) score += 3;
            }
            return { d, score };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.d);
};

export const brainSearchTool: AgentToolDef = {
    name: "brain_search",
    description:
        "Search the users saved content by keywords. Optionally filter by type (tweet|video|doc|link|tag) or a single tag. Returns up to 10 matching items.",
    parameters: z.object({
        q: z.string().optional(),
        type: z.enum(CONTENT_TYPES).optional(),
        tag: z.string().optional(),
        limit: z.number().int().min(1).max(10).optional(),
    }),
    execute: async (userId: string, args: Record<string, unknown>): Promise<AgentToolResult> => {
        const q = typeof args.q === "string" ? args.q.trim() : "";
        const type = typeof args.type === "string" ? (args.type as ContentType) : undefined;
        const tag = typeof args.tag === "string" ? args.tag : undefined;
        const limit = typeof args.limit === "number" ? Math.min(args.limit, 10) : 5;

        const filter: Record<string, any> = { userId: new Types.ObjectId(userId) };

        if (type && (CONTENT_TYPES as readonly string[]).includes(type)) filter.type = type;
        if (tag) filter.tags = { $in: [tag] };
        try {
            const docs = q ? scoredByTokens(await Content.find(filter).limit(200), q) : await Content.find(filter).sort({ createdAt: -1 }).limit(limit);
            return ofOk({ items: docs.slice(0, limit).map(itemToDo) });
        } catch (error) {
            return ofErr(error instanceof Error ? error.message : "Search failed");
        }
    },
};


export const brainGetTool: AgentToolDef ={
    name: "brain_get",
    description: "Get the full detail (description, link, summary) of one saved item by its _id.",
    parameters: z.object({id: z.string().min(1)}),
    execute: async (userId: string, args: Record<string, unknown>):Promise<AgentToolResult> => {
        try {
            const id = idOf(args);
            const c = await Content.findOne({_id: id, userId: new Types.ObjectId(userId)});
            if(!c){
                return ofErr("Content not found");
            }
            return ofOk({item: itemToDo(c)});
        } catch (error) {
            return ofErr(error instanceof Error ? error.message : "Lookup failed");
        }
    },
} as const;

export const brainStatsTool: AgentToolDef ={
    name: "brain_stats",
    description: "Return overall stats: total items, favorites count, per-type counts, top 10 tags.",
    parameters: z.object({}),
    execute: async (userId: string): Promise<AgentToolResult> =>{
       try {
         const objId = new Types.ObjectId(userId);
        const [total, favourites, types, tags] =await Promise.all([
            Content.countDocuments({userId: objId}),
            Content.countDocuments({userId: objId, isFavorite: true}),
            Content.aggregate<{_id: string, count: number}>([
                {$match: {userId: objId}},
                {$group: {_id: "$type", count: {$sum: 1}}},
            ]),
            Content.aggregate<({_id:  string, count: number})>([
                {$match: {userId: objId}},
                {$unwind: "$tags"},
                {$group:{_id: "$tags", count: {$sum: 1}}},
                {$sort: {count: -1}},
                {$limit: 10},
            ])
        ]);
        
        const typeCounts: Record<ContentType, number> ={
            tweet: 0,
            video: 0,
            doc: 0,
            link: 0,
            tag: 0,
            note: 0,
        };

        for(const t of types){
            const key = t._id as ContentType;
            if(key in typeCounts) typeCounts[key] = t.count;
        }
        return ofOk({
            total,
            favourites,
            types: typeCounts,
            topTags: tags.map((t) => ({name: t._id, count: t.count})),
        });
       } catch (error) {
           return ofErr(error instanceof Error ? error.message : "stats failed");
       }
    }

} as const;

export const recentItemsTool: AgentToolDef =  {
    name: "recent_items",
    description: "Return the user's most recently saved items (newest first).",
    parameters: z.object({limit: z.number().int().min(1).max(20).optional()}),
    execute: async (userId: string, args: Record<string, unknown>): Promise<AgentToolResult> =>{
        const limit = typeof args.limit === "number" ? Math.min(args.limit, 20) : 10;
        try {
            const docs = await Content.find({userId: new Types.ObjectId(userId)})
            .sort({createdAt: -1})
            .limit(limit);

            return ofOk({items: docs.map(itemToDo)});
        } catch (error) {
            return ofErr(error instanceof Error ? error.message : "Query failed");
        }
    } 
} as const;


export const topTagsTool: AgentToolDef ={
    name: "top_tags",
    description: "Return the user's most-used tags.",
    parameters: z.object({limit: z.number().min(1).max(30).optional()}),
    execute: async (userId: string, args: Record<string, unknown>): Promise<AgentToolResult> =>{
        const limit = typeof args.limit === "number" ? Math.min(args.limit, 30) : 15;
        try {
            const tags = await Content.aggregate<({_id: string, count: number})>([
                { $match : {userId: new Types.ObjectId(userId)}},
                {$unwind : "$tags"},
                { $group : {_id: "$tags", count: {$sum: 1}}},
                { $sort  : {count: -1}},
                {$limit  : limit }
            ]);
            return ofOk({tags: tags.map((t)=>({name: t._id, count: t.count}))
        });
        } catch (error) {
           return ofErr(error instanceof Error ? error.message : "Tags failed"); 
        }
    }
} as const;



const summarizeItems = async(
    userId: string,
    args: Record<string, unknown>
): Promise<AgentToolResult> =>{
    try {
        const c = await Content.findOne({_id: idOf(args), userId: new Types.ObjectId(userId)});
        if(!c) return ofErr("Content not found!");

        let summary = c.summary;
        if(!summary){
            summary = await summarizeContent(c);
            c.summary = summary;
            await c.save();
        }
        return ofOk({_id: String(c._id), title: c.title, summary, cached: Boolean(summary)})

    } catch (error) {
        return ofErr(error instanceof Error ? error.message : "Summarize failed");
    }
};


export const summarizeItemTool: AgentToolDef = {
    name: "summarize_item",
    description: "Summarize a saved item by id. Returns a 2-3 sentence plain-text summary.",
    parameters: z.object({id: z.string().min(1)}),
    execute: summarizeItems,
} as const;

export const autotagItemTool : AgentToolDef ={
    name: "autotag_item",
    description: "Suggest tags for a saved item by id. Returns 3-6 suggested lowercase tags.",
    parameters: z.object({id: z.string().min(1)}),
    execute: async(userId: string, args: Record<string, unknown>):Promise<AgentToolResult> =>{
        try {
            const c = await Content.findOne({_id: idOf(args), userId: new Types.ObjectId(userId)});
            if(!c){
                return ofErr("Content not found");
            }
            const tags = await autotagContent(c);
            return ofOk({_id: String(c._id),  title: c.title, tags});
        } catch (error) {
            return ofErr(error instanceof Error ? error.message : "autotag failed");
        }
    }
} as const;

export const saveItemTool: AgentToolDef = {
    name: "save_item",
    description:  "Save a new item into the user's brain. type is one of tweet|video|doc|link|tag. " +
        "Duplicates (same url) are rejected. Returns the new item id.",
    parameters: z.object({
        type: z.enum(CONTENT_TYPES),
        title: z.string().min(1).max(200),
        link: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).max(30).optional()
    }),
    execute: async(userId: string, args: Record<string, unknown>):Promise<AgentToolResult> =>{
        const type = args.type as ContentType;
        const title = String(args.title ?? "").trim();
        const description = typeof args.description === "string" && args.description ? args.description.slice(0, 5000) : undefined;
        const link = typeof args.link === "string" && args.link ? args.link.trim() : undefined;
        const tags = Array.isArray(args.tags)
        ? Array.from(
            new Set(
                args.tags.map((t)=> String(t).trim().toLowerCase().slice(0,50)).filter(Boolean)
            )
        ).slice(0, 30)
        : [];
        if(!title) return ofErr("title is required");
        if(link && !/^https?:\/\//i.test(link)) return ofErr("link must start with http:// or https://");

        const linkHash = hashLink(link);
        try {
            if(linkHash){
                const duplicate = await Content.findOne({userId: new Types.ObjectId(userId), linkHash});
                if(duplicate) return ofErr(`A similar link is already saved: "${duplicate.title}"`);
            }

            const data: {
                userId: Types.ObjectId;
                type: ContentType;
                title: string;
                tags: string[];
                link?: string;
                linkHash?: string; 
                description?: string;
            } = {userId: new Types.ObjectId(userId), type, title, tags};
            if(link != undefined) data.link = link;
            if(linkHash !== undefined) data.linkHash = linkHash;
            if(description !== undefined) data.description = description;

            const c = await Content.create(data);
            return ofOk({_id: String(c._id), created: true});
        } catch (error) {
            return ofErr(error instanceof Error ? error.message : "failed to save items");
        }

    }
} as const;


export const AGENT_TOOLS: Record<string, typeof brainSearchTool> = {
    brain_search: brainSearchTool,
    brain_get : brainGetTool,
    brain_stats : brainStatsTool,
    top_tags : topTagsTool,
    summarize_item : summarizeItemTool,
    autotag_item : autotagItemTool,
    save_item : saveItemTool,
    recent_items : recentItemsTool 
};

export const runTool = async (
    name: string,
    userId: string,
    args: Record<string, unknown>
):Promise<AgentToolResult> =>{
    const t = AGENT_TOOLS[name];
    if(!t) return ofErr(`Unknown tool: ${name}`);
    return t.execute(userId, args);
};
