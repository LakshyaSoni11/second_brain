import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const createTransporter = (): Transporter | null => {
    const hasConfig =
        process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
    if (!hasConfig) {
        if (process.env.NODE_ENV !== "test") {
            console.warn("SMTP not configured — verification emails will not be sent.");
        }
        return null;
    }
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

export const sendMail = async (to: string, subject: string, html: string): Promise<boolean> => {
    const transporter = createTransporter();
    if (!transporter) return false;
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER || "Second Brain <no-reply@secondbrain.app>",
            to,
            subject,
            html,
        });
        return true;
    } catch (error) {
        console.error("Email send failed:", error);
        return false;
    }
};

const baseLink = (): string => process.env.CLIENT_URL || "http://localhost:5173";

export const sendVerificationEmail = async (to: string, token: string): Promise<boolean> => {
    const link = `${baseLink()}/verify-email?token=${token}`;
    return sendMail(
        to,
        "Verify your Second Brain account",
        `<p>Welcome! Confirm your email to activate your account.</p>
         <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">Verify email</a></p>
         <p>This link expires in 24 hours.</p>`
    );
};

export const sendResetPasswordEmail = async (to: string, token: string): Promise<boolean> => {
    const link = `${baseLink()}/reset-password?token=${token}`;
    return sendMail(
        to,
        "Reset your Second Brain password",
        `<p>We received a request to reset your password.</p>
         <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">Reset password</a></p>
         <p>This link expires in 30 minutes. If you didn't request this, ignore this email.</p>`
    );
};

// Dev-mode helper: when SMTP is not configured we return a URI so tests/dev can
// still exercise the verification flow.
export const devEmailLink = (to: string, token: string): string => `${baseLink()}/verify-email?token=${token}`;