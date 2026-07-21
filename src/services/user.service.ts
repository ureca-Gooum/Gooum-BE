import { UserModel, IUser } from "../models/user.model";

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
