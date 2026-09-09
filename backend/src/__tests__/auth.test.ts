import request from "supertest";
import { describe, it, expect } from "vitest";
import User from "../models/User";
import { app } from "../index";

const base = "/api/v1";

describe("Auth endpoints", () => {
    it("signup creates a verified account (no SMTP configured)", async () => {
        const res = await request(app).post(`${base}/auth/signup`).send({
            username: "alice",
            email: "alice@test.dev",
            password: "password123",
        });
        expect(res.status).toBe(201);
        expect(res.body.token).toBeTruthy();
        expect(res.body.user.email).toBe("alice@test.dev");

        const dbUser = await User.findOne({ email: "alice@test.dev" });
        expect(dbUser).not.toBeNull();
        expect(dbUser!.isVerified).toBe(true);
    });

    it("signup rejects a duplicate email/username with 409", async () => {
        await request(app).post(`${base}/auth/signup`).send({
            username: "bob",
            email: "bob@test.dev",
            password: "password123",
        });
        const res = await request(app).post(`${base}/auth/signup`).send({
            username: "bob2",
            email: "bob@test.dev",
            password: "password123",
        });
        expect(res.status).toBe(409);
        expect(res.body.message).toContain("already exists");
    });

    it("signup validates input (weak password → 400)", async () => {
        const res = await request(app).post(`${base}/auth/signup`).send({
            username: "carol",
            email: "carol@test.dev",
            password: "short",
        });
        expect(res.status).toBe(400);
    });

    it("signin returns a token for valid credentials", async () => {
        await request(app).post(`${base}/auth/signup`).send({
            username: "dave",
            email: "dave@test.dev",
            password: "password123",
        });
        const res = await request(app).post(`${base}/auth/signin`).send({
            email: "dave@test.dev",
            password: "password123",
        });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();
    });

    it("signin rejects wrong password with 401", async () => {
        const res = await request(app).post(`${base}/auth/signin`).send({
            email: "dave@test.dev",
            password: "wrongpass1",
        });
        expect(res.status).toBe(401);
    });

    it("blocks signin for unverified accounts", async () => {
        await User.create({
            username: "eve",
            email: "eve@test.dev",
            password: "password123",
            isVerified: false,
        });
        const res = await request(app).post(`${base}/auth/signin`).send({
            email: "eve@test.dev",
            password: "password123",
        });
        expect(res.status).toBe(403);
    });

    it("verify-email activates a token-based account", async () => {
        const user = await User.create({
            username: "frank",
            email: "frank@test.dev",
            password: "password123",
            isVerified: false,
            verifyToken: "vtoken123",
            verifyTokenExpires: new Date(Date.now() + 60_000),
        });
        const res = await request(app).get(`${base}/auth/verify-email?token=vtoken123`);
        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();

        const refreshed = await User.findById(user._id);
        expect(refreshed!.isVerified).toBe(true);
        expect(refreshed!.verifyToken).toBeFalsy();
    });

    it("verify-email rejects an invalid token", async () => {
        const res = await request(app).get(`${base}/auth/verify-email?token=bogus`);
        expect(res.status).toBe(400);
    });

    it("forgot-password always returns 200 (no enumeration)", async () => {
        const res = await request(app).post(`${base}/auth/forgot-password`).send({ email: "nobody@test.dev" });
        expect(res.status).toBe(200);
    });

    it("reset-password sets a new password for a valid token", async () => {
        await User.create({
            username: "grace",
            email: "grace@test.dev",
            password: "oldpassword1",
            isVerified: true,
            resetToken: "rtoken123",
            resetTokenExpires: new Date(Date.now() + 60_000),
        });
        const res = await request(app).post(`${base}/auth/reset-password`).send({
            token: "rtoken123",
            password: "newpassword1",
        });
        expect(res.status).toBe(200);

        const signin = await request(app).post(`${base}/auth/signin`).send({
            email: "grace@test.dev",
            password: "newpassword1",
        });
        expect(signin.status).toBe(200);
    });

    it("reset-password rejects expired tokens", async () => {
        await User.create({
            username: "heidi",
            email: "heidi@test.dev",
            password: "oldpassword1",
            resetToken: "expiredtoken",
            resetTokenExpires: new Date(Date.now() - 60_000),
        });
        const res = await request(app).post(`${base}/auth/reset-password`).send({
            token: "expiredtoken",
            password: "newpassword1",
        });
        expect(res.status).toBe(400);
    });
});