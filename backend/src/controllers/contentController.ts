import { Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/authMiddleware";
import Content, { hashLink } from "../models/Content";
import { fetchPageMetadata } from "../services/metadataService";
import { Types } from "mongoose";

const baseFields = {
    link: z
        .string()
        .max(1000, "URL too long")
        .refine((v) => (v ? /^https?:\/\//i.test(v) : true), {
            message: "URL must start with http:// or https://",
        })
        .optional()
        .or(z.literal("")),
    description: z.string().max(5000, "Description too long").optional(),
    tags: z
        .array(z.string().trim().toLowerCase().max(50))
        .max(30, "Too many tags (max 30)")
        .optional()
        .default([]),
};

const addContentSchema = z
    .object({
        type: z.enum(["tweet", "video", "doc", "link", "tag", "note"]),
        title: z.string().min(1, "Title is required").max(200),
        ...baseFields,
    })
    .superRefine((data, ctx) => {
        if (data.type !== "tag" && data.type !== "note" && !data.link?.trim()) {
            ctx.addIssue({ code: "custom", message: "A URL is required for this content type" });
        }
    });

const updateContentSchema = z.object({
    type: z.enum(["tweet", "video", "doc", "link", "tag", "note"]).optional(),
    title: z.string().min(1, "Title is required").max(200).optional(),
    ...baseFields,
});

type ContentFilter = Record<string, unknown>;

const requireUserId = (req: AuthRequest): string => {
    if (!req.userId) throw new AppError(401, "Unauthorized");
    return req.userId;
};

// GET /api/content - Fetch content for logged-in user
// Query: type, tag, q (search), favorite, page, limit
export const getContent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const { type, tag, q, favorite } = req.query;
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

        const filter: ContentFilter = { userId };

        if (type && typeof type === "string" && type !== "all") filter.type = type;
        if (tag && typeof tag === "string") filter.tags = { $in: [tag] };
        if (q && typeof q === "string" && q.trim()) filter.$text = { $search: q.trim() };
        if (favorite === "true") filter.isFavorite = true;

        const [content, total] = await Promise.all([
            Content.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            Content.countDocuments(filter),
        ]);

        res.json({
            content,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch content" });
    }
};

// GET /api/content/stats - Dashboard counts by type + favorites + tags
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const [byType, count, favoriteCount, allContent] = await Promise.all([
            Content.aggregate<{ _id: string; count: number }>([
                { $match: { userId: new Types.ObjectId(userId) } },
                { $group: { _id: "$type", count: { $sum: 1 } } },
            ]),
            Content.countDocuments({ userId }),
            Content.countDocuments({ userId, isFavorite: true }),
            Content.find({ userId }).select("tags").lean(),
        ]);

        const tagMap = new Map<string, number>();
        allContent.forEach((c) => {
            (c.tags || []).forEach((t: string) => tagMap.set(t, (tagMap.get(t) || 0) + 1));
        });
        const tags = Array.from(tagMap.entries())
            .map(([name, tagCount]) => ({ name, count: tagCount }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50);

        const typeCounts: Record<string, number> = { tweet: 0, video: 0, doc: 0, link: 0, tag: 0, note: 0 };
        byType.forEach((t) => {
            if (t._id in typeCounts) typeCounts[t._id] = t.count;
        });

        res.json({ total: count, favorites: favoriteCount, types: typeCounts, tags });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch stats" });
    }
};

// POST /api/content - Add new content (with duplicate detection)
export const addContent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = addContentSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid content data" });
            return;
        }
        const data = parsed.data;
        const link = data.link && data.link.trim() ? data.link.trim() : undefined;
        const linkHash = hashLink(link);

        if (linkHash) {
            const existing = await Content.findOne({ userId, linkHash });
            if (existing) {
                res.status(409).json({ message: "You already saved this link", duplicate: existing });
                return;
            }
        }

        const content = await Content.create({
            userId,
            type: data.type,
            title: data.title,
            tags: data.tags,
            ...(link && linkHash ? { link, linkHash } : {}),
            ...(data.description ? { description: data.description } : {}),
        });

        // Best-effort OpenGraph metadata auto-fetch for link/video items without a description
        if (link && !data.description && (data.type === "link" || data.type === "video" || data.type === "doc")) {
            fetchPageMetadata(link).then(async (meta) => {
                try {
                    const patch: Record<string, unknown> = {};
                    if (meta.description?.trim()) patch.description = meta.description.trim().slice(0, 1000);
                    if (meta.image) patch.image = meta.image;
                    if (meta.siteName) patch.siteName = meta.siteName;
                    if (Object.keys(patch).length) {
                        await Content.updateOne({ _id: content._id }, { $set: patch });
                    }
                } catch {
                    /* non-fatal */
                }
            });
        }

        res.status(201).json({ message: "Content added", content });
    } catch (error) {
        res.status(500).json({ message: "Failed to add content" });
    }
};

// PUT /api/content/:id - Edit content
export const updateContent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const id = req.params.id as string;
        const parsed = updateContentSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid content data" });
            return;
        }
        const data = parsed.data;

        const update: Record<string, unknown> = {};
        if (data.type !== undefined) update.type = data.type;
        if (data.title !== undefined && data.title.trim()) update.title = data.title.trim();
        if (data.description !== undefined) update.description = data.description;

        if (data.tags !== undefined) update.tags = data.tags;

        if (data.link !== undefined) {
            const link = data.link && data.link.trim() ? data.link.trim() : undefined;
            const linkHash = hashLink(link);
            if (linkHash) {
                const dup = await Content.findOne({ userId, linkHash, _id: { $ne: id } });
                if (dup) throw new AppError(409, "Another item already uses this link");
                update.link = link;
                update.linkHash = linkHash;
            } else {
                update.link = link;
                update.linkHash = linkHash;
            }
        }

        const content = await Content.findOneAndUpdate(
            { _id: id, userId },
            { $set: update },
            { returnDocument: "after" }
        );
        if (!content) throw new AppError(404, "Content not found");

        res.json({ message: "Content updated", content });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to update content" });
    }
};

// POST /api/content/:id/favorite - Toggle or set favorite
export const toggleFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const id = req.params.id as string;
        const content = await Content.findOne({ _id: id, userId });
        if (!content) throw new AppError(404, "Content not found");

        const setFavorite = typeof req.body?.isFavorite === "boolean" ? req.body.isFavorite : !content.isFavorite;
        content.isFavorite = setFavorite;
        await content.save();

        res.json({ message: setFavorite ? "Added to favorites" : "Removed from favorites", content });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to update favorite" });
    }
};

// DELETE /api/content/:id - Delete content
export const deleteContent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const id = req.params.id as string;
        const content = await Content.findOne({ _id: id, userId });
        if (!content) throw new AppError(404, "Content not found");

        await Content.deleteOne({ _id: id, userId });
        res.json({ message: "Content deleted" });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
};