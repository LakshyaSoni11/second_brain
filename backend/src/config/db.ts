import mongoose from "mongoose";
import dns from "dns";

// Fix Windows DNS SRV lookup issues for MongoDB Atlas
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
    // Fallback if environment doesn't allow overriding DNS
}

export const connectDB = async (): Promise<void> => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/secondBrain";
        const conn = await mongoose.connect(mongoUri);
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error);
        console.warn("⚠️ Server running in standalone mode (DB disconnected)");
    }
};
