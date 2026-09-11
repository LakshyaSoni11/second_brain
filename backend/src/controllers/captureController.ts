import z from "zod";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Response } from "express";
import { AppError } from "../middlewares/errorHandler";
import { createContent } from "../services/contentservice";
import { title } from "node:process";


const webShareSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    url: z.string().refine((v) => /^https?:\/\//i.test(v), "URL must start with http:// or https://"),
    text: z.string().max(5000).optional(),
});

export const webShare = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if(!req.userId){
            throw new AppError(401, "Unauthorized");
        }

        const parsed = webShareSchema.safeParse(req.body);
        if(!parsed.success){
            res.status(400).json({message: parsed.error?.issues[0]?.message || "Invalid share payload"});
            return;
        }

        const {title, url, text} = parsed.data;
        const result = await createContent(
            {type: "link", title, link: url, description: text, tags: []},
            req.userId,
            z.object({
                type: z.enum(["tweet", "video", "doc", "link", "tag", "note"]),
                title: z.string().min(1).max(200),
                link: z.string(),
                description: z.string().max(5000).optional(),
                tags: z.array(z.string()).max(30).optional(),
            })
        );

        if(result.duplicate){
            res.status(result.status).json({message: "You already saved this link", duplicate: result.duplicate});
            return;
        }
        res.status(result.status).json({message: result.message, content: result.content});
    } catch (error) {
        if(error instanceof AppError){
            res.status(error.statusCode).json({message: error.message});
            return;
        }
        res.status(500).json({message: "Failed to save"});
    }
};

// POST /api/capture/email/inbound  — call from Mailgun/SendGrid inbound webhook

export const emailInbound = async (req: AuthRequest, res: Response): Promise<void> =>{
    try {
        const secret = process.env.CAPTURE_EMAIL_SECRET;
        if(!secret || req.get("x-capture-secret") !== secret){
            throw new AppError(401, "Invalid capture secret");
        }
        const body = z.object({
            from: z.string().max(300).email(),
            subject: z.string().max(300),
            bodyHtml: z.string().max(200_000).optional(),
            bodyText: z.string().max(200_000).optional(),
        }).safeParse(req.body);
        if(!body.success){res.status(400).json({message: "Invalid email payload"})
            return;
        }

        const textBlob =  `${body.data.subject ?? ""}\n${body.data.bodyText ?? ""}\n${body.data.bodyHtml ?? ""}`;
        const match = textBlob.match(/https?:\/\/[^\s<>"]+/);
        if(!match){
            res.status(400).json({message: "No URL found in email"})
            return;
        }
        const link = match[0].replace(/[),.;]+$/, "");
        const email = String(body.
            data.from || "").match(/<([^>]+)>/)?.[1] || body.data.from || "";
        const user = await import("../models/User").then((m)=>m.default.findOne({email: String(email)}));
        if(!user){ res.status(200).json({message: "User not found"}); return;}
        const result = await createContent(
            {type: "link", title: (body.data.subject || link).slice(0, 200), link, tags: [] },
            String(user._id),
            z.object({
                type: z.enum(["tweet", "video", "doc", "link", "note"]),
                title: z.string().min(1).max(200),
                link: z.string(),
                description: z.string().max(5000).optional(),
                tags: z.array(z.string()).max(30).optional(),
            })
        );

        res.status(result.status).json(result);

    } catch (error) {
        if(error instanceof AppError){
            res.status(error.statusCode).json({message: error.message})
        }
        else{
            res.status(500).json({message: "Failed to process email"})
        }
    }
}