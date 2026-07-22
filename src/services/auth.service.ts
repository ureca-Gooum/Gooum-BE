import { UserModel, IUser } from "../models/user.model";
import {
    createAccessToken,
    createRefreshToken,
    verifyToken,
} from "../core/security/jwt";
import { getKakaoToken, getKakaoUserInfo } from "./kakao.service";

interface LoginResult {
    accessToken: string;
    refreshToken: string;
    userId: string;
    name: string;
    theme: string;
    profileImageUrl: string | null;
    isNewUser: boolean;
}

export const login = async (code: string): Promise<LoginResult> => {
    const kakaoAccessToken = await getKakaoToken(code);

    const kakaoUser = await getKakaoUserInfo(kakaoAccessToken);
    const kakaoId = kakaoUser.id.toString();
    const name = kakaoUser.kakao_account?.profile?.nickname || "사용자";

    const { user, isNewUser } = await findOrCreateUser(kakaoId, name);

    const accessToken = createAccessToken({ userId: user._id });
    const refreshToken = createRefreshToken({ userId: user._id });

    user.refresh_token = refreshToken;
    await user.save();

    return {
        accessToken,
        refreshToken,
        userId: user._id.toString(),
        name: user.name,
        theme: user.theme?.mode || "light",
        profileImageUrl: user.profile_image_url || null,
        isNewUser,
    };
};

const findOrCreateUser = async (
    kakaoId: string,
    name: string,
): Promise<{ user: IUser; isNewUser: boolean }> => {
    const existingUser = await UserModel.findOne({ kakao_id: kakaoId });

    if (existingUser) {
        return { user: existingUser, isNewUser: false };
    }

    const newUser = await UserModel.create({
        kakao_id: kakaoId,
        name,
        presence: { status: "online" },
    });

    return { user: newUser, isNewUser: true };
};

export const removeRefreshToken = async (userId: string) => {
    await UserModel.findByIdAndUpdate(userId, { refresh_token: null });
};

// 토큰 재발급
export const refresh = async (oldRefreshToken: string) => {
    // 1. refreshToken 검증
    const payload = verifyToken(oldRefreshToken);

    if (payload.type !== "refresh") {
        throw { statusCode: 401, message: "유효하지 않은 토큰이에요." };
    }

    // 2. 유저 조회 + DB의 refreshToken과 일치하는지 확인
    const user = await UserModel.findById(payload.userId);

    if (!user || user.refresh_token !== oldRefreshToken) {
        throw { statusCode: 401, message: "유효하지 않은 토큰이에요." };
    }

    // 3. 새 토큰 발급
    const accessToken = createAccessToken({ userId: user._id });
    const refreshToken = createRefreshToken({ userId: user._id });

    // 4. DB에 새 refreshToken 저장
    user.refresh_token = refreshToken;
    await user.save();

    return { accessToken, refreshToken };
};
