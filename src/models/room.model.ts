import { Schema, model, Document, Types } from "mongoose";

interface ILastMessage {
    content: string;
    sender_id: Types.ObjectId;
    sent_at: Date;
}

export interface IRoom extends Document {
    type: "direct" | "group";
    name?: string;
    created_by: Types.ObjectId;
    last_message?: ILastMessage;
    created_at: Date;
    updated_at: Date;
}

const roomSchema = new Schema<IRoom>(
    {
        type: { type: String, enum: ["direct", "group"], required: true },
        name: { type: String, default: undefined },
        created_by: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        last_message: {
            content: { type: String },
            sender_id: { type: Schema.Types.ObjectId, ref: "User" },
            sent_at: { type: Date },
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
        versionKey: false,
    },
);

export const RoomModel = model<IRoom>("Room", roomSchema);
