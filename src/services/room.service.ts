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
    // 1. 내 멤버십 목록 조회 (.lean() 사용)
    const myMemberships = await RoomMemberModel.find({
        user_id: userId,
    }).lean();
    if (myMemberships.length === 0) return { rooms: [], total: 0 };

    const roomIds = myMemberships.map((m) => m.room_id);
    const membershipMap = new Map(
        myMemberships.map((m) => [m.room_id.toString(), m]),
    );

    // 2. 관련 데이터 병렬 일괄 조회 (In-Memory 병합)
    const [rooms, allMembers] = await Promise.all([
        RoomModel.find({ _id: { $in: roomIds } }).lean(),
        RoomMemberModel.find({ room_id: { $in: roomIds } }).lean(),
    ]);

    // 3. 전체 관련 유저 ID 수집 및 일괄 조회
    const allUserIds = Array.from(
        new Set(allMembers.map((m) => m.user_id.toString())),
    );
    const users = await UserModel.find({ _id: { $in: allUserIds } }).lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // 4. 채팅방별 멤버 매핑
    const roomMembersMap = new Map<string, typeof allMembers>();
    for (const member of allMembers) {
        const rId = member.room_id.toString();
        if (!roomMembersMap.has(rId)) roomMembersMap.set(rId, []);
        roomMembersMap.get(rId)!.push(member);
    }

    // 5. 각 방별 데이터 조립 및 안 읽은 메시지 수 병렬 처리
    const roomPromises = rooms.map(async (room) => {
        const roomIdStr = room._id.toString();
        const membership = membershipMap.get(roomIdStr)!;
        const roomMembers = roomMembersMap.get(roomIdStr) || [];

        // 멤버 유저 정보 구성
        const otherMembers = roomMembers
            .map((m) => userMap.get(m.user_id.toString()))
            .filter(
                (u): u is NonNullable<typeof u> =>
                    Boolean(u) && u!._id.toString() !== userId,
            )
            .map((u) => {
                const memberInfo: any = {
                    userId: u._id.toString(),
                    name: u.name,
                    profileImageUrl: u.profile_image_url || null,
                };
                if (room.type === "direct") {
                    memberInfo.presence = {
                        status: u.presence?.status || "offline",
                    };
                }
                return memberInfo;
            });

        // 안 읽은 메시지 수
        const unreadCount = await MessageModel.countDocuments({
            room_id: room._id,
            created_at: { $gt: membership.last_read_at },
        });

        return {
            roomId: roomIdStr,
            type: room.type,
            name: room.name || null,
            members: otherMembers,
            memberCount: roomMembers.length,
            lastMessage: room.last_message
                ? {
                      content: room.last_message.content,
                      sentAt: room.last_message.sent_at,
                  }
                : null,
            unreadCount,
            isFavorite: membership.is_favorite,
        };
    });

    const resultRooms = await Promise.all(roomPromises);

    resultRooms.sort((a, b) => {
        const aTime = a.lastMessage?.sentAt
            ? new Date(a.lastMessage.sentAt).getTime()
            : 0;
        const bTime = b.lastMessage?.sentAt
            ? new Date(b.lastMessage.sentAt).getTime()
            : 0;
        return bTime - aTime;
    });

    return { rooms: resultRooms, total: resultRooms.length };
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

// 채팅방 나가기
export const leaveRoom = async (roomId: string, userId: string) => {
    const membership = await RoomMemberModel.findOne({
        room_id: roomId,
        user_id: userId,
    });
    if (!membership)
        throw { statusCode: 404, message: "채팅방을 찾을 수 없어요." };

    await RoomMemberModel.deleteOne({ room_id: roomId, user_id: userId });

    // 남은 멤버 확인
    const remaining = await RoomMemberModel.countDocuments({ room_id: roomId });
    if (remaining === 0) {
        await RoomModel.findByIdAndDelete(roomId);
        await MessageModel.deleteMany({ room_id: roomId });
    }
};

// 즐겨찾기 토글
export const toggleFavorite = async (
    roomId: string,
    userId: string,
    isFavorite: boolean,
) => {
    const membership = await RoomMemberModel.findOne({
        room_id: roomId,
        user_id: userId,
    });
    if (!membership)
        throw { statusCode: 404, message: "채팅방을 찾을 수 없어요." };

    membership.is_favorite = isFavorite;
    await membership.save();

    return await getRoomDetail(roomId, userId);
};

// 멤버 초대
export const addMembers = async (
    roomId: string,
    userId: string,
    memberIds: string[],
) => {
    const room = await RoomModel.findById(roomId);
    if (!room) throw { statusCode: 404, message: "채팅방을 찾을 수 없어요." };

    if (room.type === "direct") {
        throw {
            statusCode: 400,
            message: "1:1 채팅방에는 멤버를 추가할 수 없어요.",
        };
    }

    const membership = await RoomMemberModel.findOne({
        room_id: roomId,
        user_id: userId,
    });
    if (!membership)
        throw { statusCode: 403, message: "이 채팅방의 멤버가 아닙니다." };

    // 이미 멤버인 유저 필터링
    const existingMembers = await RoomMemberModel.find({
        room_id: roomId,
        user_id: { $in: memberIds },
    });
    const existingIds = existingMembers.map((m) => m.user_id.toString());
    const newMemberIds = memberIds.filter((id) => !existingIds.includes(id));

    if (newMemberIds.length === 0) {
        return { message: "이미 모든 멤버가 참여 중이에요.", addedCount: 0 };
    }

    const memberDocs = newMemberIds.map((memberId) => ({
        room_id: roomId,
        user_id: memberId,
        last_read_at: new Date(),
        is_favorite: false,
    }));
    await RoomMemberModel.insertMany(memberDocs);

    return { message: "멤버를 초대했어요.", addedCount: newMemberIds.length };
};

// 채팅방 이름 수정
export const updateRoom = async (
    roomId: string,
    userId: string,
    name: string,
) => {
    const membership = await RoomMemberModel.findOne({
        room_id: roomId,
        user_id: userId,
    });
    if (!membership)
        throw { statusCode: 403, message: "이 채팅방의 멤버가 아닙니다." };

    const room = await RoomModel.findById(roomId);
    if (!room) throw { statusCode: 404, message: "채팅방을 찾을 수 없어요." };

    if (room.type === "direct") {
        throw {
            statusCode: 400,
            message: "1:1 채팅방은 이름을 변경할 수 없어요.",
        };
    }

    room.name = name;
    await room.save();

    return await getRoomDetail(roomId, userId);
};
