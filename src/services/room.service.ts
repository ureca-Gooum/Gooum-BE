import { MessageModel } from "../models/message.model";
import { RoomMemberModel } from "../models/room-member.model";
import { RoomModel } from "../models/room.model";
import { UserModel } from "../models/user.model";
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
                    return await getRoomDetail(room._id.toString(), userId);
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

    return await getRoomDetail(room._id.toString(), userId);
};

// 내 채팅방 목록 조회
export const getMyRooms = async (userId: string) => {
    const myMemberships = await RoomMemberModel.find({ user_id: userId });

    const rooms = [];
    for (const membership of myMemberships) {
        const room = await RoomModel.findById(membership.room_id);
        if (!room) continue;

        // 멤버 정보 조회
        const members = await RoomMemberModel.find({ room_id: room._id });
        const memberUsers = await UserModel.find({
            _id: { $in: members.map((m) => m.user_id) },
        });

        // 본인 제회 멤버 목록
        const otherMembers = memberUsers
            .filter((u) => u._id.toString() !== userId)
            .map((u) => {
                const memberInfo: any = {
                    userId: u._id.toString(),
                    name: u.name,
                    profileImageUrl: u.profile_image_url || null,
                };

                // 1:1이면 상대방 프레즌스 포함
                if (room.type === "direct") {
                    memberInfo.presence = {
                        status: u.presence?.status || "offline",
                    };
                }
                return memberInfo;
            });

        // 안 읽은 메세지 수
        const unreadCount = await MessageModel.countDocuments({
            room_id: room._id,
            created_at: { $gt: membership.last_read_at },
        });

        rooms.push({
            roomId: room._id.toString(),
            type: room.type,
            name: room.name || null,
            members: otherMembers,
            memberCount: memberUsers.length,
            lastMessage: room.last_message
                ? {
                      content: room.last_message.content,
                      sentAt: room.last_message.sent_at,
                  }
                : null,
            unreadCount,
            isFavorite: membership.is_favorite,
        });
    }

    // 마지막 메세지 시각 기준 정렬
    rooms.sort((a, b) => {
        const aTime = a.lastMessage?.sentAt?.getTime() || 0;
        const bTime = a.lastMessage?.sentAt?.getTime() || 0;
        return bTime - aTime;
    });

    return { rooms, total: rooms.length };
};

// 채팅방 상세 조회
export const getRoomDetail = async (roomId: string, userId: string) => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw { statusCode: 404, message: "채팅방을 찾을 수 없어요." };

    const membership = await RoomMemberModel.findOne({
        room_id: roomId,
        user_id: userId,
    });
    if (!membership)
        throw { statusCode: 403, message: "이 채팅방의 멤버가 아닙니다." };

    const members = await RoomMemberModel.find({ room_id: roomId });
    const memberUsers = await UserModel.find({
        _id: { $in: members.map((m) => m.user_id) },
    });

    const memberList = memberUsers.map((u) => ({
        userId: u._id.toString(),
        name: u.name,
        profileImageUrl: u.profile_image_url || null,
        presence: {
            status: u.presence?.status || "offline",
            lastSeenAt: u.presence?.last_seen_at || null,
        },
    }));

    const unreadCount = await MessageModel.countDocuments({
        room_id: roomId,
        created_at: { $gt: membership.last_read_at },
    });

    return {
        roomId: room._id.toString(),
        type: room.type,
        name: room.name || null,
        members: memberList,
        memberCount: memberUsers.length,
        createdBy: room.created_by.toString(),
        lastMessage: room.last_message
            ? {
                  content: room.last_message.content,
                  sentAt: room.last_message.sent_at,
              }
            : null,
        unreadCount,
        isFavorite: membership.is_favorite,
        createdAt: room.created_at,
    };
};
