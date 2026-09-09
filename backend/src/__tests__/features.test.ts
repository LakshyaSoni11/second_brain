import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../index";

const base = "/api/v1";
let token = "";

beforeAll(async () => {
    const signup = await request(app).post(`${base}/auth/signup`).send({
        username: "feature_user",
        email: "feature@test.dev",
        password: "password123",
    });
    token = signup.body.token as string;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

const addItem = (title: string, link: string, tags: string[]) =>
    request(app)
        .post(`${base}/content`)
        .set(auth())
        .send({ type: "link", title, link, tags });

describe("Tag management", () => {
    it("lists tags with counts", async () => {
        await addItem("Tag A", "https://example.com/ta1", ["react"]);
        await addItem("Tag B", "https://example.com/ta2", ["react", "node"]);
        const res = await request(app).get(`${base}/tags`).set(auth());
        expect(res.status).toBe(200);
        const react = res.body.tags.find((t: { name: string }) => t.name === "react");
        expect(react.count).toBe(2);
    });

    it("renames a tag across all items", async () => {
        await addItem("Rename A", "https://example.com/rn1", ["oldtag"]);
        await addItem("Rename B", "https://example.com/rn2", ["oldtag", "keep"]);
        const res = await request(app)
            .put(`${base}/tags/oldtag`)
            .set(auth())
            .send({ name: "newtag" });
        expect(res.status).toBe(200);

        const list = await request(app).get(`${base}/content?tag=newtag`).set(auth());
        expect(list.body.content.length).toBe(2);
        const old = await request(app).get(`${base}/content?tag=oldtag`).set(auth());
        expect(old.body.content.length).toBe(0);
    });

    it("deletes a tag", async () => {
        await addItem("Delete tag", "https://example.com/del1", ["garbage"]);
        const res = await request(app).delete(`${base}/tags/garbage`).set(auth());
        expect(res.status).toBe(200);
        const list = await request(app).get(`${base}/content?tag=garbage`).set(auth());
        expect(list.body.content.length).toBe(0);
    });

    it("merges multiple tags into one", async () => {
        await addItem("Merge A", "https://example.com/ma1", ["red"]);
        await addItem("Merge B", "https://example.com/ma2", ["blue"]);
        const res = await request(app)
            .post(`${base}/tags/merge`)
            .set(auth())
            .send({ from: ["red", "blue"], into: "colors" });
        expect(res.status).toBe(200);
        const merged = await request(app).get(`${base}/content?tag=colors`).set(auth());
        expect(merged.body.content.length).toBe(2);
    });
});

describe("User profile & settings", () => {
    it("returns the profile", async () => {
        const res = await request(app).get(`${base}/user/profile`).set(auth());
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("feature@test.dev");
        expect(res.body.user.provider).toBe("local");
    });

    it("updates display name and avatar", async () => {
        const res = await request(app)
            .put(`${base}/user/profile`)
            .set(auth())
            .send({ displayName: "Feature Person", avatar: "https://example.com/avatar.png" });
        expect(res.status).toBe(200);
        expect(res.body.user.displayName).toBe("Feature Person");
        expect(res.body.user.avatar).toBe("https://example.com/avatar.png");
    });

    it("changes password with correct current password", async () => {
        const res = await request(app)
            .put(`${base}/user/password`)
            .set(auth())
            .send({ currentPassword: "password123", newPassword: "newpass456" });
        expect(res.status).toBe(200);

        const signin = await request(app).post(`${base}/auth/signin`).send({
            email: "feature@test.dev",
            password: "newpass456",
        });
        expect(signin.status).toBe(200);
    });

    it("rejects password change with wrong current password", async () => {
        const res = await request(app)
            .put(`${base}/user/password`)
            .set(auth())
            .send({ currentPassword: "wrong", newPassword: "whatever123" });
        expect(res.status).toBe(401);
    });
});