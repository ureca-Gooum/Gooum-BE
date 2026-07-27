import { Schema, model, Document, Types } from "mongoose";

export interface IRoomMember extends Document {
    room_id: Types.ObjectId;
    user_id: Types.ObjectId;
    last_read_at: Date;
    is_favorite: boolean;
    notification_settings: {
        message: boolean;
        mention: boolean;
    };
    created_at: Date;
}

const roomMemberSchema = new Schema<IRoomMember>(
    {
        room_id: { type: Schema.Types.ObjectId, ref: "Room", required: true },
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        last_read_at: { type: Date, default: Date.now },
        is_favorite: { type: Boolean, default: false },
        notification_settings: {
            message: { type: Boolean, default: true },
            mention: { type: Boolean, default: true },
        },

    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
        versionKey: false,
    },
);

// 같은 방에 같은 유저 중복 방지
roomMemberSchema.index({ room_id: 1, user_id: 1 }, { unique: true });

export const RoomMemberModel = model<IRoomMember>(
    "RoomMember",
    roomMemberSchema,
);
