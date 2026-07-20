import { RoomMemberModel } from "../models/room-member.model";
import { RoomModel } from "../models/room.model";
import { CreateRoomDto } from "../schemas/room.schema";

// 채팅방 생성
export const createRoom = async (userId: string, data: CreateRoomDto) => {
    // direct인 경우 멤버 1명만
    if (data.type === "direct" && data.memberIds.length !== 1) {
        throw {
            statusCode: 400,
            message: "1:1 채팅방은 상대방 1명만 지정해주세요.",
        };
    }

    // group인 경우 멤버 2명 이상
    if (data.type === "group" && data.memberIds.length < 2) {
        throw {
            statusCode: 400,
            message: "그룹 채팅방은 2명 이상 지정해주세요.",
        };
    }

    // direct인 경우 기존 1:1 채팅방 확인
    if (data.type === "direct") {
        const existingMembers = await RoomMemberModel.find({ user_id: userId });
        for (const member of existingMembers) {
            const room = await RoomModel.findById(member.room_id);
            if (room?.type == "direct") {
                const otherMember = await RoomMemberModel.findOne({
                    room_id: member.room_id,
                    user_id: data.memberIds[0],
                });

                // TODO : 추후 getRoomDetail로 수정해야 함
                if (otherMember) {
                    return "이미 있음";
                }
            }
        }
    }

    // 채팅방 생성
    const room = await RoomModel.create({
        type: data.type,
        name: data.type === "group" ? data.name : undefined,
        created_by: userId,
    });

    // room_members 생성 (본인 + 멤버들)
    const allMemberIds = [userId, ...data.memberIds];
    const memberDocs = allMemberIds.map((memberId) => ({
        room_id: room._id,
        user_id: memberId,
        last_read_at: new Date(),
        is_favorite: false,
    }));
    await RoomMemberModel.insertMany(memberDocs);

    // TODO: getRoomDetail로 교체 예정
    return {
        roomId: room._id.toString(),
        type: room.type,
        name: room.name || null,
        memberCount: allMemberIds.length,
        lastMessage: null,
    };
};
