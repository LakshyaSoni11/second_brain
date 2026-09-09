import { Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/authMiddleware";
import Content from "../models/Content";
import { Types, PipelineStage } from "mongoose";

const requireUserId = (req: AuthRequest): string => {
    if (!req.userId) throw new AppError(401, "Unauthorized");
    return req.userId;
};

const safeTag = (tag: string): string => tag.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 50);

// GET /api/tags — tag names with counts, optional q filter
export const listTags = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

        const pipeline: PipelineStage[] = [{ $match: { userId: new Types.ObjectId(userId) } }];
        if (q) pipeline.push({ $match: { tags: { $regex: escape(q), $options: "i" } } } as PipelineStage);
        pipeline.push({ $unwind: "$tags" });
        pipeline.push({ $group: { _id: "$tags", count: { $sum: 1 } } });
        pipeline.push({ $sort: { count: -1, _id: 1 } });
        pipeline.push({ $project: { _id: 0, name: "$_id", count: 1 } });

        const tags = await Content.aggregate(pipeline);
        res.json({ tags });
    } catch (error) {
        res.status(500).json({ message: "Failed to list tags" });
    }
};

function escape(re: string): string {
    return re.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// PUT /api/tags/:oldName — rename a tag everywhere (404 if it doesn't exist)
export const renameTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const oldName = safeTag(String(req.params.tag));
        const parsed = z.object({ name: z.string().min(1, "New tag name is required").max(50) }).safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
            return;
        }
        const newName = safeTag(parsed.data.name);
        if (!newName) {
            res.status(400).json({ message: "Tag name cannot be empty" });
            return;
        }
        if (oldName === newName) {
            res.json({ message: "No changes needed" });
            return;
        }

        const { modifiedCount } = await Content.updateMany(
            { userId, tags: oldName },
            { $set: { "tags.$[tag]": newName } },
            { arrayFilters: [{ "tag": oldName }] }
        );
        if (modifiedCount === 0) throw new AppError(404, "Tag not found");

        res.json({ message: `Renamed "${oldName}" to "${newName}"`, modifiedCount });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to rename tag" });
    }
};

// POST /api/tags/merge — merge {from: [...], into}
export const mergeTags = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = z
            .object({
                from: z.array(z.string().min(1).max(50)).min(1, "Provide at least one tag to merge"),
                into: z.string().min(1).max(50),
            })
            .safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
            return;
        }
        const { from, into } = parsed.data;
        const intoName = safeTag(into);
        const fromNames = [...new Set(from.map(safeTag).filter(Boolean))];

        await Content.updateMany(
            { userId },
            [
                {
                    $set: {
                        tags: {
                            $map: {
                                input: "$tags",
                                as: "t",
                                in: { $cond: [{ $in: ["$$t", fromNames] }, intoName, "$$t"] },
                            },
                        },
                    },
                },
            ],
            { updatePipeline: true }
        );
        await Content.updateMany({ userId }, { $pull: { tags: { $in: fromNames, $ne: intoName } } });

        res.json({ message: `Merged ${fromNames.length} tag(s) into "${intoName}"` });
    } catch (error) {
        res.status(500).json({ message: "Failed to merge tags" });
    }
};

// DELETE /api/tags/:tag — remove a tag from all items of this user
export const deleteTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const tag = safeTag(String(req.params.tag));
        const { modifiedCount } = await Content.updateMany(
            { userId, tags: tag },
            { $pull: { tags: tag } }
        );
        if (modifiedCount === 0) throw new AppError(404, "Tag not found");
        res.json({ message: `Removed tag "${tag}" from ${modifiedCount} item(s)` });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to delete tag" });
    }
};