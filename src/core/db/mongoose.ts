import mongoose from "mongoose";
import { env } from "../config/env";

export const connectDB = async () => {
    try {
        await mongoose.connect(env.DOCUMENT_DB_CONNECTION_STRING, {
            dbName: env.DOCUMENT_DATABASE_NAME,
            tls: true,
            retryWrites: false,
            directConnection: false,
        });
        console.log("✅ Cosmos DB (MongoDB vCore) 연결 성공");
    } catch (err) {
        console.error("❌ DB 연결 실패:", err);
        process.exit(1);
    }
};
