import { Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/errorHandler";
import { AuthRequest } from "../middlewares/authMiddleware";
import User from "../models/User";
import Content from "../models/Content";
import SharedBrain from "../models/SharedBrain";

const requireUserId = (req: AuthRequest): string => {
    if (!req.userId) throw new AppError(401, "Unauthorized");
    return req.userId;
};

// GET /api/user/profile
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const user = await User.findById(userId).select("username email displayName avatar provider isVerified createdAt");
        if (!user) throw new AppError(404, "User not found");
        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                displayName: user.displayName ?? null,
                avatar: user.avatar ?? null,
                provider: user.provider ?? "local",
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to load profile" });
    }
};

// PUT /api/user/profile — displayName + avatar
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = z
            .object({
                displayName: z.string().max(80).optional(),
                avatar: z.string().url("Invalid avatar URL").max(1000).optional().or(z.literal("")),
            })
            .safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
            return;
        }
        const { displayName, avatar } = parsed.data;
        const update: Record<string, unknown> = {};
        if (displayName !== undefined) update.displayName = displayName.trim() || undefined;
        if (avatar !== undefined) update.avatar = avatar.trim() || undefined;

        const user = await User.findByIdAndUpdate(userId, { $set: update }, { returnDocument: "after" }).select(
            "username email displayName avatar provider"
        );
        res.json({ message: "Profile updated", user });
    } catch (error) {
        res.status(500).json({ message: "Failed to update profile" });
    }
};

// PUT /api/user/password — change password (requires current)
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        const parsed = z
            .object({
                currentPassword: z.string().min(1, "Current password is required"),
                newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
            })
            .safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
            return;
        }
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, "User not found");
        if (user.provider && user.provider !== "local") {
            throw new AppError(400, "Password changes are not available for OAuth accounts");
        }
        const isMatch = await user.comparePassword(parsed.data.currentPassword);
        if (!isMatch) throw new AppError(401, "Current password is incorrect");

        user.password = parsed.data.newPassword;
        await user.save();
        res.json({ message: "Password updated" });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to update password" });
    }
};

// DELETE /api/user/account — permanently delete account + data
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = requireUserId(req);
        await Content.deleteMany({ userId });
        await SharedBrain.deleteOne({ userId });
        const user = await User.findByIdAndDelete(userId);
        if (!user) throw new AppError(404, "User not found");
        res.json({ message: "Account and all data deleted" });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(500).json({ message: "Failed to delete account" });
    }
};