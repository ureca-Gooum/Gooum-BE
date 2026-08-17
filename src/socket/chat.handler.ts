import { Server as SocketIOServer, Socket } from "socket.io";
import {
    getUnreadCounts,
    markRoomNotificationsRead,
    createMessageNotification,
} from "../services/notification.service";
import {
    markRoomAsRead,
    getRoomMembers,
    getOtherMembersInMyRooms,
} from "../services/room.service";
import { createMessage, toggleReaction } from "../services/message.service";
import { setPresence, getPresenceStatus, getUserName } from "../services/user.service";

const userSockets = new Map<string, Set<string>>();

// room_id로 emit하면 그 방을 안 열어본 멤버는 못 받으니, 유저ID 기준으로 직접 emit한다
const broadcastPresenceToRoomMembers = async (
    io: SocketIOServer,
    userId: string,
    status: string,
    lastSeenAt: Date,
) => {
    const targetUserIds = await getOtherMembersInMyRooms(userId);

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
                await markRoomAsRead(data.roomId, userId);
                await markRoomNotificationsRead(data.roomId, userId);

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
                    await markRoomAsRead(data.roomId, userId);
                }

                // 퇴장 시점까지 생성된 알림도 모두 읽음 처리
                await markRoomNotificationsRead(data.roomId, userId);

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
                const { message, sender, room, lastMessageContent, messageResponse } =
                    await createMessage(userId, data);

                io.to(data.roomId).emit("newMessage", messageResponse);

                // 알림 생성
                const members = await getRoomMembers(data.roomId);
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

                    // DB 저장 및 실시간 알림 전송
                    const notification = await createMessageNotification({
                        userId: memberIdStr,
                        type: notificationType,
                        title: notificationTitle,
                        body: lastMessageContent,
                        roomId: data.roomId,
                        messageId: message._id.toString(),
                    });

                    io.to(memberIdStr).emit("newNotification", notification);

                    // 상대방 unreadCount 갱신
                    const memberCounts = await getUnreadCounts(memberIdStr);
                    io.to(memberIdStr).emit("unreadCount", memberCounts);
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
                const name = await getUserName(userId);

                socket.to(data.roomId).emit("userTyping", {
                    roomId: data.roomId,
                    userId: userId,
                    name,
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
                const now = await setPresence(userId, data.status);

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
                let currentStatus = await getPresenceStatus(userId);

                // 2) 오프라인에서 처음 접속한 경우에만 'online'으로 전환
                if (currentStatus === "offline") {
                    currentStatus = "online";
                    await setPresence(userId, "online");
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
                        const now = await setPresence(userId, "offline");
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
            const { roomId, reactions } = await toggleReaction(
                data.messageId,
                userId,
                data.emoji,
            );

            // 같은 방 모든 유저에게 리액션 업데이트 전달
            io.to(roomId).emit("reactionUpdated", {
                messageId: data.messageId,
                reactions,
            });

            callback?.({ success: true });
        } catch (err: any) {
            console.error("[socket] addReaction 에러:", err);
            callback?.({
                success: false,
                message: err?.message || "리액션 처리에 실패했어요.",
            });
        }
    });
};
