import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(3001),
    MONGO_URI: z.string().default("mongodb://localhost:27017/secondBrain"),
    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").default("dev_secret_change_me_123"),
    CLIENT_URL: z.string().url().default("http://localhost:5173"),
    BACKEND_URL: z.string().url().default("http://localhost:3001"),
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: z.coerce.boolean().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),
});

// Only enforce hard requirements in production; in dev, use defaults so tests run smoothly.
const shouldEnforce = process.env.NODE_ENV === "production";

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    const issues = parsed.error.issues.filter((i) => shouldEnforce || i.message.includes("JWT_SECRET"));
    if (issues.length) {
        console.error("❌ Invalid environment variables:");
        for (const issue of issues) {
            console.error(`  ${issue.path.join(".")}: ${issue.message}`);
        }
        process.exit(1);
    }
}

export const env = parsed.data;