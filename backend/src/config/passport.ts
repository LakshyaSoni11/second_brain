import passport from "passport";
import crypto from "crypto";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from "passport-github2";
import User from "../models/User";
import { Types } from "mongoose";

type OAuthProfile = GoogleProfile | GitHubProfile;

export const findOrCreateOAuthUser = async (profile: OAuthProfile, provider: "google" | "github"): Promise<{ _id: Types.ObjectId }> => {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) throw new Error("OAuth account has no email");
    const providerId = `${provider}:${profile.id}`;

    let user = await User.findOne({ providerId });
    if (!user) {
        const username = `${profile.username?.replace(/[^a-zA-Z0-9_]/g, "_")?.slice(0, 24) || "user"}${Math.floor(Math.random() * 1000)}`;
        const createData: Record<string, unknown> = {
            username,
            email,
            password: `oauth_${crypto.randomBytes(32).toString("hex")}`,
            isVerified: true,
            provider: provider === "google" ? "google" : "github",
            providerId,
        };
        if (profile.displayName) createData.displayName = profile.displayName;
        if (profile.photos?.[0]?.value) createData.avatar = profile.photos[0].value;
        user = await User.create(createData);
    }
    return { _id: user._id as Types.ObjectId };
};

const verifyCallback = (rawProvider: "google" | "github") => async (
    _accessToken: string,
    _refreshToken: string,
    profile: OAuthProfile,
    done: (err: unknown, user?: { _id: Types.ObjectId } | false) => void
) => {
    try {
        const user = await findOrCreateOAuthUser(profile, rawProvider);
        done(null, user);
    } catch (error) {
        done(error, false);
    }
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/v1/auth/google/callback`,
                scope: ["profile", "email"],
            },
            verifyCallback("google")
        )
    );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/v1/auth/github/callback`,
                scope: ["user:email"],
            },
            verifyCallback("github")
        )
    );
}

passport.serializeUser(() => undefined);
passport.deserializeUser(() => undefined);

export default passport;