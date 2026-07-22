import { Schema, model, Document, Types } from "mongoose";

export interface IDocument extends Document {
    title: string;
    type: "document" | "ai_summary";
    room_id: Types.ObjectId;
    created_by: Types.ObjectId;
    content?: any;
    original_messages?: Types.ObjectId[];
    collaborators: Types.ObjectId[];
    created_at: Date;
    updated_at: Date;
}

const documentSchema = new Schema<IDocument>(
    {
        title: { type: String, required: true },
        type: {
            type: String,
            enum: ["document", "ai_summary"],
            required: true,
        },
        room_id: { type: Schema.Types.ObjectId, ref: "Room", required: true },
        created_by: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: { type: Schema.Types.Mixed, default: undefined },
        original_messages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
        collaborators: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
        versionKey: false,
    },
);

// 1. 내 문서 목록 조회 최적화 (collaborators 검색 + updated_at 정렬)
documentSchema.index({ collaborators: 1, updated_at: -1 });

// 2. 특정 채팅방 내부의 문서 목록 조회 최적화 (room_id 검색)
documentSchema.index({ room_id: 1 });

export const DocumentModel = model<IDocument>("Document", documentSchema);
