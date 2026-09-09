import { z } from "zod";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response } from "express";
import User from "../models/User";
import { sendResetPasswordEmail, sendVerificationEmail, devEmailLink } from "../services/emailService";

const SignupSchema = z.object({
    username: z.string().min(3, "Must contain at least 3 letters").max(30),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters long").max(100),
});

const SigninSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
});

const EmailSchema = z.object({ email: z.string().email("Invalid email") });

const ResetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters long").max(100),
});

const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
        expiresIn: "7d",
    });
};

const smtpConfigured = (): boolean =>
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// POST /api/auth/signup
export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = SignupSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid input data" });
            return;
        }
        const { username, email, password } = parsed.data;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            res.status(409).json({ message: "User already exists" });
            return;
        }

        const verifyToken = smtpConfigured() ? crypto.randomBytes(32).toString("hex") : undefined;
        const user = await User.create({
            username,
            email,
            password,
            isVerified: !verifyToken,
            ...(verifyToken
                ? { verifyToken, verifyTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) }
                : {}),
        });

        if (verifyToken) {
            const sent = await sendVerificationEmail(email, verifyToken);
            res.status(201).json({
                message: "Account created. Check your email to verify your account.",
                requiresVerification: true,
                ...(sent ? {} : { devVerifyLink: devEmailLink(email, verifyToken) }),
            });
            return;
        }

        const token = generateToken(user._id.toString());
        res.status(201).json({
            message: "Account created successfully",
            token,
            user: { id: user._id, username: user.username, email: user.email, isVerified: true },
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

export const signin = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = SigninSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid input data" });
            return;
        }
        const { email, password } = parsed.data;
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }
        if (!user.isVerified) {
            res.status(403).json({ message: "Please verify your email before signing in" });
            return;
        }
        const token = generateToken(user._id.toString());
        res.status(200).json({
            message: "SignedIn successfully",
            token,
            user: { id: user._id, username: user.username, email: user.email, isVerified: true },
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/auth/verify-email?token=...
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { token } = req.query;
        if (typeof token !== "string") {
            res.status(400).json({ message: "Invalid token" });
            return;
        }
        const user = await User.findOne({ verifyToken: token });
        if (!user || (user.verifyTokenExpires && user.verifyTokenExpires.getTime() < Date.now())) {
            res.status(400).json({ message: "Invalid or expired verification token" });
            return;
        }
        user.isVerified = true;
        user.set("verifyToken", undefined);
        user.set("verifyTokenExpires", undefined);
        await user.save();
        const authToken = generateToken(user._id.toString());
        res.json({ message: "Email verified", token: authToken });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = EmailSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid email" });
            return;
        }
        const user = await User.findOne({ email: parsed.data.email });
        // Always respond 200 to avoid account enumeration
        if (!user || user.provider !== "local") {
            res.json({ message: "If that email exists, a reset link has been sent." });
            return;
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetToken = resetToken;
        user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();
        await sendResetPasswordEmail(user.email, resetToken);
        res.json({ message: "If that email exists, a reset link has been sent." });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = ResetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
            return;
        }
        const { token, password } = parsed.data;
        const user = await User.findOne({ resetToken: token });
        if (!user || (user.resetTokenExpires && user.resetTokenExpires.getTime() < Date.now())) {
            res.status(400).json({ message: "Invalid or expired reset token" });
            return;
        }
        user.password = password;
        user.set("resetToken", undefined);
        user.set("resetTokenExpires", undefined);
        await user.save();
        res.json({ message: "Password reset. You can now sign in." });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// Helpers for OAuth + token refresh
export const issueTokenForUser = (userId: string): string => generateToken(userId);
export const setAuthCookie = (_res: Response): void => {};