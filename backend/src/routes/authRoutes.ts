import { Router } from "express";
import passport from "passport";
import { signup, signin, verifyEmail, forgotPassword, resetPassword, issueTokenForUser } from "../controllers/authControllers";
import { AppError } from "../middlewares/errorHandler";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

const oauthRedirect = (provider: "google" | "github") => {
    const handler = (req: import("express").Request, res: import("express").Response) => {
        const profile = req.user as { _id?: unknown; id?: unknown } | undefined;
        const rawId = profile?._id ?? profile?.id;
        if (!rawId) {
            throw new AppError(401, "OAuth failed — no account matched");
        }
        const token = issueTokenForUser(String(rawId));
        res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/oauth?token=${token}`);
    };
    return handler;
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    router.get("/google", passport.authenticate("google", { session: false, scope: ["profile", "email"] }));
    router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/signin?error=oauth" }), oauthRedirect("google"));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    router.get("/github", passport.authenticate("github", { session: false, scope: ["user:email"] }));
    router.get("/github/callback", passport.authenticate("github", { session: false, failureRedirect: "/signin?error=oauth" }), oauthRedirect("github"));
}

export default router;