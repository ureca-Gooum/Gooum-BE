import "./core/config/dns";
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env, loadSecrets } from "./core/config/env";
import { swaggerSpec } from "./core/config/swagger";
import { connectDB } from "./core/db/mongoose";
import { errorHandler } from "./core/middlewares/errorHandler";
import authRoutes from "./api/routes/auth.route";
import roomRoutes from "./api/routes/room.route";
import documentRoutes from "./api/routes/document.route";
import { setupYWebSocket } from "./socket/yws.handler";
import cors from "cors";
import { setupSocket } from "./socket";

const app = express();

app.use(
    cors({
        origin:
            env.NODE_ENV === "production"
                ? "https://gooum-green.vercel.app"
                : "http://localhost:5173",
        credentials: true,
    }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => res.redirect("/api-docs"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/documents", documentRoutes);

app.use(errorHandler);

const startServer = async () => {
    await loadSecrets();
    await connectDB();

    const httpServer = createServer(app);

    // y-websocket (동시 편집)
    await setupYWebSocket(httpServer);

    // Socket.io (채팅)
    setupSocket(httpServer);

    const port = Number(process.env.PORT) || Number(env.PORT);

    httpServer.listen(port, () => {
        console.log(`🚀 Server is running on port ${port}`);
    });
};

startServer();
