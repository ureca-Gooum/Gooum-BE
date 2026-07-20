import { Schema, model, Document, Types } from "mongoose";

export interface IMessage extends Document {
    room_id: Types.ObjectId;
    sender_id: Types.ObjectId;
    content?: any;
    type: "text" | "image" | "file" | "document";
    file_url?: string;
    file_name?: string;
    document_id?: Types.ObjectId;
    is_deleted: boolean;
    created_at: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        room_id: { type: Schema.Types.ObjectId, ref: "Room", required: true },
        sender_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: Schema.Types.Mixed, default: undefined },
        type: {
            type: String,
            enum: ["text", "image", "file", "document"],
            required: true,
        },
        file_url: { type: String, default: undefined },
        file_name: { type: String, default: undefined },
        document_id: {
            type: Schema.Types.ObjectId,
            ref: "Document",
            default: undefined,
        },
        is_deleted: { type: Boolean, default: false },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
        versionKey: false,
    },
);

// 채팅방별 메세지 조회 성능을 위한 인덱스
messageSchema.index({ room_id: 1, created_at: -1 });

export const MessageModel = model<IMessage>("Message", messageSchema);
