import { Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/authMiddleware";
import Content from "../models/Content";
import { autotagContent, summarizeContent } from "../services/aiService";

const aiRequestSchema = z.object({
    contentId: z.string().min(1, "contentId is required"),
});

const requireUserId = (req: AuthRequest): string => {
    if (!req.userId) throw new AppError(401, "Unauthorized");
    return req.userId;
};

// POST /api/ai/summarize - Generate (and cache) a summary for a saved item
export const summarize = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = aiRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid request" });
            return;
        }
        const content = await Content.findOne({ _id: parsed.data.contentId, userId });
        if (!content) throw new AppError(404, "Content not found");

        if (content.summary) {
            res.json({ summary: content.summary, cached: true, content });
            return;
        }

        const summary = await summarizeContent(content);
        content.summary = summary;
        await content.save();
        res.json({ summary, cached: false, content });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to generate summary" });
    }
};

// POST /api/ai/autotag - Suggest tags for a saved item (state is not changed)
export const autotag = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = aiRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid request" });
            return;
        }
        const content = await Content.findOne({ _id: parsed.data.contentId, userId });
        if (!content) throw new AppError(404, "Content not found");

        const tags = await autotagContent(content);
        res.json({ tags });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to suggest tags" });
    }
};