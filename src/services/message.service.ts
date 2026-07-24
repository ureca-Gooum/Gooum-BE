import { MessageModel } from "../models/message.model";
import { RoomMemberModel } from "../models/room-member.model";
import { RoomModel } from "../models/room.model";
import { UserModel } from "../models/user.model";

// 메시지 기록 조회
export const getMessages = async (
    roomId: string,
    userId: string,
    limit: number = 50,
    cursor?: string,
    search?: string,
    type?: string,
    around?: string,
) => {
    // 멤버인지 확인
    const membership = await RoomMemberModel.findOne({
        room_id: roomId,
        user_id: userId,
    });
    if (!membership)
        throw { statusCode: 403, message: "이 채팅방의 멤버가 아닙니다." };

    // around 모드: 해당 메시지 전후로 불러오기
    if (around) {
        const targetMessage = await MessageModel.findById(around);
        if (!targetMessage) throw { statusCode: 404, message: "메시지를 찾을 수 없어요." };

        const half = Math.floor(limit / 2);

        // 해당 메시지 이전
        const before = await MessageModel.find({
            room_id: roomId,
            created_at: { $lt: targetMessage.created_at },
        })
            .sort({ created_at: -1 })
            .limit(half);

        // 해당 메시지 이후 (자기 자신 포함)
        const after = await MessageModel.find({
            room_id: roomId,
            created_at: { $gte: targetMessage.created_at },
        })
            .sort({ created_at: 1 })
            .limit(half);

        const allMessages = [...before.reverse(), ...after];

        const senderIds = [...new Set(allMessages.map((m) => m.sender_id.toString()))];
        const senders = await UserModel.find({ _id: { $in: senderIds } });
        const senderMap = new Map(senders.map((s) => [s._id.toString(), s]));

        const messageList = allMessages.map((m) => {
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

        return {
            messages: messageList,
            targetMessageId: around,
            hasMore: before.length >= half,
            nextCursor: before.length > 0 ? before[before.length - 1]._id.toString() : null,
        };
    }

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

    // type
    if (type) {
        const types = type.split(",");
        filter.type = { $in: types };
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
    if (!message) throw { statusCode: 404, message: "메시지를 찾을 수 없어요." };

    if (message.sender_id.toString() !== userId) {
        throw { statusCode: 403, message: "본인이 보낸 메시지만 삭제할 수 있어요." };
    }

    message.is_deleted = true;
    message.content = undefined;
    await message.save();

    // lastMessage가 이 메시지였으면 업데이트
    const room = await RoomModel.findById(message.room_id);
    if (room?.last_message?.sender_id?.toString() === userId) {
        const lastMessageTime = room.last_message.sent_at?.getTime();
        const deletedMessageTime = message.created_at.getTime();

        // 시간이 같으면 이 메시지가 lastMessage였던 것
        if (lastMessageTime && Math.abs(lastMessageTime - deletedMessageTime) < 1000) {
            room.last_message.content = "이 메시지가 삭제되었습니다.";
            await room.save();
        }
    }

    return {
        messageId: message._id.toString(),
        roomId: message.room_id.toString(),
        isDeleted: true,
    };
};
