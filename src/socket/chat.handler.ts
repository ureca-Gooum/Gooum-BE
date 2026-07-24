import { Server as SocketIOServer, Socket } from "socket.io";
import { RoomMemberModel } from "../models/room-member.model";
import { MessageModel } from "../models/message.model";
import { UserModel } from "../models/user.model";
import { RoomModel } from "../models/room.model";
import { NotificationModel } from "../models/notification.model";

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

    // 2. 채팅방 화면 이탈 (단순 탭 이동/뒤로가기)
    socket.on(
        "leaveRoom",
        async (data: { roomId: string }, callback?: Function) => {
            try {
                socket.leave(data.roomId);

                if (userId) {
                    await RoomMemberModel.findOneAndUpdate(
                        {
                            room_id: data.roomId,
                            user_id: userId,
                        },
                        { last_read_at: new Date() },
                    );
                }

                console.log(
                    `[socket] 유저(${userId}) / 소켓(${socket.id})이 ${data.roomId} 화면 이탈`,
                );
                callback?.({ success: true });
            } catch (err) {
                console.error(
                    `[socket] leaveRoom 에러 (유저: ${userId}, 소켓: ${socket.id}): `,
                    err,
                );
                callback?.({
                    success: false,
                    message: "채팅방 화면 이탈 처리에 실패했어요.",
                });
            }
        },
    );

    // 3. 메세지 전송 + 알림 생성
    socket.on(
        "sendMessage",
        async (
            data: {
                roomId: string;
                content?: any;
                type: "text" | "image" | "file" | "document";
                fileUrl?: string;
                fileName?: string;
                documentId?: string;
            },
            callback?: Function,
        ) => {
            if (!userId) {
                callback?.({ success: false, message: "인증이 필요합니다." });
                return;
            }

            try {
                const message = await MessageModel.create({
                    room_id: data.roomId,
                    sender_id: userId,
                    content: data.content || undefined,
                    type: data.type,
                    file_url: data.fileUrl || undefined,
                    file_name: data.fileName || undefined,
                    document_id: data.documentId || undefined,
                });

                const sender = await UserModel.findById(userId);
                const room = await RoomModel.findById(data.roomId);

                const lastMessageContent =
                    data.type === "text"
                        ? extractText(data.content)
                        : data.type === "image"
                          ? "사진을 보냈습니다"
                          : data.type === "file"
                            ? "파일을 보냈습니다"
                            : "문서를 공유했습니다";

                await RoomModel.findByIdAndUpdate(data.roomId, {
                    last_message: {
                        content: lastMessageContent,
                        sender_id: userId,
                        sent_at: new Date(),
                    },
                });

                const messageResponse = {
                    messageId: message._id.toString(),
                    roomId: data.roomId,
                    sender: {
                        userId: sender?._id.toString(),
                        name: sender?.name,
                        profileImageUrl: sender?.profile_image_url || null,
                    },
                    content: message.content || null,
                    type: message.type,
                    fileUrl: message.file_url || null,
                    fileName: message.file_name || null,
                    documentId: message.document_id?.toString() || null,
                    isDeleted: false,
                    createdAt: message.created_at,
                };

                io.to(data.roomId).emit("newMessage", messageResponse);

                // 알림 생성 + 전달 (발신자 제외)
                const members = await RoomMemberModel.find({
                    room_id: data.roomId,
                });

                for (const member of members) {
                    if (member.user_id.toString() === userId) continue;

                    const notification = await NotificationModel.create({
                        user_id: member.user_id,
                        type: "message",
                        title: room?.name || sender?.name || "새 메시지",
                        body: `${sender?.name}: ${lastMessageContent}`,
                        room_id: data.roomId,
                    });

                    // 해당 유저에게 실시간 알림 전달
                    io.to(member.user_id.toString()).emit("newNotification", {
                        notificationId: notification._id.toString(),
                        type: notification.type,
                        title: notification.title,
                        body: notification.body,
                        roomId: data.roomId,
                        isRead: false,
                        createdAt: notification.created_at,
                    });
                }

                callback?.({
                    success: true,
                    messageId: message._id.toString(),
                });
            } catch (err) {
                console.error("[socket] sendMessage 에러: ", err);
                callback?.({
                    success: false,
                    message: "메세지 전송에 실패했어요.",
                });
            }
        },
    );

    // 4. 타이핑 중
    socket.on(
        "typing",
        async (data: { roomId: string }, callback?: Function) => {
            try {
                const user = await UserModel.findById(userId);

                socket.to(data.roomId).emit("userTyping", {
                    roomId: data.roomId,
                    userId: userId,
                    name: user?.name,
                });

                callback?.({ success: true });
            } catch (err) {
                console.error("[socket] typing 에러 : ", err);
                callback?.({
                    success: false,
                    message: "타이핑 알림에 실패했어요.",
                });
            }
        },
    );

    // 5. 프레즌스 상태 변경
    socket.on(
        "updatePresence",
        async (
            data: { status: "online" | "away" | "offline" },
            callback?: Function,
        ) => {
            try {
                await UserModel.findByIdAndUpdate(userId, {
                    "presence.status": data.status,
                    "presence.last_seen_at": new Date(),
                });

                // 내가 속한 모든 채팅방 멤버들에게 알림
                const myRooms = await RoomMemberModel.find({ user_id: userId });
                for (const room of myRooms) {
                    socket.to(room.room_id.toString()).emit("presenceChanged", {
                        userId: userId,
                        status: data.status,
                        lastSeenAt: new Date(),
                    });
                }

                callback?.({ success: true });
            } catch (err) {
                console.error("[socket] updatePresence 에러 : ", err);
                callback?.({
                    success: false,
                    message: "상태 변경에 실패했어요",
                });
            }
        },
    );

    // 연결 시 자동으로 온라인 상태 설정
    if (userId) {
        (async () => {
            try {
                await UserModel.findByIdAndUpdate(userId, {
                    "presence.status": "online",
                    "presence.last_seen_at": new Date(),
                });

                // 안 읽은 알림 수 전달
                NotificationModel.countDocuments({
                    user_id: userId,
                    is_read: false,
                }).then((unreadCount) => {
                    socket.emit("unreadCount", { unreadCount });
                }).catch(() => {});

                // 내가 속한 모든 채팅방 멤버들에게 "나 온라인 됐다"고 알림
                const myRooms = await RoomMemberModel.find({ user_id: userId });
                for (const room of myRooms) {
                    socket.to(room.room_id.toString()).emit("presenceChanged", {
                        userId: userId,
                        status: "online",
                        lastSeenAt: new Date(),
                    });
                }
            } catch (err) {
                console.error("[socket] connect 프레즌스 에러:", err);
            }
        })();
    }

    // 연결 해제 시 자동으로 오프라인 상태 설정
    socket.on("disconnect", async () => {
        if (!userId) return;
        try {
            await UserModel.findByIdAndUpdate(userId, {
                "presence.status": "offline",
                "presence.last_seen_at": new Date(),
            });

            const myRooms = await RoomMemberModel.find({ user_id: userId });
            for (const room of myRooms) {
                socket.to(room.room_id.toString()).emit("presenceChanged", {
                    userId: userId,
                    status: "offline",
                    lastSeenAt: new Date(),
                });
            }
        } catch (err) {
            console.error("[socket] disconnect 프레즌스 에러:", err);
        }
    });
};
