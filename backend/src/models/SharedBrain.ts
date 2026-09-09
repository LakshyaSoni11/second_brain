import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISharedBrain extends Document {
    userId: Types.ObjectId;
    hash: string;
    slug?: string;
    passwordHash?: string;
    expiresAt?: Date;
    isShared: boolean;
}

const SharedBrainSchema = new Schema<ISharedBrain>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        hash: { type: String, required: true, unique: true },
        slug: { type: String, unique: true, sparse: true, trim: true, maxlength: 64 },
        passwordHash: { type: String },
        expiresAt: { type: Date },
        isShared: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model<ISharedBrain>("SharedBrain", SharedBrainSchema);