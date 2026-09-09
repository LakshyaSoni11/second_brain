import { AuthRequest } from "../middlewares/authMiddleware";
import { Response } from "express";
import bcrypt from "bcryptjs";
import SharedBrain from "../models/SharedBrain";
import { generateHash } from "../utils/generateHash";
import Content from "../models/Content";
import User from "../models/User";
import { AppError } from "../middlewares/errorHandler";
import z from "zod";

const shareConfigSchema = z.object({
    slug: z
        .string()
        .max(64)
        .regex(/^[a-zA-Z0-9-]+$/, "Slug can only contain letters, numbers, and dashes")
        .optional()
        .or(z.literal("")),
    password: z.string().min(4, "Password must be at least 4 characters").max(100).optional().or(z.literal("")),
    expiresInDays: z.number().int().min(1).max(365).optional(),
    isShared: z.boolean().optional(),
});

// POST /api/brain/share — enable/disable sharing with optional slug/password/expiry
export const toggleShare = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.userId;
        if (!id) {
            res.status(401).json({ message: "User not found" });
            return;
        }
        const parsed = shareConfigSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid share settings" });
            return;
        }
        const { slug, password, expiresInDays, isShared } = parsed.data;

        let sharedBrain = await SharedBrain.findOne({ userId: id });
        if (!sharedBrain) {
            sharedBrain = await SharedBrain.create({
                userId: id,
                hash: generateHash(12),
                isShared: isShared ?? true,
            });
        } else {
            if (isShared !== undefined) sharedBrain.isShared = isShared;
            else sharedBrain.isShared = !sharedBrain.isShared;
        }

        if (slug !== undefined) {
            const cleanSlug = slug.trim().toLowerCase();
            if (cleanSlug) {
                const taken = await SharedBrain.findOne({ slug: cleanSlug, userId: { $ne: id } });
                if (taken) throw new AppError(409, "That custom link is already taken");
                sharedBrain.slug = cleanSlug;
            } else {
                sharedBrain.set("slug", undefined);
            }
        }

        if (password !== undefined) {
            const clean = password.trim();
            if (clean) sharedBrain.passwordHash = await bcrypt.hash(clean, 10);
            else sharedBrain.set("passwordHash", undefined);
        }

        if (expiresInDays !== undefined) {
            sharedBrain.expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
        }

        await sharedBrain.save();

        const identifier = sharedBrain.slug || sharedBrain.hash;
        res.json({
            isShared: sharedBrain.isShared,
            shareLink: sharedBrain.isShared ? `${process.env.CLIENT_URL}/brain/${identifier}` : null,
            slug: sharedBrain.slug ?? null,
            hasPassword: Boolean(sharedBrain.passwordHash),
            expiresAt: sharedBrain.expiresAt ?? null,
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to toggle share" });
    }
};

// GET /api/brain/share/status
export const getShareStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.userId;
        if (!id) {
            res.status(401).json({ message: "User not found" });
            return;
        }
        const sharedBrain = await SharedBrain.findOne({ userId: id });
        const identifier = sharedBrain?.slug || sharedBrain?.hash;
        res.json({
            isShared: sharedBrain?.isShared ?? false,
            shareLink: sharedBrain?.isShared && identifier ? `${process.env.CLIENT_URL}/brain/${identifier}` : null,
            slug: sharedBrain?.slug ?? null,
            hasPassword: Boolean(sharedBrain?.passwordHash),
            expiresAt: sharedBrain?.expiresAt ?? null,
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to get share status" });
    }
};

// GET /api/brain/:id — fetch a shared brain by hash or slug
export const getSharedBrain = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const identifier = req.params.hash;
        if (typeof identifier !== "string") {
            res.status(400).json({ message: "Invalid share link" });
            return;
        }
        const sharedBrain = await SharedBrain.findOne({
            $or: [{ hash: identifier }, { slug: identifier }],
        });

        if (!sharedBrain || !sharedBrain.isShared) {
            res.status(404).json({ message: "Brain not found or no longer shared" });
            return;
        }
        if (sharedBrain.expiresAt && sharedBrain.expiresAt.getTime() < Date.now()) {
            res.status(410).json({ message: "This shared brain has expired" });
            return;
        }

        const password = req.get("x-share-password");
        if (sharedBrain.passwordHash) {
            const ok = password ? await bcrypt.compare(password, sharedBrain.passwordHash) : false;
            if (!ok) {
                res.status(401).json({ message: "This brain is password protected", requiresPassword: true });
                return;
            }
        }

        const user = await User.findById(sharedBrain.userId).select("username displayName");

        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
        const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
        const [content, total] = await Promise.all([
            Content.find({ userId: sharedBrain.userId }).sort({ createdAt: -1 }).skip(offset).limit(limit),
            Content.countDocuments({ userId: sharedBrain.userId }),
        ]);
        res.json({ username: user?.displayName || user?.username, content, pagination: { limit, offset, total } });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch shared brain" });
    }
};