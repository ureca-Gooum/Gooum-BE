import { DocumentModel } from "../models/document.model";
import { MessageModel } from "../models/message.model";
import { RoomMemberModel } from "../models/room-member.model";
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
