import { MessageModel } from "../models/message.model";
import { RoomMemberModel } from "../models/room-member.model";
import { UserModel } from "../models/user.model";

// 메시지 기록 조회
export const getMessages = async (
    roomId: string,
    userId: string,
    limit: number = 50,
    cursor?: string,
    search?: string,
) => {
    // 멤버인지 확인
    const membership = await RoomMemberModel.findOne({
        room_id: roomId,
        user_id: userId,
    });
    if (!membership)
        throw { statusCode: 403, message: "이 채팅방의 멤버가 아닙니다." };

    const filter: any = { room_id: roomId };

    // cursor 기반 페이지네이션
    if (cursor) {
        const cursorMessage = await MessageModel.findById(cursor);
        if (cursorMessage) {
            filter.created_at = { $lt: cursorMessage.created_at };
        }
    }

    // 검색
    if (search) {
        filter.$or = [
            {
                "content.content.content.text": {
                    $regex: search,
                    $options: "i",
                },
            },
        ];
    }

    const messages = await MessageModel.find(filter)
        .sort({ created_at: -1 })
        .limit(limit + 1);

    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;

    // 발신자 정보 조회
    const senderIds = [...new Set(result.map((m) => m.sender_id.toString()))];
    const senders = await UserModel.find({ _id: { $in: senderIds } });
    const senderMap = new Map(senders.map((s) => [s._id.toString(), s]));

    const messageList = result.map((m) => {
        const sender = senderMap.get(m.sender_id.toString());
        return {
            messageId: m._id.toString(),
            roomId: m.room_id.toString(),
            sender: {
                userId: sender?._id.toString(),
                name: sender?.name,
                profileImageUrl: sender?.profile_image_url || null,
            },
            content: m.is_deleted ? null : m.content || null,
            type: m.type,
            fileUrl: m.file_url || null,
            fileName: m.file_name || null,
            documentId: m.document_id?.toString() || null,
            isDeleted: m.is_deleted,
            createdAt: m.created_at,
        };
    });

    // last_read_at 업데이트
    await RoomMemberModel.findOneAndUpdate(
        { room_id: roomId, user_id: userId },
        { last_read_at: new Date() },
    );

    return {
        messages: messageList,
        hasMore,
        nextCursor: hasMore ? result[result.length - 1]._id.toString() : null,
    };
};

// 메시지 삭제 (소프트 삭제)
export const deleteMessage = async (messageId: string, userId: string) => {
    const message = await MessageModel.findById(messageId);
    if (!message)
        throw { statusCode: 404, message: "메시지를 찾을 수 없어요." };

    if (message.sender_id.toString() !== userId) {
        throw {
            statusCode: 403,
            message: "본인이 보낸 메시지만 삭제할 수 있어요.",
        };
    }

    message.is_deleted = true;
    message.content = undefined;
    await message.save();

    return {
        messageId: message._id.toString(),
        roomId: message.room_id.toString(),
        isDeleted: true,
    };
};
