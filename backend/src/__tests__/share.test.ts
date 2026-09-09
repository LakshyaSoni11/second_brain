import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../index";

const base = "/api/v1";
let token = "";

beforeAll(async () => {
    const signup = await request(app).post(`${base}/auth/signup`).send({
        username: "share_user",
        email: "share@test.dev",
        password: "password123",
    });
    token = signup.body.token as string;
});

const addItem = (title: string, link: string) =>
    request(app)
        .post(`${base}/content`)
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "link", title, link, tags: ["share"] });

const auth = () => ({ Authorization: `Bearer ${token}` });

describe("Share brain", () => {
    it("starts disabled by default", async () => {
        const res = await request(app).get(`${base}/brain/share/status`).set(auth());
        expect(res.status).toBe(200);
        expect(res.body.isShared).toBe(false);
        expect(res.body.shareLink).toBeNull();
    });

    it("toggles sharing on and returns a share link", async () => {
        await addItem("Shared doc", "https://example.com/shared");
        const res = await request(app).post(`${base}/brain/share`).set(auth()).send({});
        expect(res.status).toBe(200);
        expect(res.body.isShared).toBe(true);
        expect(res.body.shareLink).toContain("/brain/");
    });

    it("serves the shared brain publicly", async () => {
        await addItem("Shared doc", "https://example.com/shared");
        await request(app).post(`${base}/brain/share`).set(auth()).send({ isShared: true });

        const status = await request(app).get(`${base}/brain/share/status`).set(auth());
        const link = status.body.shareLink as string;
        const hash = link.split("/brain/")[1];
        const res = await request(app).get(`${base}/brain/${hash}`);
        expect(res.status).toBe(200);
        expect(res.body.content.length).toBeGreaterThan(0);
        expect(res.body.username).toBeDefined();
    });

    it("supports a custom slug", async () => {
        const res = await request(app)
            .post(`${base}/brain/share`)
            .set(auth())
            .send({ isShared: true, slug: "my-unique-slug" });
        expect(res.status).toBe(200);
        expect(res.body.shareLink).toContain("/brain/my-unique-slug");

        const pub = await request(app).get(`${base}/brain/my-unique-slug`);
        expect(pub.status).toBe(200);
    });

    it("rejects a duplicate slug", async () => {
        const taken = await request(app)
            .post(`${base}/brain/share`)
            .set(auth())
            .send({ isShared: true, slug: "dup-slug" });
        expect(taken.status).toBe(200);

        await request(app).post(`${base}/auth/signup`).send({
            username: "slug_other",
            email: "slugother@test.dev",
            password: "password123",
        });
        const other = await request(app).post(`${base}/auth/signin`).send({
            email: "slugother@test.dev",
            password: "password123",
        });
        const res = await request(app)
            .post(`${base}/brain/share`)
            .set({ Authorization: `Bearer ${other.body.token}` })
            .send({ isShared: true, slug: "dup-slug" });
        expect(res.status).toBe(409);
    });

    it("protects brains with a password", async () => {
        await request(app)
            .post(`${base}/brain/share`)
            .set(auth())
            .send({ isShared: true, slug: "locked-brain", password: "secret1234" });
        expect((await request(app).get(`${base}/brain/share/status`).set(auth())).body.hasPassword).toBe(true);

        const noPass = await request(app).get(`${base}/brain/locked-brain`);
        expect(noPass.status).toBe(401);
        expect(noPass.body.requiresPassword).toBe(true);

        const wrong = await request(app).get(`${base}/brain/locked-brain`).set("x-share-password", "nope");
        expect(wrong.status).toBe(401);

        const ok = await request(app).get(`${base}/brain/locked-brain`).set("x-share-password", "secret1234");
        expect(ok.status).toBe(200);
    });

    it("expires shared brains", async () => {
        await request(app)
            .post(`${base}/brain/share`)
            .set(auth())
            .send({ isShared: true, slug: "expiring-brain", expiresInDays: 1 });
        const sharedBrain = await (await import("../models/SharedBrain")).default.findOne({ slug: "expiring-brain" });
        sharedBrain!.expiresAt = new Date(Date.now() - 1000);
        await sharedBrain!.save();

        const res = await request(app).get(`${base}/brain/expiring-brain`);
        expect(res.status).toBe(410);
    });

    it("returns 404 once sharing is turned off", async () => {
        await addItem("Off doc", "https://example.com/offdoc");
        await request(app).post(`${base}/brain/share`).set(auth()).send({ isShared: true });
        const status = await request(app).get(`${base}/brain/share/status`).set(auth());
        const link = status.body.shareLink as string;
        const hash = link.split("/brain/")[1];

        await request(app).post(`${base}/brain/share`).set(auth()).send({ isShared: false });

        const res = await request(app).get(`${base}/brain/${hash}`);
        expect(res.status).toBe(404);
    });

    it("returns 404 for a never-shared brain", async () => {
        const res = await request(app).get(`${base}/brain/unknownhash123`);
        expect(res.status).toBe(404);
    });
});