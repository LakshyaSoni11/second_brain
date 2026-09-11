import z from "zod";
import SharedBrain from "../models/SharedBrain";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Response } from "express";
import { buildFallbackAnswer, retrieveBrain } from "../services/ragService";
import { answerFromContext } from "../services/aiService";
import User from "../models/User";


const chatSchema = z.object({message: z.string().min(1).max(4000)});
const copySchema = z.object({ids: z.array(z.string()).max(100).optional()});

const loadBrainOwner = async (identifier: string): Promise<{userId: string}> =>{
    const brain = await SharedBrain.findOne({$or: [{hash: identifier}, {slug: identifier}]});
    if(!brain || !brain.isShared) throw new AppError(404, "Brain not found or no longer shared");
    if(brain.expiresAt && brain.expiresAt.getTime() < Date.now()) throw new AppError(410, "This shared brain has expired");
    return {userId: brain.userId.toString()}
}

const IN_MEMORY_QUOTA = new Map<string, {count: number; resetAt: number}>();

export const askSharedBrain = async (req: AuthRequest, res: Response): Promise<void> =>{
    try {
        const {userId: ownerId} = await loadBrainOwner(req.params.hash);
        const parsed = chatSchema.safeParse(req.body);
        if (!parsed.success){
            res.status(400).json({message:"Invalid message"}); return;
        }
        const ip = req.ip || "unknown";
        const now = Date.now();
        const slot = IN_MEMORY_QUOTA.get(ip) ;
        if(!slot || slot.resetAt < now){
            IN_MEMORY_QUOTA.set(ip, {count: 1, resetAt: now + 3600_000});
        }
        else if(slot.count >= 50){
            res.status(429).json({message: "Chat limit reached try again later"});
            return;
        }
        else slot.count +=1;

        const question = parsed.data.message;
        const retrieval = await retrieveBrain(ownerId, question, 6);
        const llm = await answerFromContext(question, retrieval.context);
        const content = llm || buildFallbackAnswer(question, retrieval.sources, retrieval.typeFilter, retrieval.recencyBoost, retrieval.hasContent, retrieval.action);

        const owner = await User.findById(ownerId).select("username displayName");
        res.json({answer: content, sources: retrieval.sources, username: owner?.displayName || owner?.username});
    } catch (error) {
        if(error instanceof AppError){
            res.status(error.statusCode).json({message: error.message});
        }
        res.status(500).json({message: "Failed to answer"})
    }
}

export const copyBrain = async ()