import mongoose, { Document, Schema, Types } from "mongoose";
import crypto from "crypto";

export type ContentType = "tweet" | "video" | "doc" | "link" | "tag" | "note";

export interface IContent extends Document {
    userId: Types.ObjectId;
    type: ContentType;
    title: string;
    link?: string;
    linkHash?: string;
    description?: string;
    tags: string[];
    summary?: string;
    isFavorite: boolean;
    image?: string;
    siteName?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: { type: String, enum: ["tweet", "video", "doc", "link", "tag", "note"], required: true },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        link: {
            type: String,
            trim: true,
            maxlength: 1000,
            validate: {
                validator: (v: string) =>
                    !v || /^https?:\/\//i.test(v),
                message: "URL must start with http:// or https://",
            },
        },
        linkHash: { type: String },
        description: { type: String, trim: true, maxlength: 5000 },
        tags: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
        summary: { type: String, maxlength: 4000 },
        isFavorite: { type: Boolean, default: false },
        image: { type: String, trim: true, maxlength: 2000 },
        siteName: { type: String, trim: true, maxlength: 200 },
    },
    { timestamps: true }
);

// index for faster retrievals
ContentSchema.index({ userId: 1, createdAt: -1 });
// duplicate detection: same user + same normalized url
ContentSchema.index({ userId: 1, linkHash: 1 }, { unique: true, partialFilterExpression: { linkHash: { $type: "string" } } });
// full-text search over title + description + tags
ContentSchema.index({ title: "text", description: "text", tags: "text" });

export const hashLink = (link?: string): string | undefined => {
    if (!link) return undefined;
    try {
        const url = new URL(link);
        url.hash = "";
        url.search = "";
        return crypto.createHash("sha256").update(url.href.toLowerCase()).digest("hex");
    } catch {
        return crypto.createHash("sha256").update(link.toLowerCase()).digest("hex");
    }
};

export default mongoose.model<IContent>("Content", ContentSchema);