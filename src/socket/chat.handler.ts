import { Server as SocketIOServer, Socket } from "socket.io";
import { date, success } from "zod";
import { RoomMemberModel } from "../models/room-member.model";

// 에디터 JSON에서 텍스트만 추출 (last_message용)
const extractText = (content: any): string => {
    if (!content) return "";
    if (typeof content === "string") return content;

    let text = "";
    if (content.text) text += content.text;
    if (content.content) {
        for (const child of content.content) {
            text += extractText(child);
        }
    }
    return text.slice(0, 50);
};

export const handleChat = (io: SocketIOServer, socket: Socket) => {
    const userId = (socket as any).userId;

    // 1. 채팅방 입장
    socket.on(
        "joinRoom",
        async (data: { roomId: string }, callback?: Function) => {
            try {
                socket.join(data.roomId);

                if (userId) {
                    await RoomMemberModel.findOneAndUpdate(
                        {
                            room_id: data.roomId,
                            user_id: userId,
                        },
                        {
                            last_read_at: new Date(),
                        },
                    );
                }

                console.log(`[socket] ${socket.id}가 ${data.roomId}에 입장`);
                callback?.({ success: true });
            } catch (err) {
                console.error("[socket] joinRoom 에러: ", err);
                callback?.({
                    success: false,
                    message: "채팅방 입장에 실패했어요.",
                });
            }
        },
    );
};
