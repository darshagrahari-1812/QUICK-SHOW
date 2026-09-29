import 'dotenv/config';
import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn && mongoose.connection.readyState >= 1) {
        return cached.conn;
    }

    let uri = (process.env.MONGODB_URI || "").trim();

    // Strip accidental variable name prefix (e.g. MONGODB_URI=mongodb+srv://...)
    if (/^MONGODB_URI\s*=\s*/i.test(uri)) {
        uri = uri.replace(/^MONGODB_URI\s*=\s*/i, "").trim();
    }

    // Strip wrapping quotes (single, double, or backticks)
    if (
        (uri.startsWith('"') && uri.endsWith('"')) ||
        (uri.startsWith("'") && uri.endsWith("'")) ||
        (uri.startsWith('`') && uri.endsWith('`'))
    ) {
        uri = uri.slice(1, -1).trim();
    }

    // Re-check in case quotes were on the outside of MONGODB_URI=
    if (/^MONGODB_URI\s*=\s*/i.test(uri)) {
        uri = uri.replace(/^MONGODB_URI\s*=\s*/i, "").trim();
    }

    if (!uri) {
        throw new Error("MONGODB_URI is empty in environment variables");
    }

    if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
        throw new Error(
            `Invalid MONGODB_URI scheme (starts with "${uri.substring(0, 10)}..."). Please check the MONGODB_URI environment variable in Vercel settings.`
        );
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: true,
            maxPoolSize: 10,
        };

        cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
            console.log("Database connected successfully");
            return mongooseInstance;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        console.error("MongoDB connection error:", error);
        throw error;
    }

    return cached.conn;
};

export default connectDB;