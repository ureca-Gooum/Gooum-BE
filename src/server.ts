import express from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "./core/config/env";
import { swaggerSpec } from "./core/config/swagger";

const app = express();
app.use(express.json());

// 루트로 들어오면 스웨거로 리다이렉트
app.get("/", (req, res) => {
    res.redirect("/api-docs");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(env.PORT, () => {
    console.log(`🚀 Server is running on port ${env.PORT}`);
});
