import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
process.env.NODE_ENV = "test";

if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required to run tests (see backend/.env)");
}
process.env.MONGO_URI = process.env.MONGO_URI.replace(/\/[^/?]*(?=\?|$)/, "/secondBrain_test");

export default async () => {};