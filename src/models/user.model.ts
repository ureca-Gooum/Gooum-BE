import { Schema, model, Document } from "mongoose";

interface IPresence {
    status: "online" | "away" | "busy" | "offline";
    last_seen_at?: Date;
    // 프로필에서 명시적으로 고른 상태만 저장 (재접속 시 복원 기준, status와 달리 자동으로는 안 바뀜)
    manual_status?: "online" | "away" | "busy" | "offline";
}

interface INotificationSettings {
    message: boolean;
    mention: boolean;
}

interface ITheme {
    mode: "light" | "dark";
}

export interface IUser extends Document {
    name: string;
    kakao_id: string;
    status_message?: string;
    profile_image_url?: string;
    presence: IPresence;
    notification_settings: INotificationSettings;
    theme: ITheme;
    refresh_token?: string;
    created_at: Date;
    updated_at: Date;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        kakao_id: { type: String, required: true, unique: true },
        status_message: { type: String, default: undefined },
        profile_image_url: { type: String, default: undefined },
        presence: {
            status: {
                type: String,
                enum: ["online", "away", "offline", "busy"],
                default: "offline",
            },
            last_seen_at: { type: Date, default: undefined },
            manual_status: {
                type: String,
                enum: ["online", "away", "offline", "busy"],
                default: undefined,
            },
        },
        notification_settings: {
            message: { type: Boolean, default: true },
            mention: { type: Boolean, default: true },
        },
        theme: {
            mode: { type: String, enum: ["light", "dark"], default: "light" },
        },
        refresh_token: { type: String, default: undefined },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
        versionKey: false,
    },
);

export const UserModel = model<IUser>("User", userSchema);