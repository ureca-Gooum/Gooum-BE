import { DocumentModel } from "../models/document.model";
import { MessageModel } from "../models/message.model";
import { RoomMemberModel } from "../models/room-member.model";
import { RoomModel } from "../models/room.model";
import { UserModel } from "../models/user.model";
import {
    CreateDocumentDto,
    UpdateDocumentDto,
} from "../schemas/document.schema";

// 문서 생성
export const createDocument = async (
    userId: string,
    data: CreateDocumentDto,
) => {
    // 채팅방 멤버인지 확인
    const membership = await RoomMemberModel.findOne({
        room_id: data.roomId,
        user_id: userId,
    }).lean();

    if (!membership)
        throw { statusCode: 403, message: "이 채팅방의 멤버가 아닙니다." };

    // 채팅방 멤버 전원을 collaborators로
    const members = await RoomMemberModel.find({ room_id: data.roomId }).lean();
    const collaboratorIds = members.map((m) => m.user_id);

    // 문서 생성
    const document = await DocumentModel.create({
        title: data.title,
        type: "document",
        room_id: data.roomId,
        created_by: userId,
        collaborators: collaboratorIds,
    });

    // 채팅방에 문서 메시지 자동 생성
    await MessageModel.create({
        room_id: data.roomId,
        sender_id: userId,
        type: "document",
        document_id: document._id,
    });

    return await getDocumentDetail(document._id.toString(), userId);
};

// 문서 목록 조회 (N+1 쿼리 해결 및 .lean() 적용)
export const getDocuments = async (
    userId: string,
    roomId?: string,
    type?: string,
) => {
    const filter: any = { collaborators: userId };
    if (roomId) filter.room_id = roomId;
    if (type) filter.type = type;

    // 1. 조건에 맞는 문서 일괄 조회 (.lean() 사용)
    const documents = await DocumentModel.find(filter)
        .sort({ updated_at: -1 })
        .lean();

    if (documents.length === 0) return { documents: [], total: 0 };

    // 2. 중복 없는 Room 및 User ID 수집
    const roomIds = Array.from(
        new Set(documents.map((d) => d.room_id.toString())),
    );
    const createdByUserIds = Array.from(
        new Set(documents.map((d) => d.created_by.toString())),
    );

    // 3. 단 2번의 병렬 쿼리로 관련 Room, User 일괄 조회
    const [rooms, users] = await Promise.all([
        RoomModel.find({ _id: { $in: roomIds } }).lean(),
        UserModel.find({ _id: { $in: createdByUserIds } }).lean(),
    ]);

    const roomMap = new Map(rooms.map((r) => [r._id.toString(), r]));
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // 4. In-Memory에서 빠르게 데이터 조합
    const result = documents.map((doc) => {
        const room = roomMap.get(doc.room_id.toString());
        const createdByUser = userMap.get(doc.created_by.toString());

        return {
            documentId: doc._id.toString(),
            title: doc.title,
            type: doc.type,
            roomId: doc.room_id.toString(),
            roomName: room?.name || null,
            createdBy: {
                userId:
                    createdByUser?._id.toString() || doc.created_by.toString(),
                name: createdByUser?.name || "알 수 없음",
            },
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
        };
    });

    return { documents: result, total: result.length };
};

// 문서 상세 조회
export const getDocumentDetail = async (documentId: string, userId: string) => {
    const document = await DocumentModel.findById(documentId).lean();
    if (!document) throw { statusCode: 404, message: "문서를 찾을 수 없어요." };

    // collaborators 접근 권한 확인
    const isCollaborator = document.collaborators.some(
        (id) => id.toString() === userId,
    );
    if (!isCollaborator)
        throw { statusCode: 403, message: "이 문서에 접근 권한이 없어요." };

    // collaborators 전체 조회 (작성자도 포함되어 있으므로 추가 DB 조회 제거)
    const collaboratorUsers = await UserModel.find({
        _id: { $in: document.collaborators },
    }).lean();

    const userMap = new Map(
        collaboratorUsers.map((u) => [u._id.toString(), u]),
    );
    const createdByUser = userMap.get(document.created_by.toString());

    return {
        documentId: document._id.toString(),
        title: document.title,
        type: document.type,
        roomId: document.room_id.toString(),
        content: document.content || null,
        collaborators: collaboratorUsers.map((u) => ({
            userId: u._id.toString(),
            name: u.name,
        })),
        createdBy: {
            userId:
                createdByUser?._id.toString() || document.created_by.toString(),
            name: createdByUser?.name || "알 수 없음",
        },
        createdAt: document.created_at,
        updatedAt: document.updated_at,
    };
};

// 문서 저장 (자동 저장)
export const updateDocument = async (
    documentId: string,
    userId: string,
    data: UpdateDocumentDto,
) => {
    const document = await DocumentModel.findById(documentId);
    if (!document) throw { statusCode: 404, message: "문서를 찾을 수 없어요." };

    const isCollaborator = document.collaborators.some(
        (id) => id.toString() === userId,
    );
    if (!isCollaborator)
        throw { statusCode: 403, message: "이 문서에 접근 권한이 없어요." };

    if (data.title) document.title = data.title;
    if (data.content) document.content = data.content;
    await document.save();

    return {
        documentId: document._id.toString(),
        title: document.title,
        updatedAt: document.updated_at,
    };
};

// 문서 삭제 (비동기 병렬 처리)
export const deleteDocument = async (documentId: string, userId: string) => {
    const document = await DocumentModel.findById(documentId).lean();
    if (!document) throw { statusCode: 404, message: "문서를 찾을 수 없어요." };

    if (document.created_by.toString() !== userId) {
        throw { statusCode: 403, message: "문서 생성자만 삭제할 수 있어요." };
    }

    // 문서 삭제와 관련 메시지 처리를 동시 실행
    await Promise.all([
        DocumentModel.findByIdAndDelete(documentId),
        MessageModel.updateMany(
            { document_id: documentId },
            { is_deleted: true, content: null },
        ),
    ]);
};
