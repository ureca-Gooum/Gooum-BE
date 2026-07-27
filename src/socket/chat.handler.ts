import { Server as SocketIOServer, Socket } from "socket.io";
import { RoomMemberModel } from "../models/room-member.model";
import { MessageModel } from "../models/message.model";
import { UserModel } from "../models/user.model";
import { RoomModel } from "../models/room.model";
import { NotificationModel } from "../models/notification.model";
import { Types } from "mongoose";

const userSockets = new Map<string, Set<string>>();

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

// 안 읽은 수 계산 헬퍼 함수 
export const getUnreadCounts = async (userId: string) => {

    // 1. 읽지 않은 알림 개수
    const unreadNotificationCount = await NotificationModel.countDocuments({
        user_id: userId,
        is_read: false,
    });

    // 2. 내가 속한 채팅방 목록 가져오기
    const myMemberships = await RoomMemberModel.find({ user_id: userId }).lean();
    
    // 속한 방이 없으면 바로 반환
    if (myMemberships.length === 0) {
        return { notifications: unreadNotificationCount, rooms: 0 };
    }

    // 3. 방별 "마지막 읽은 시간 이후의 메시지" 조건들을 배열로 생성
    const roomConditions = myMemberships.map((m) => ({
        room_id: m.room_id,
        created_at: { $gt: m.last_read_at },
    }));

    // 4. 안 읽은 메시지가 존재하는 방 ID들을 중복 없이 추출 ($or 사용)
    const unreadRoomIds = await MessageModel.distinct("room_id", {
        $or: roomConditions,
    });

    return { 
        notifications: unreadNotificationCount, 
        rooms: unreadRoomIds.length 
    };
};

// room_id로 emit하면 그 방을 안 열어본 멤버는 못 받으니, 유저ID 기준으로 직접 emit한다
const broadcastPresenceToRoomMembers = async (
    io: SocketIOServer,
    userId: string,
    status: string,
    lastSeenAt: Date,
) => {
    const myRooms = await RoomMemberModel.find({ user_id: userId }).lean();
    if (myRooms.length === 0) return;

    const roomIds = myRooms.map((r) => r.room_id);

    const otherMembers = await RoomMemberModel.find({
        room_id: { $in: roomIds },
        user_id: { $ne: userId },
    }).lean();

    // 같은 유저가 여러 방에 겹쳐 있어도 한 번만 보내도록 중복 제거
    const targetUserIds = new Set(otherMembers.map((m) => m.user_id.toString()));

    for (const targetUserId of targetUserIds) {
        io.to(targetUserId).emit("presenceChanged", { userId, status, lastSeenAt });
    }
};

export const handleChat = (io: SocketIOServer, socket: Socket) => {
    const userId = (socket as any).userId;

    // 1. 채팅방 입장
    socket.on("joinRoom", async (data: { roomId: string }, callback?: Function) => {
        try {
            socket.join(data.roomId);

            if (userId) {
                await RoomMemberModel.findOneAndUpdate(
                    { room_id: data.roomId, user_id: userId },
                    { last_read_at: new Date() },
                );

                // 해당 방과 관련된 안 읽은 알림들을 '읽음(is_read: true)' 처리
                await NotificationModel.updateMany(
                { room_id: data.roomId, user_id: userId, is_read: false },
                { $set: { is_read: true } }
                );

                // 갱신된 unreadCount 전달
                const counts = await getUnreadCounts(userId);
                socket.emit("unreadCount", counts);
            }

            console.log(`[socket] ${socket.id}가 ${data.roomId}에 입장`);
            callback?.({ success: true });
        } catch (err) {
            console.error("[socket] joinRoom 에러:", err);
            callback?.({ success: false, message: "채팅방 입장에 실패했어요." });
        }
    });

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

                // 퇴장 시점까지 생성된 알림도 모두 읽음 처리
                await NotificationModel.updateMany(
                    { room_id: data.roomId, user_id: userId, is_read: false },
                    { $set: { is_read: true } }
                );

                // 갱신된 unreadCount 전송
                const counts = await getUnreadCounts(userId);
                socket.emit("unreadCount", counts);

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
                type: "text" | "image" | "file" | "document" | "ai_summary";
                fileUrl?: string;
                fileName?: string;
                documentId?: string;
                mentions?: string[];
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
                            : data.type === "ai_summary"
                              ? "AI 요약을 보냈습니다"
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
                    reactions: [], 
                    isDeleted: false,
                    createdAt: message.created_at,
                };

                io.to(data.roomId).emit("newMessage", messageResponse);

                // 알림 생성
                const members = await RoomMemberModel.find({ room_id: data.roomId });
                const mentionSet = new Set(data.mentions || []);
                const hasMentions = mentionSet.size > 0;

                for (const member of members) {
                    const memberIdStr = member.user_id.toString();
                    
                    // 1. 본인이 보낸 메시지면 스킵
                    if (memberIdStr === userId) continue;

                    const isMentioned = mentionSet.has(memberIdStr);

                    // 멘션 메시지인 경우, 멘션되지 않은 일반 멤버는 알림 제외
                    if (hasMentions && !isMentioned) continue;
                    
                    //알림 설정 체크 (멘션 수신 vs 일반 메시지 수신)
                    if (isMentioned) {
                        if (!member.notification_settings?.mention) continue;
                    } else {
                        if (!member.notification_settings?.message) continue;
                    }

                    // 현재 해당 방을 열어두고 접속 중인지 확인
                    const memberSockets = await io.in(memberIdStr).fetchSockets();
                    const isInRoom = memberSockets.some((s: any) => s.rooms.has(data.roomId));

                    if (isInRoom && !isMentioned) continue;

                    const member_info = await UserModel.findById(member.user_id).select("name").lean();
                    const member_name = member_info?.name || "알 수 없음";

                    // 메시지 타입에 따라 알림 타입 결정
                    let notificationType: "message" | "document" | "mention" = "message";
                    let notificationTitle = room?.name || sender?.name || "새 메시지";

                    if (isMentioned) {
                        notificationType = "mention";
                        notificationTitle = `${sender?.name}님이 회원님을 멘션했어요`;
                    } else if (data.type === "document") {
                        notificationType = "document";
                        notificationTitle = "새 문서가 공유됐어요";
                    } else if (data.type === "image") {
                        notificationType = "message";
                        notificationTitle = `${sender?.name}님이 사진을 보냈어요`;
                    } else if (data.type === "file") {
                        notificationType = "message";
                        notificationTitle = `${sender?.name}님이 파일을 보냈어요`;
                    } else if (data.type === "ai_summary") {
                        notificationType = "document";
                        notificationTitle = `${sender?.name}님이 AI 요약을 보냈어요`;
                    }

                    const notificationBody = isMentioned 
                        ? `${sender?.name || '알 수 없음'}: @${member_name} ${lastMessageContent}`
                        : `${sender?.name || '알 수 없음'}: ${lastMessageContent}`;
                    
                    // DB 저장 및 실시간 알림 전송
                    const notification = await NotificationModel.create({
                        user_id: member.user_id,
                        type: notificationType,
                        title: notificationTitle,
                        body: notificationBody,
                        room_id: data.roomId,
                        message_id: message._id,
                    });

                    // 해당 유저에게 실시간 알림 전달
                    io.to(member.user_id.toString()).emit("newNotification", {
                        notificationId: notification._id.toString(),
                        type: notification.type,
                        title: notification.title,
                        body: notification.body,
                        roomId: data.roomId,
                        messageId: message._id.toString(),
                        isRead: false,
                        createdAt: notification.created_at,
                    });

                    // 상대방 unreadCount 갱신
                    const memberCounts = await getUnreadCounts(member.user_id.toString());
                    io.to(member.user_id.toString()).emit("unreadCount", memberCounts);
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
                const now = new Date();
                await UserModel.findByIdAndUpdate(userId, {
                    "presence.status": data.status,
                    "presence.last_seen_at": now,
                });

                // 내가 속한 방들의 다른 멤버들에게 상태 변경 전달 (그 방을 지금 열어봤는지와 무관하게)
                await broadcastPresenceToRoomMembers(io, userId, data.status, now);

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

    // 6. 소켓 연결 시 접속 처리
    if (userId) {
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(socket.id);

        (async () => {
            try {
                // 1) 현재 DB 저장된 상태 확인
                const user = await UserModel.findById(userId).select("presence");
                let currentStatus = user?.presence?.status || "online";

                // 2) 오프라인에서 처음 접속한 경우에만 'online'으로 전환
                if (currentStatus === "offline") {
                    currentStatus = "online";
                    await UserModel.findByIdAndUpdate(userId, {
                        "presence.status": "online",
                        "presence.last_seen_at": new Date(),
                    });
                }

                // 3) away이든 online이든 현재 확정된 상태를 내가 속한 방들의 다른 멤버들에게 전파
                await broadcastPresenceToRoomMembers(io, userId, currentStatus, new Date());

                // 4) unreadCount 전달
                const counts = await getUnreadCounts(userId);
                socket.emit("unreadCount", counts);
            } catch (err) {
                console.error("[socket] connect 프레즌스 에러:", err);
            }
        })();
    }

    // 7. 소켓 연결 해제 시 오프라인 처리
    socket.on("disconnect", async () => {
        if (!userId) return;

        const sockets = userSockets.get(userId);
        if (sockets) {
            sockets.delete(socket.id);

            // 새로고침 시 기존 소켓과 새 소켓 연결 사이의 찰나의 순간을 방어하기 위해 300ms 대기
            setTimeout(async () => {
                const currentSockets = userSockets.get(userId);

                // 300ms 후에도 연결된 소켓이 진짜로 0개일 때만 오프라인 처리
                if (!currentSockets || currentSockets.size === 0) {
                    userSockets.delete(userId);

                    try {
                        const now = new Date();
                        await UserModel.findByIdAndUpdate(userId, {
                            "presence.status": "offline",
                            "presence.last_seen_at": now,
                        });

                        await broadcastPresenceToRoomMembers(io, userId, "offline", now);
                    } catch (err) {
                        console.error("[socket] disconnect 프레즌스 에러:", err);
                    }
                }
            }, 300); // 300ms 타임아웃 지연
        }
    });

    // 리액션 추가/제거 (토글)
    socket.on("addReaction", async (data: {
        messageId: string;
        emoji: string;
    }, callback?: Function) => {
        if (!userId) {
            callback?.({ success: false, message: "인증이 필요합니다." });
            return;
        }

        try {
            const message = await MessageModel.findById(data.messageId);
            if (!message) {
                callback?.({ success: false, message: "메시지를 찾을 수 없어요." });
                return;
            }

            const existingReaction = message.reactions.find(
                (r) => r.emoji === data.emoji,
            );

            if (existingReaction) {
                const userIndex = existingReaction.user_ids.findIndex(
                    (id) => id.toString() === userId,
                );

                if (userIndex > -1) {
                    // 이미 눌렀으면 제거 (토글)
                    existingReaction.user_ids.splice(userIndex, 1);
                    if (existingReaction.user_ids.length === 0) {
                        message.reactions = message.reactions.filter(
                            (r) => r.emoji !== data.emoji,
                        );
                    }
                } else {
                    // 안 눌렀으면 추가
                    existingReaction.user_ids.push(new Types.ObjectId(userId));
                }
            } else {
                // 새 이모지 리액션 생성
                message.reactions.push({
                    emoji: data.emoji,
                    user_ids: [new Types.ObjectId(userId)],
                });
            }

            await message.save();

            // 같은 방 모든 유저에게 리액션 업데이트 전달
            const reactionsResponse = message.reactions.map((r) => ({
                emoji: r.emoji,
                userIds: r.user_ids.map((id) => id.toString()),
                count: r.user_ids.length,
            }));

            io.to(message.room_id.toString()).emit("reactionUpdated", {
                messageId: data.messageId,
                reactions: reactionsResponse,
            });

            callback?.({ success: true });
        } catch (err) {
            console.error("[socket] addReaction 에러:", err);
            callback?.({ success: false, message: "리액션 처리에 실패했어요." });
        }
    });
};