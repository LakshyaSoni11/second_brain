import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { randomUUID } from "crypto";
import { connectDB } from "./config/db";
import authRoutes from "./routes/authRoutes";
import contentRoutes from "./routes/contentRoutes";
import shareRoutes from "./routes/shareRoutes";
import aiRoutes from "./routes/aiRoutes";
import agentRoutes from "./routes/agentRoutes";
import tagRoutes from "./routes/tagRoutes";
import userRoutes from "./routes/userRoutes";
import { errorHandler, notFound } from "./middlewares/errorHandler";
import "./config/passport";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Request ID — attach to every request for traceability
app.use((req, _res, next) => {
    req.id = randomUUID();
    next();
});

// Security headers
app.use(helmet());

// Body parsing
app.use(express.json({ limit: "1mb" }));

// CORS
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);

// Logging — Apache-style, tags each line with the request id
app.use(
    morgan(':reqid "GET" :method :url :status :response-time ms', {
        skip: (req) => req.path === "/health" || req.path === "/api/health",
    })
);
morgan.token("reqid", (req: express.Request) => String(req.id || "-"));

// Rate limiting — protect auth, content & AI endpoints from abuse
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later" },
});
const contentLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many content requests, please slow down" },
});
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many AI requests, please slow down" },
});

// Routes (supports both /api/v1 and /api for frontend compatibility)
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/v1/content", contentLimiter, contentRoutes);
app.use("/api/content", contentLimiter, contentRoutes);

app.use("/api/v1/ai", aiLimiter, aiRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);

app.use("/api/v1/agents", aiLimiter, agentRoutes);
app.use("/api/agents", aiLimiter, agentRoutes);

app.use("/api/v1/brain", shareRoutes);
app.use("/api/brain", shareRoutes);

app.use("/api/v1/tags", contentLimiter, tagRoutes);
app.use("/api/tags", contentLimiter, tagRoutes);

app.use("/api/v1/user", contentLimiter, userRoutes);
app.use("/api/user", contentLimiter, userRoutes);

// Health check
const healthCheck = (_: express.Request, res: express.Response) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
};

app.get("/health", healthCheck);
app.get("/api/health", healthCheck);

// 404 + centralized error handling
app.use(notFound);
app.use(errorHandler);

// Start Server & DB
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

export { app };
export const initServer = startServer;
if (process.env.NODE_ENV !== "test") {
    startServer();
}