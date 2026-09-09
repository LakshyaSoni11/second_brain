import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";
import { app } from "../index";

const base = "/api/v1";
let token = "";
let otherToken = "";

const signupUser = async (username: string, email: string) => {
    const res = await request(app).post(`${base}/auth/signup`).send({
        username,
        email,
        password: "password123",
    });
    return res.body.token as string;
};

beforeAll(async () => {
    token = await signupUser("content_user", "content@test.dev");
    otherToken = await signupUser("other_user", "other@test.dev");
});

const addItem = (overrides: Record<string, unknown> = {}) =>
    request(app)
        .post(`${base}/content`)
        .set("Authorization", `Bearer ${token}`)
        .send({
            type: "link",
            title: "Testing MongoDB",
            link: "https://example.com/mongo",
            description: "Indexes and aggregation notes",
            tags: ["mongo", "db"],
            ...overrides,
        });

describe("Content CRUD", () => {
    it("rejects requests without a token", async () => {
        const res = await request(app).get(`${base}/content`);
        expect(res.status).toBe(401);
    });

    it("adds content with 201", async () => {
        const res = await addItem();
        expect(res.status).toBe(201);
        expect(res.body.content.title).toBe("Testing MongoDB");
        expect(res.body.content.tags).toEqual(["mongo", "db"]);
    });

    it("rejects a duplicate link with 409", async () => {
        const first = await addItem({ title: "Dup A", link: "https://example.com/dup" });
        expect(first.status).toBe(201);
        const dup = await addItem({ title: "Dup B", link: "https://example.com/dup" });
        expect(dup.status).toBe(409);
    });

    it("lists content with pagination", async () => {
        for (let i = 0; i < 5; i++) {
            await addItem({ title: `Page item ${i}`, link: `https://example.com/pg${i}`, tags: ["page"] });
        }
        const res = await request(app).get(`${base}/content?limit=3`).set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.content).toHaveLength(3);
        expect(res.body.pagination.total).toBe(5);
        expect(res.body.pagination.totalPages).toBe(2);
    });

    it("filters by type and tag", async () => {
        await addItem({ type: "video", title: "A video", link: "https://example.com/v", tags: ["media"] });
        const videos = await request(app).get(`${base}/content?type=video`).set("Authorization", `Bearer ${token}`);
        expect(videos.body.content.every((c: { type: string }) => c.type === "video")).toBe(true);

        const db = await request(app).get(`${base}/content?tag=media`).set("Authorization", `Bearer ${token}`);
        expect(db.body.content.length).toBeGreaterThan(0);
        expect(db.body.content.every((c: { tags: string[] }) => c.tags.includes("media"))).toBe(true);
    });

    it("searches by q across title/description/tags", async () => {
        await addItem({ title: "Search me", link: "https://example.com/search", description: "aggregation pipeline notes" });
        const res = await request(app)
            .get(`${base}/content?q=aggregation`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.content.length).toBeGreaterThan(0);
    });

    it("is isolated per-user", async () => {
        const res = await request(app).get(`${base}/content`).set("Authorization", `Bearer ${otherToken}`);
        expect(res.body.content).toHaveLength(0);
    });

    it("updates content", async () => {
        const created = await addItem({ title: "Before edit", link: "https://example.com/editme" });
        const id = created.body.content._id as string;
        const res = await request(app)
            .put(`${base}/content/${id}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "After edit", tags: ["edited"] });
        expect(res.status).toBe(200);
        expect(res.body.content.title).toBe("After edit");
        expect(res.body.content.tags).toEqual(["edited"]);
    });

    it("toggles favorite", async () => {
        const created = await addItem({ title: "Fav", link: "https://example.com/fav" });
        const id = created.body.content._id as string;
        const on = await request(app)
            .post(`${base}/content/${id}/favorite`)
            .set("Authorization", `Bearer ${token}`)
            .send({ isFavorite: true });
        expect(on.body.content.isFavorite).toBe(true);

        const filtered = await request(app)
            .get(`${base}/content?favorite=true`)
            .set("Authorization", `Bearer ${token}`);
        expect(filtered.body.content.some((c: { _id: string }) => c._id === id)).toBe(true);
    });

    it("returns stats", async () => {
        await addItem({ title: "Stats item", link: "https://example.com/stats" });
        const res = await request(app).get(`${base}/content/stats`).set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.total).toBeGreaterThan(0);
        expect(res.body.types).toHaveProperty("link");
        expect(Array.isArray(res.body.tags)).toBe(true);
    });

    it("deletes content and returns 404 afterwards", async () => {
        const created = await addItem({ title: "Delete me", link: "https://example.com/delete" });
        const id = created.body.content._id as string;
        const del = await request(app).delete(`${base}/content/${id}`).set("Authorization", `Bearer ${token}`);
        expect(del.status).toBe(200);

        const again = await request(app).put(`${base}/content/${id}`).set("Authorization", `Bearer ${token}`).send({ title: "x" });
        expect(again.status).toBe(404);
    });

    it("rejects non-http links", async () => {
        const res = await addItem({ link: "javascript:alert(1)" });
        expect(res.status).toBe(400);
    });
});

describe("Bulk actions", () => {
    it("bulk deletes items", async () => {
        const a = await addItem({ title: "Bulk1", link: "https://example.com/b1" });
        const b = await addItem({ title: "Bulk2", link: "https://example.com/b2" });
        const ids = [a.body.content._id, b.body.content._id];
        const res = await request(app)
            .post(`${base}/content/bulk/delete`)
            .set("Authorization", `Bearer ${token}`)
            .send({ ids });
        expect(res.status).toBe(200);
        expect(res.body.deletedCount).toBe(2);
    });

    it("bulk favorites and tags", async () => {
        const a = await addItem({ title: "BFav1", link: "https://example.com/bf1" });
        const b = await addItem({ title: "BFav2", link: "https://example.com/bf2" });
        const ids = [a.body.content._id, b.body.content._id];

        const fav = await request(app)
            .post(`${base}/content/bulk/favorite`)
            .set("Authorization", `Bearer ${token}`)
            .send({ ids, isFavorite: true });
        expect(fav.status).toBe(200);

        const tag = await request(app)
            .post(`${base}/content/bulk/tag`)
            .set("Authorization", `Bearer ${token}`)
            .send({ ids, add: ["bulk"] });
        expect(tag.status).toBe(200);

        const list = await request(app).get(`${base}/content?tag=bulk`).set("Authorization", `Bearer ${token}`);
        expect(list.body.content.length).toBe(2);
    });

    it("rejects bulk ops with empty ids", async () => {
        const res = await request(app)
            .post(`${base}/content/bulk/delete`)
            .set("Authorization", `Bearer ${token}`)
            .send({ ids: [] });
        expect(res.status).toBe(400);
    });
});

describe("Export & import", () => {
    it("exports JSON", async () => {
        await addItem({ title: "Export me", link: "https://example.com/export" });
        const res = await request(app)
            .get(`${base}/content/export?format=json`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("application/json");
        const body = JSON.parse(res.text);
        expect(Array.isArray(body.items)).toBe(true);
    });

    it("exports CSV and Markdown", async () => {
        const csv = await request(app).get(`${base}/content/export?format=csv`).set("Authorization", `Bearer ${token}`);
        expect(csv.status).toBe(200);
        expect(csv.headers["content-type"]).toContain("text/csv");
        expect(csv.text.split("\n")[0]).toContain("type,title,link");

        const md = await request(app).get(`${base}/content/export?format=markdown`).set("Authorization", `Bearer ${token}`);
        expect(md.status).toBe(200);
        expect(md.text).toContain("# Second Brain");
    });

    it("imports items and skips duplicates", async () => {
        await addItem({ title: "Unique imp", link: "https://example.com/skipme" });
        const res = await request(app)
            .post(`${base}/content/import`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                items: [
                    { title: "Imported A", link: "https://example.com/import-a", type: "link" },
                    { title: "Unique imp", link: "https://example.com/skipme", type: "link" },
                ],
            });
        expect(res.status).toBe(201);
        expect(res.body.added).toBe(1);
        expect(res.body.skipped).toBe(1);
    });
});