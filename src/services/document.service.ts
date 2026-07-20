import { DocumentModel } from "../models/document.model";
import { MessageModel } from "../models/message.model";
import { RoomMemberModel } from "../models/room-member.model";
import { RoomModel } from "../models/room.model";
import { UserModel } from "../models/user.model";
import { CreateDocumentDto } from "../schemas/document.schema";

// 문서 생성
export const createDocument = async (
    userId: string,
    data: CreateDocumentDto,
) => {
    // 채팅방 멤버인지 확인
    const membership = await RoomMemberModel.findOne({
        room_id: data.roomId,
        user_id: userId,
    });

    if (!membership)
        throw { statusCode: 403, message: "이 채팅방의 멤버가 아닙니다." };

    // 채팅방 멤버 전원을 collaborators로
    const members = await RoomMemberModel.find({ room_id: data.roomId });
    const collaboratorIds = members.map((m) => m.user_id);

    // 문서 생성
    const document = await DocumentModel.create({
        title: data.title,
        type: "document",
        room_id: data.roomId,
        created_by: userId,
        collaborators: collaboratorIds,
    });

    // 채팅방에 문서 메세지 자동 생성
    await MessageModel.create({
        room_id: data.roomId,
        sender_id: userId,
        type: "document",
        document_id: document._id,
    });

    // TODO: getDocumentDetail로 교체 예정
    return {
        documentId: document._id.toString(),
        title: document.title,
        type: document.type,
        roomId: document.room_id.toString(),
        content: null,
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
    const filter: any = {
        collaborators: userId,
    };

    if (roomId) filter.room_id = roomId;
    if (type) filter.type = type;

    const documents = await DocumentModel.find(filter).sort({ updated_at: -1 });

    const result = [];
    for (const doc of documents) {
        const room = await RoomModel.findById(doc.room_id);
        const createdByUser = await UserModel.findById(doc.created_by);

        result.push({
            documentId: doc._id.toString(),
            title: doc.title,
            type: doc.type,
            roomId: doc.room_id.toString(),
            roomName: room?.name || null,
            createdBy: {
                userId: createdByUser?._id.toString(),
                name: createdByUser?.name,
            },
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
        });
    }

    return { documents: result, total: result.length };
};
