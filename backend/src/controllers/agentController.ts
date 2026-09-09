import { AgentChatMessage, AgentStreamEvent } from "../agents/types";
import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { AppError } from "../middlewares/errorHandler";
import { findAgent } from "../agents/registry";
import { agentInfo, runAgent, runAgentChat } from "../agents/runtime";
import z from "zod";

const requireUserId = (req: AuthRequest): string => {
    if (!req.userId) throw new AppError(401, "Unauthorized");
    return req.userId;
};

const chatSchema = z.object({
    agentId: z.string().min(1),
    message: z.string().min(1).max(4000),
    history: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().max(4000),
            })
        )
        .max(20)
        .optional(),
});

const runSchema = z.object({
    agentId: z.string().min(1),
    input: z.string().min(1).max(4000),
});

const sseWrite = (res: Response, event: AgentStreamEvent): void => {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
};

// GET /agents - list the available agents (public fields only)
export const listAgents = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        requireUserId(req);
        res.json(agentInfo());
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to list agents" });
    }
};

// POST /agents/run - one-shot agent run returning a full turn
export const runAgentHandler = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = runSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid request" });
            return;
        }
        const agent = findAgent(parsed.data.agentId);
        if (!agent) throw new AppError(404, "Unknown agent");

        const turn = await runAgent({ agent, userId, input: parsed.data.input });
        res.json({
            content: turn.content,
            toolCalls: turn.toolCalls,
            llm: Boolean(process.env.GROQ_API_KEY),
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Agent run failed" });
    }
};

// POST /agents/chat - streaming chat via SSE
export const chat = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid request" });
        return;
    }
    const agent = findAgent(parsed.data.agentId);
    if (!agent) {
        res.status(404).json({ message: "Unknown agent" });
        return;
    }

    res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let aborted = false;
    res.on("close", () => {
        aborted = true;
    });

    const emit = (event: AgentStreamEvent): void => {
        if (aborted || res.writableEnded) return;
        sseWrite(res, event);
    };

    try {
        await runAgentChat({
            agent,
            userId,
            message: parsed.data.message,
            history: (parsed.data.history ?? []) as AgentChatMessage[],
            emit,
            aborted: () => aborted,
        });
    } catch (error) {
        emit({ type: "error", message: error instanceof Error ? error.message : "agent chat failed" });
    } finally {
        if (!res.writableEnded) res.end();
    }
};