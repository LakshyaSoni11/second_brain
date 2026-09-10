import mongoose from "mongoose";
import dns from "dns";

// Fix Windows DNS SRV lookup issues for MongoDB Atlas
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
    // Fallback if environment doesn't allow overriding DNS
}

export const connectDB = async (): Promise<void> => {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/secondBrain";
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const conn = await mongoose.connect(mongoUri);
            console.log(`✅ MongoDB connected: ${conn.connection.host}`);
            return;
        } catch (error) {
            console.error(`❌ MongoDB connection attempt ${attempt}/${maxRetries} failed:`, error);
            if (attempt === maxRetries) {
                console.error("❌ All connection attempts exhausted. Exiting.");
                process.exit(1);
            }
            await new Promise((r) => setTimeout(r, 3000));
        }
    }
};
