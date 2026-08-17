import { UserModel, IUser } from "../models/user.model";
import { UpdateUserDto } from "../schemas/user.schema";

// 내 프로필 응답 (전체 정보)
const toMyProfileResponse = (user: IUser) => ({
    userId: user._id.toString(),
    name: user.name,
    statusMessage: user.status_message || null,
    profileImageUrl: user.profile_image_url || null,
    presence: {
        status: user.presence?.status || "offline",
        lastSeenAt: user.presence?.last_seen_at || null,
        manualStatus: user.presence?.manual_status || null,
    },
    notificationSettings: {
        message: user.notification_settings?.message ?? true,
        mention: user.notification_settings?.mention ?? true,
    },
    theme: {
        mode: user.theme?.mode || "light",
    },
    createdAt: user.created_at,
    updatedAt: user.updated_at,
});

// 공개 프로필 응답 (개인 설정 제외)
const toPublicProfileResponse = (user: IUser) => ({
    userId: user._id.toString(),
    name: user.name,
    statusMessage: user.status_message || null,
    profileImageUrl: user.profile_image_url || null,
    presence: {
        status: user.presence?.status || "offline",
        lastSeenAt: user.presence?.last_seen_at || null,
    },
});

// 내 프로필 조회
export const getMe = async (userId: string) => {
    const user = await UserModel.findById(userId);
    if (!user) throw { statusCode: 404, message: "유저를 찾을 수 없어요." };
    return toMyProfileResponse(user);
};

// 내 프로필 수정
export const updateMe = async (userId: string, data: UpdateUserDto) => {
    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.statusMessage !== undefined)
        updateData.status_message = data.statusMessage;
    if (data.profileImageUrl !== undefined)
        updateData.profile_image_url = data.profileImageUrl;
    if (data.theme) updateData.theme = data.theme;
    if (data.notificationSettings)
        updateData.notification_settings = data.notificationSettings;
    if (data.presence) {
        updateData["presence.status"] = data.presence.status;
        // 프로필에서 명시적으로 고른 값이므로 자동 복원 기준(manual_status)에도 같이 반영
        updateData["presence.manual_status"] = data.presence.status;
        updateData["presence.last_seen_at"] = new Date();
    }

    const user = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true },
    );
    if (!user) throw { statusCode: 404, message: "유저를 찾을 수 없어요." };
    return toMyProfileResponse(user);
};

// 유저 목록 조회
export const getUsers = async (userId: string, search?: string) => {
    const filter: any = {
        _id: { $ne: userId }, // 본인 제외
    };

    if (search) {
        filter.name = { $regex: search, $options: "i" };
    }

    const users = await UserModel.find(filter).sort({ name: 1 });
    return {
        users: users.map(toPublicProfileResponse),
        total: users.length,
    };
};

// 특정 유저 조회
export const getUserById = async (userId: string) => {
    const user = await UserModel.findById(userId);
    if (!user) throw { statusCode: 404, message: "유저를 찾을 수 없어요." };
    return toPublicProfileResponse(user);
};

// presence 상태 변경 - 소켓 연결/해제/updatePresence에서 사용
export const setPresence = async (
    userId: string,
    status: "online" | "away" | "busy" | "offline",
) => {
    const now = new Date();
    await UserModel.findByIdAndUpdate(userId, {
        "presence.status": status,
        "presence.last_seen_at": now,
    });
    return now;
};

// 현재 presence 상태만 조회 - 소켓 연결 시 오프라인→온라인 전환 판단에 사용
export const getPresenceStatus = async (userId: string) => {
    const user = await UserModel.findById(userId).select("presence").lean();
    return user?.presence?.status || "online";
};

// 이름만 조회 - 소켓 typing 이벤트에서 사용
export const getUserName = async (userId: string) => {
    const user = await UserModel.findById(userId).select("name").lean();
    return user?.name || "알 수 없음";
};