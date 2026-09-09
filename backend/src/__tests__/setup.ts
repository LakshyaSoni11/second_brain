import mongoose from "mongoose";
import dns from "dns";
import { beforeAll, afterAll, beforeEach } from "vitest";

try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
    /* ignore */
}

beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI as string, {
            serverSelectionTimeoutMS: 20000,
        });
    }
});

afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
});

// Users created in beforeAll() of each test file must survive per-test cleanup,
// so only reset content/shared-brain collections between tests.
beforeEach(async () => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("Test DB not connected");
    }
    for (const name of ["contents", "sharedbrains", "brains"]) {
        const col = mongoose.connection.db?.collection(name);
        if (col) await col.deleteMany({});
    }
});

// Silence expected warning noise from unconfigured SMTP during tests
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("SMTP not configured")) return;
    originalWarn(...args);
};