import { Schema, model, Document, Types } from "mongoose";

export interface INotification extends Document {
    user_id: Types.ObjectId;
    type: "message" | "mention" | "document";
    title: string;
    body?: string;
    room_id: Types.ObjectId;
    message_id?: Types.ObjectId; 
    is_read: boolean;
    created_at: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        type: {
            type: String,
            enum: ["message", "mention", "document"],
            required: true,
        },
        title: { type: String, required: true },
        body: { type: String, default: undefined },
        room_id: {
            type: Schema.Types.ObjectId,
            ref: "Room",
            default: undefined,
        },
        message_id: { type: Schema.Types.ObjectId, ref: "Message", default: undefined },
        is_read: { type: Boolean, default: false },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
        versionKey: false,
    },
);

// 유저별 알림 조회 성능을 위한 인덱스
notificationSchema.index({ user_id: 1, created_at: -1 });

export const NotificationModel = model<INotification>(
    "Notification",
    notificationSchema,
);
