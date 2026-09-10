import { Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/authMiddleware";
import Content from "../models/Content";
import { autotagContent, answerFromContext, summarizeContent } from "../services/aiService";
import { buildFallbackAnswer, retrieveBrain } from "../services/ragService";

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

const brainRequestSchema = z.object({
    question: z.string().trim().min(3, "question too short").max(500, "question too long"),
});

// POST /api/ai/brain - grounded "Ask your brain" Q&A (retrieve -> rank -> generate)
export const askBrain = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = brainRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid request" });
            return;
        }

        const { sources, context, hasContent, typeFilter, recencyBoost, action } = await retrieveBrain(userId, parsed.data.question, 6);

        if (!hasContent) {
            const answer =
                "Your brain is empty right now.\n\nSave your first link, note or doc (use the **Add content** button), then ask me anything about it here.";
            res.json({ answer, sources: [], llmUsed: false });
            return;
        }

        let answer: string | null = sources.length ? await answerFromContext(parsed.data.question, context) : null;
        const llmUsed = answer !== null;
        if (!answer) answer = buildFallbackAnswer(parsed.data.question, sources, typeFilter, recencyBoost, hasContent, action);

        res.json({ answer, sources, llmUsed });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to answer from brain" });
    }
};