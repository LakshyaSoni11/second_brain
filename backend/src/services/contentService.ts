import z from "zod";
import Content, { hashLink } from "../models/Content";
import { fetchPageMetadata } from "./metadataService";


//function to check the duplicate links and also extract the metada from the link.
export const createContent = async (
    body: Record<string, unknown>,
    userId: string,
    schema: z.ZodTypeAny,
): Promise<{status: number; message: string; content?: unknown; duplicate?: unknown}> => {
    const parsed = schema.safeParse(body);
    if(!parsed.success){
        return {status: 400, message: parsed.error.issues[0]?.message || "Invalid content data."};
    }
    const data:any = parsed.data;
    const link = data.link && data.link.trim() ? data.link.trim() : undefined;
    const linkHash = hashLink(link);
    
    if(linkHash){
        const existing = await Content.findOne({
            userId, linkHash
        });
        if(existing) return {status: 409, message: "You already saved this link", duplicate: existing}
    }

    const content = await Content.create({
        userId,
        type: data.type,
        title: data.title,
        tags: data.tags,
        ...(link && linkHash ? {link, linkHash} : {}),
        ...(data.description ? {description: data.description} : {}),
    });

    if(link && !data.description && ["link", "video", "doc"].includes(data.type)){
        fetchPageMetadata(link).then(async(meta) =>{
            try {
                const patch: Record<string, unknown> = {};
                if(meta.description?.trim())patch.description = meta.description?.trim().slice(0, 1000);
                if(meta.image) patch.image = meta.image;
                if(meta.siteName) patch.siteName = meta.siteName;
                if(Object.keys(patch).length){
                    await Content.updateOne({_id: content._id}, {$set: patch});
                }
            } catch (error) {
                //non fatal
            }
        })
    }
    return {status: 201, message: "Content added successfully", content};
}