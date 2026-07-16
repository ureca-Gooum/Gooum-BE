import "./core/config/dns";
import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env, loadSecrets } from "./core/config/env";
import { swaggerSpec } from "./core/config/swagger";
import { connectDB } from "./core/db/mongoose";
import authRoutes from "./api/routes/auth.route";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    res.redirect("/api-docs");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRoutes);

const startServer = async () => {
    await loadSecrets();
    await connectDB();
    app.listen(env.PORT, () => {
        console.log(`🚀 Server is running on port ${env.PORT}`);
    });
};

startServer();
