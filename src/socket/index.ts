import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { handleChat } from "./chat.handler";
import { verifyToken } from "../core/security/jwt";

export const setupSocket = (httpServer: HttpServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin:
                process.env.NODE_ENV === "production"
                    ? "https://gooum-green.vercel.app"
                    : ["http://localhost:5173", "http://127.0.0.1:5500"],
            credentials: true,
        },
    });

    // Socket.io 인증 미들웨어
    io.use((socket, next) => {
        // auth에서 먼저 찾고, 없으면 헤더에서 찾기
        const token =
            socket.handshake.auth.token ||
            socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return next(new Error("인증이 필요합니다."));
        }

        try {
            const payload = verifyToken(token);
            (socket as any).userId = payload.userId;
            next();
        } catch (err) {
            next(new Error("유효하지 않은 토큰이에요."));
        }
    });

    io.on("connection", (socket: Socket) => {
        console.log(`[socket] 유저 연결됨 : ${socket.id}`);

        handleChat(io, socket);

        socket.on("disconnect", () => {
            console.log(`[socket] 유저 연결 해제 : ${socket.id}`);
        });
    });

    console.log("💬 Socket.io 채팅 서버 활성화");

    return io;
};
