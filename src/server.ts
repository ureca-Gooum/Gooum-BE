import "./core/config/dns";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { env, loadSecrets } from "./core/config/env";
import { swaggerSpec } from "./core/config/swagger";
import { connectDB } from "./core/db/mongoose";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.redirect("/api-docs");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const startServer = async () => {
    await loadSecrets(); // 1. Key Vault에서 시크릿 로드 (배포 환경만)
    await connectDB(); // 2. DB 연결
    app.listen(env.PORT, () => {
        console.log(`🚀 Server is running on port ${env.PORT}`);
    });
};

startServer();
