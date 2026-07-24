import { DocumentModel } from "../models/document.model";
import { RoomMemberModel } from "../models/room-member.model";
import { MessageModel } from "../models/message.model";
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
    let collaboratorIds = [userId];

    // 1. 채팅방 기반 문서일 경우 멤버십 확인 및 collaborators 수집
    if (data.roomId) {
        const members = await RoomMemberModel.find({ room_id: data.roomId })
            .select("user_id")
            .lean();

        const isMember = members.some((m) => m.user_id.toString() === userId);
        if (!isMember) {
            throw { statusCode: 403, message: "이 채팅방의 멤버가 아닙니다." };
        }

        collaboratorIds = members.map((m) => m.user_id.toString());
    }

    // 2. 문서 생성
    const createTasks: Promise<any>[] = [
        DocumentModel.create({
            title: data.title,
            type: data.type || "document",
            room_id: data.roomId || undefined,
            created_by: userId,
            collaborators: collaboratorIds,
        }),
    ];

    const [document] = await Promise.all(createTasks);

    // 3. 다시 getDocumentDetail 전체를 호출하는 대신 필요한 연관 정보만 병렬로 빠르게 수집
    const [collaboratorUsers, createdByUser] = await Promise.all([
        UserModel.find({ _id: { $in: collaboratorIds } })
            .select("name")
            .lean(),
        UserModel.findById(userId).select("name").lean(),
    ]);

    return {
        documentId: document._id.toString(),
        title: document.title,
        type: document.type,
        roomId: document.room_id?.toString() || null,
        content: document.content || null,
        collaborators: collaboratorUsers.map((u) => ({
            userId: u._id.toString(),
            name: u.name,
        })),
        createdBy: {
            userId: createdByUser?._id.toString() || userId,
            name: createdByUser?.name,
        },
        createdAt: document.created_at,
        updatedAt: document.updated_at,
    };
};

// 문서 목록 조회
export const getDocuments = async (
    userId: string,
    roomId?: string,
    type?: string,
) => {
    let filter: any;

    if (roomId) {
        // 특정 채팅방 문서만
        filter = { room_id: roomId, collaborators: userId };
    } else {
        // 내가 볼 수 있는 모든 문서 (개인 문서 + 참여 중인 문서)
        filter = { collaborators: userId };
    }

    if (type) filter.type = type;

    // populate + lean()을 통해 N+1 문제 해결 및 속도 최적화
    const documents = await DocumentModel.find(filter)
        .populate<{
            room_id: { _id: any; name: string } | null;
        }>("room_id", "name")
        .populate<{
            created_by: { _id: any; name: string } | null;
        }>("created_by", "name")
        .sort({ updated_at: -1 })
        .lean();

    const result = documents.map((doc: any) => ({
        documentId: doc._id.toString(),
        title: doc.title,
        type: doc.type,
        roomId: doc.room_id?._id?.toString() || null,
        roomName: doc.room_id?.name || null,
        createdBy: {
            userId: doc.created_by?._id?.toString() || null,
            name: doc.created_by?.name || null,
        },
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
    }));

    return { documents: result, total: result.length };
};

// 문서 상세 조회
export const getDocumentDetail = async (documentId: string, userId: string) => {
    const document = await DocumentModel.findById(documentId).lean();
    if (!document) throw { statusCode: 404, message: "문서를 찾을 수 없어요." };

    const isCollaborator = document.collaborators.some(
        (id: any) => id.toString() === userId,
    );
    if (!isCollaborator)
        throw { statusCode: 403, message: "이 문서에 접근 권한이 없어요." };

    // 협력자 목록과 생성자 정보를 Promise.all로 병렬 조회
    const [collaboratorUsers, createdByUser] = await Promise.all([
        UserModel.find({ _id: { $in: document.collaborators } })
            .select("name")
            .lean(),
        UserModel.findById(document.created_by).select("name").lean(),
    ]);

    return {
        documentId: document._id.toString(),
        title: document.title,
        type: document.type,
        roomId: document.room_id?.toString() || null,
        content: document.content || null,
        collaborators: collaboratorUsers.map((u) => ({
            userId: u._id.toString(),
            name: u.name,
        })),
        createdBy: {
            userId: createdByUser?._id.toString(),
            name: createdByUser?.name,
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
    // 권한 체크 후 업데이트를 한 번에 처리
    const updateData: Record<string, any> = {};
    if (data.title) updateData.title = data.title;
    if (data.content) updateData.content = data.content;

    const updatedDocument = await DocumentModel.findOneAndUpdate(
        { _id: documentId, collaborators: userId },
        { $set: updateData },
        { new: true, runValidators: true },
    )
        .select("title updated_at")
        .lean();

    if (!updatedDocument) {
        // 권한 부족 혹은 문서 없음 구분 체크
        const exists = await DocumentModel.exists({ _id: documentId });
        if (!exists)
            throw { statusCode: 404, message: "문서를 찾을 수 없어요." };
        throw { statusCode: 403, message: "이 문서에 접근 권한이 없어요." };
    }

    return {
        documentId: updatedDocument._id.toString(),
        title: updatedDocument.title,
        updatedAt: updatedDocument.updated_at,
    };
};

// 문서 삭제
export const deleteDocument = async (documentId: string, userId: string) => {
    const document = await DocumentModel.findById(documentId)
        .select("created_by")
        .lean();
    if (!document) throw { statusCode: 404, message: "문서를 찾을 수 없어요." };

    if (document.created_by.toString() !== userId) {
        throw { statusCode: 403, message: "문서 생성자만 삭제할 수 있어요." };
    }

    // 문서 삭제와 연관 메시지 처리를 병렬 실행
    await Promise.all([
        DocumentModel.findByIdAndDelete(documentId),
        MessageModel.updateMany(
            { document_id: documentId },
            { is_deleted: true, content: null },
        ),
    ]);
};
