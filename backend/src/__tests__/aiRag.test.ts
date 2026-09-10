import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../index";
import { scoreBrainContent, queryTokens } from "../services/ragService";

const base = "/api/v1";
let token = "";

// Force the deterministic (non-LLM) path regardless of backend/.env keys.
const savedGroq = process.env.GROQ_API_KEY;
const savedOpenAI = process.env.OPENAI_API_KEY;

const baseDoc = {
    type: "link",
    title: "MongoDB aggregation pipelines",
    link: "https://example.com/mongo",
    description: "Notes on indexing strategies and aggregation stages",
    tags: ["mongo", "db"],
};

const ranked = (score: number, now: number, ageDays = 0): Date =>
    new Date(now - ageDays * 86400000);

const asScorable = {
    title: baseDoc.title,
    description: baseDoc.description,
    tags: baseDoc.tags,
    link: baseDoc.link,
    isFavorite: false,
    createdAt: new Date(),
};

describe("RAG scoring", () => {
    beforeAll(() => {
        process.env.GROQ_API_KEY = "";
        process.env.OPENAI_API_KEY = "";
    });
    afterAll(() => {
        process.env.GROQ_API_KEY = savedGroq;
        process.env.OPENAI_API_KEY = savedOpenAI;
    });

    it("tokenizes a question into keywords", () => {
        const tokens = queryTokens("How do I search MongoDB notes?");
        expect(tokens).toContain("mongodb");
        expect(tokens.length).toBeGreaterThan(0);
    });

    it("ranks a title match above a description-only match", () => {
        const now = Date.now();
        const titleHit = scoreBrainContent(
            { ...asScorable, title: "MongoDB crash course", description: "pasta recipes", tags: [], createdAt: ranked(0, now) },
            ["mongo"],
            now
        );
        const descHit = scoreBrainContent(
            { ...asScorable, title: "Weekend reading", description: "a guide to mongodb indexing", tags: [], createdAt: ranked(0, now) },
            ["mongo"],
            now
        );
        expect(titleHit).toBeGreaterThan(0);
        expect(titleHit).toBeGreaterThan(descHit);
    });

    it("scores 0 when no token overlaps", () => {
        const now = Date.now();
        expect(
            scoreBrainContent(
                { ...asScorable, title: "Cooking pasta", description: "recipes", tags: [], createdAt: ranked(0, now) },
                ["quantum"],
                now
            )
        ).toBe(0);
    });

    it("returns a neutral score for empty queries", () => {
        expect(scoreBrainContent(asScorable, [], Date.now())).toBe(50);
    });
});

describe("POST /ai/brain (Ask your brain)", () => {
    beforeAll(async () => {
        process.env.GROQ_API_KEY = "";
        process.env.OPENAI_API_KEY = "";
        const res = await request(app).post(`${base}/auth/signup`).send({
            username: "brain_asker",
            email: "brain_asker@test.dev",
            password: "password123",
        });
        token = res.body.token as string;
    });
    afterAll(() => {
        process.env.GROQ_API_KEY = savedGroq;
        process.env.OPENAI_API_KEY = savedOpenAI;
    });

    const addMongoDoc = () =>
        request(app)
            .post(`${base}/content`)
            .set("Authorization", `Bearer ${token}`)
            .send(baseDoc);

    it("requires auth", async () => {
        const res = await request(app).post(`${base}/ai/brain`).send({ question: "search mongodb" });
        expect(res.status).toBe(401);
    });

    it("rejects a missing question", async () => {
        const res = await request(app)
            .post(`${base}/ai/brain`)
            .set("Authorization", `Bearer ${token}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it("returns a grounded answer with ranked sources", async () => {
        await addMongoDoc();
        const res = await request(app)
            .post(`${base}/ai/brain`)
            .set("Authorization", `Bearer ${token}`)
            .send({ question: "How do I search my mongodb notes?" });
        expect(res.status).toBe(200);
        expect(res.body.llmUsed).toBe(false);
        expect(typeof res.body.answer).toBe("string");
        expect(res.body.answer.length).toBeGreaterThan(0);
        expect(Array.isArray(res.body.sources)).toBe(true);
        expect(res.body.sources.length).toBeGreaterThan(0);
        const hit = res.body.sources.find((s: { title: string }) => s.title === baseDoc.title);
        expect(hit).toBeDefined();
        expect(hit.link).toBe(baseDoc.link);
        expect(Number.isFinite(hit.relevance)).toBe(true);
        expect(res.body.sources[0].relevance).toBeGreaterThanOrEqual(res.body.sources.at(-1).relevance);
    });

    it("answers gracefully for an unrelated question", async () => {
        await addMongoDoc();
        const res = await request(app)
            .post(`${base}/ai/brain`)
            .set("Authorization", `Bearer ${token}`)
            .send({ question: "artificial neural networks quantum computing" });
        expect(res.status).toBe(200);
        expect(typeof res.body.answer).toBe("string");
        expect(res.body.answer.length).toBeGreaterThan(0);
    });

    it("is isolated per user", async () => {
        const other = await request(app).post(`${base}/auth/signup`).send({
            username: "empty_brain",
            email: "empty_brain@test.dev",
            password: "password123",
        });
        const res = await request(app)
            .post(`${base}/ai/brain`)
            .set("Authorization", `Bearer ${other.body.token}`)
            .send({ question: "search mongodb" });
        expect(res.status).toBe(200);
        // empty brain -> friendly answer, no sources
        expect(res.body.sources).toEqual([]);
        expect(res.body.llmUsed).toBe(false);
    });
});