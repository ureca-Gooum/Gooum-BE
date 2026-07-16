import { Schema, model, Document } from "mongoose";

interface IPresence {
    status: "online" | "away" | "offline";
    last_seen_at?: Date;
}

interface INotificationSettings {
    message: boolean;
    mention: boolean;
    channel: boolean;
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
    notification_settings?: INotificationSettings;
    theme?: ITheme;
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
                enum: ["online", "away", "offline"],
                default: "offline",
            },
            last_seen_at: { type: Date, default: undefined },
        },
        notification_settings: {
            message: { type: Boolean, default: true },
            mention: { type: Boolean, default: true },
            channel: { type: Boolean, default: true },
        },
        theme: {
            mode: { type: String, enum: ["light", "dark"], default: "light" },
        },
        refresh_token: { type: String, default: null },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
        versionKey: false,
    },
);

export const UserModel = model<IUser>("User", userSchema);
