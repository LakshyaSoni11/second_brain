import { Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/authMiddleware";
import Content, { hashLink } from "../models/Content";

const requireUserId = (req: AuthRequest): string => {
    if (!req.userId) throw new AppError(401, "Unauthorized");
    return req.userId;
};

const escCsv = (v: unknown): string => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /api/content/export?format=json|csv|markdown
export const exportContent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const format = (req.query.format as string) || "json";
        const items = await Content.find({ userId }).sort({ createdAt: -1 }).lean();

        const mapItem = (c: (typeof items)[number]) => ({
            type: c.type,
            title: c.title,
            link: c.link ?? "",
            description: c.description ?? "",
            tags: Array.isArray(c.tags) ? c.tags : [],
            summary: c.summary ?? "",
            isFavorite: Boolean(c.isFavorite),
            createdAt: c.createdAt?.toISOString() ?? "",
        });

        if (format === "markdown" || format === "md") {
            const md = items
                .map((c) => {
                    const link = c.link ? ` (<${c.link}>)` : "";
                    const tags = (Array.isArray(c.tags) ? c.tags : []).map((t: string) => `#${t}`).join(" ");
                    return `- [${c.title}]${link} ${tags}\n${c.summary ? `  > ${c.summary}\n` : ""}`;
                })
                .join("\n");
            res.setHeader("Content-Type", "text/markdown; charset=utf-8");
            res.setHeader("Content-Disposition", 'attachment; filename="second-brain.md"');
            res.send([`# Second Brain — exported ${new Date().toISOString().slice(0, 10)}`, "", md].join("\n"));
            return;
        }

        if (format === "csv") {
            const header = ["type", "title", "link", "description", "tags", "summary", "isFavorite", "createdAt"];
            const rows = items.map((c) =>
                [c.type, c.title, c.link ?? "", c.description ?? "", (c.tags as string[])?.join("|") ?? "", c.summary ?? "", c.isFavorite ? "true" : "false", c.createdAt?.toISOString() ?? ""]
                    .map(escCsv)
                    .join(",")
            );
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", 'attachment; filename="second-brain.csv"');
            res.send([header.join(","), ...rows].join("\n"));
            return;
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="second-brain.json"');
        res.send(JSON.stringify({ exportedAt: new Date().toISOString(), items: items.map(mapItem) }, null, 2));
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Export failed" });
    }
};

const importItemSchema = z.object({
    type: z.enum(["tweet", "video", "doc", "link", "tag", "note"]).default("link"),
    title: z.string().min(1).max(200),
    link: z.string().max(1000).refine((v) => (v ? /^https?:\/\//i.test(v) : true), "URL must start with http(s)://").optional().or(z.literal("")),
    description: z.string().max(5000).optional(),
    tags: z.array(z.string().trim().toLowerCase().max(50)).max(30).optional().default([]),
    isFavorite: z.boolean().optional(),
});

// POST /api/content/import  { items: [...] }  (or raw array)
export const importContent = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const raw = Array.isArray(req.body) ? req.body : req.body?.items;
        if (!Array.isArray(raw)) {
            res.status(400).json({ message: "Provide an array of items under { items }" });
            return;
        }
        if (raw.length > 500) {
            res.status(400).json({ message: "Max 500 items per import" });
            return;
        }

        let added = 0;
        let skipped = 0;
        const errors: string[] = [];
        const bulk = [];

        for (const [i, item] of raw.entries()) {
            const parsed = importItemSchema.safeParse(item);
            if (!parsed.success) {
                errors.push(`Item ${i + 1}: ${parsed.error.issues[0]?.message || "invalid"}`);
                continue;
            }
            const data = parsed.data;
            const link = data.link && data.link.trim() ? data.link.trim() : undefined;
            const linkHash = hashLink(link);
            if (linkHash) {
                const dup = await Content.findOne({ userId, linkHash });
                if (dup) {
                    skipped++;
                    continue;
                }
            }
            const doc = {
                userId,
                type: data.type,
                title: data.title,
                tags: data.tags,
                ...(link && linkHash ? { link, linkHash } : {}),
                ...(data.description ? { description: data.description } : {}),
                ...(data.isFavorite ? { isFavorite: true } : {}),
            };
            bulk.push(doc);
        }

        if (bulk.length) {
            await Content.insertMany(bulk, { ordered: false });
            added = bulk.length;
        }
        res.status(201).json({ message: `Imported ${added} item(s), skipped ${skipped} duplicate(s)`, added, skipped, errors: errors.slice(0, 10) });
    } catch (error) {
        res.status(500).json({ message: "Import failed" });
    }
};