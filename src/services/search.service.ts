import { UserModel } from "../models/user.model";
import { RoomModel } from "../models/room.model";
import { RoomMemberModel } from "../models/room-member.model";
import { MessageModel } from "../models/message.model";
import { DocumentModel } from "../models/document.model";

export const search = async (
    userId: string,
    query: string,
    roomId?: string,
    limit: number = 10,
) => {
    const result = {
        users: [] as any[],
        rooms: [] as any[],
        messages: [] as any[],
        documents: [] as any[],
    };

    // 특수문자 정규식 이스케이프 처리 (ReDoS 공격 및 에러 방지)
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(safeQuery, "i");

    // 1. 내가 속한 방 ID 목록 최상단 1회 조회 & 권한 검증
    const myMemberships = await RoomMemberModel.find({
        user_id: userId,
    }).lean();
    const myRoomIds = myMemberships.map((m) => m.room_id);

    if (roomId) {
        const isMember = myRoomIds.some((id) => id.toString() === roomId);
        if (!isMember) {
            throw { statusCode: 403, message: "이 채팅방의 멤버가 아닙니다." };
        }
    }

    const searchRoomIds = roomId ? [roomId] : myRoomIds;

    // 2. 각 영역별 검색 Promise 정의 (병렬 실행 준비)

    // [유저 검색] - 전체 검색일 때만
    const usersPromise = !roomId
        ? UserModel.find({
              _id: { $ne: userId },
              name: searchRegex,
          })
              .limit(limit)
              .lean()
        : Promise.resolve([]);

    // [채팅방 검색] - 전체 검색일 때만 (방 제목 OR 포함된 멤버 이름으로 검색)
    const roomsPromise = (async () => {
        if (roomId) return [];

        // 1) 이름에 검색어가 들어간 타인 유저 ID 수집
        const matchedUsers = await UserModel.find({
            _id: { $ne: userId },
            name: searchRegex,
        })
            .select("_id")
            .lean();

        const matchedUserIds = matchedUsers.map((u) => u._id);

        // 2) 그 유저들이 속해 있으면서 + 나도 속해 있는 방 ID 수집
        const memberRooms =
            matchedUserIds.length > 0
                ? await RoomMemberModel.find({
                      user_id: { $in: matchedUserIds },
                      room_id: { $in: myRoomIds },
                  })
                      .select("room_id")
                      .lean()
                : [];

        const roomIdsByMember = memberRooms.map((m) => m.room_id);

        // 3) [방 제목 일치] OR [멤버 이름 일치] 조건으로 내 방 최종 조회
        return RoomModel.find({
            _id: { $in: myRoomIds },
            $or: [{ name: searchRegex }, { _id: { $in: roomIdsByMember } }],
        })
            .limit(limit)
            .lean();
    })();

    // [메시지 검색]
    const messagesPromise = MessageModel.find({
        room_id: { $in: searchRoomIds },
        is_deleted: false,
        type: "text",
        "content.content.content.text": searchRegex,
    })
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

    // [문서 검색]
    const documentsPromise = DocumentModel.find({
        collaborators: userId,
        title: searchRegex,
        ...(roomId ? { room_id: roomId } : {}),
    })
        .sort({ updated_at: -1 })
        .limit(limit)
        .lean();

    // 3. 메인 검색 쿼리 병렬 동시 실행
    const [users, rooms, messages, documents] = await Promise.all([
        usersPromise,
        roomsPromise,
        messagesPromise,
        documentsPromise,
    ]);

    // 4. 부가 정보(방 이름, 작성자 정보, 방 멤버 수) Batch 조회를 위한 ID 수집
    const roomIdsToFetch = new Set<string>();
    const userIdsToFetch = new Set<string>();

    rooms.forEach((r) => roomIdsToFetch.add(r._id.toString()));
    messages.forEach((m) => {
        if (m.room_id) roomIdsToFetch.add(m.room_id.toString());
        if (m.sender_id) userIdsToFetch.add(m.sender_id.toString());
    });
    documents.forEach((d) => {
        if (d.room_id) roomIdsToFetch.add(d.room_id.toString());
    });

    // 부가 정보 병렬 조회 (N+1 쿼리 해결)
    const [memberCounts, fetchedRooms, fetchedUsers] = await Promise.all([
        rooms.length > 0
            ? RoomMemberModel.aggregate([
                  { $match: { room_id: { $in: rooms.map((r) => r._id) } } },
                  { $group: { _id: "$room_id", count: { $sum: 1 } } },
              ])
            : [],
        roomIdsToFetch.size > 0
            ? RoomModel.find({
                  _id: { $in: Array.from(roomIdsToFetch) },
              }).lean()
            : [],
        userIdsToFetch.size > 0
            ? UserModel.find({
                  _id: { $in: Array.from(userIdsToFetch) },
              }).lean()
            : [],
    ]);

    // 빠른 조회(O(1))를 위한 Map 변환
    const memberCountMap = new Map(
        memberCounts.map((m) => [m._id.toString(), m.count]),
    );
    const roomMap = new Map(
        fetchedRooms.map((r) => [r._id.toString(), r.name]),
    );
    const userMap = new Map(
        fetchedUsers.map((u) => [u._id.toString(), u.name]),
    );

    // 5. 최종 응답 데이터 포맷팅
    result.users = users.map((u) => ({
        userId: u._id.toString(),
        name: u.name,
        profileImageUrl: u.profile_image_url || null,
        presence: { status: u.presence?.status || "offline" },
    }));

    result.rooms = rooms.map((r) => ({
        roomId: r._id.toString(),
        type: r.type,
        name: r.name || null,
        memberCount: memberCountMap.get(r._id.toString()) || 0,
    }));

    // 에디터 JSON에서 텍스트 추출 함수
    const extractText = (node: any): string => {
        if (!node) return "";
        if (node.text) return node.text;
        if (Array.isArray(node.content))
            return node.content.map(extractText).join("");
        return "";
    };

    result.messages = messages.map((msg) => ({
        messageId: msg._id.toString(),
        roomId: msg.room_id.toString(),
        roomName: roomMap.get(msg.room_id.toString()) || null,
        sender: {
            userId: msg.sender_id?.toString(),
            name: userMap.get(msg.sender_id?.toString()) || "알 수 없음",
        },
        content: extractText(msg.content).slice(0, 100),
        createdAt: msg.created_at,
    }));

    result.documents = documents.map((doc) => ({
        documentId: doc._id.toString(),
        title: doc.title,
        roomId: doc.room_id?.toString() || null,
        roomName: doc.room_id
            ? roomMap.get(doc.room_id.toString()) || null
            : null,
        createdAt: doc.created_at,
    }));

    return result;
};
