import { Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/authMiddleware";
import Content, { hashLink } from "../models/Content";
import { Types } from "mongoose";

const requireUserId = (req: AuthRequest): string => {
    if (!req.userId) throw new AppError(401, "Unauthorized");
    return req.userId;
};

const idsSchema = z.object({
    ids: z.array(z.string().min(1)).min(1, "Provide at least one id").max(100, "Max 100 items at once"),
});

// POST /api/content/bulk/delete
export const bulkDelete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = idsSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid ids" });
            return;
        }
        const ids = parsed.data.ids.map((id) => new Types.ObjectId(id));
        const { deletedCount } = await Content.deleteMany({ userId, _id: { $in: ids } });
        res.json({ message: `Deleted ${deletedCount} item(s)`, deletedCount });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete items" });
    }
};

// POST /api/content/bulk/favorite  {ids, isFavorite}
export const bulkFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = idsSchema
            .extend({ isFavorite: z.boolean().default(true) })
            .safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid ids" });
            return;
        }
        const { ids, isFavorite } = parsed.data;
        const { modifiedCount } = await Content.updateMany(
            { userId, _id: { $in: ids.map((id) => new Types.ObjectId(id)) } },
            { $set: { isFavorite } }
        );
        res.json({ message: isFavorite ? "Added to favorites" : "Removed from favorites", modifiedCount });
    } catch (error) {
        res.status(500).json({ message: "Failed to update favorites" });
    }
};

// POST /api/content/bulk/tag  {ids, add?, remove?}
export const bulkTag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = z
            .object({
                ids: z.array(z.string().min(1)).min(1).max(100),
                add: z.array(z.string().trim().toLowerCase().max(50)).max(30).optional(),
                remove: z.array(z.string().trim().toLowerCase().max(50)).max(30).optional(),
            })
            .refine((d) => d.add?.length || d.remove?.length, { message: "Provide add or remove tags" })
            .safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
            return;
        }
        const { ids, add = [], remove = [] } = parsed.data;
        const filter = { userId, _id: { $in: ids.map((id) => new Types.ObjectId(id)) } };

        let affected = 0;
        if (add.length) {
            const r = await Content.updateMany(filter, { $addToSet: { tags: { $each: add } } });
            affected += r.modifiedCount;
        }
        if (remove.length) {
            const r = await Content.updateMany(filter, { $pull: { tags: { $in: remove } } });
            affected += r.modifiedCount;
        }
        res.json({ message: "Tags updated", modifiedCount: affected });
    } catch (error) {
        res.status(500).json({ message: "Failed to update tags" });
    }
};

export { hashLink };