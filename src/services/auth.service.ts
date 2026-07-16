import jwt from "jsonwebtoken";
import { UserModel, IUser } from "../models/user.model";
import { env } from "../core/config/env";

interface LoginResult {
    accessToken: string;
    refreshToken: string;
    userId: string;
    name: string;
    theme: string;
    isNewUser: boolean;
}

// kakao_id로 유저 찾거나 새로 생성
export const findOrCreateUser = async (
    kakaoId: string,
    name: string,
    profileImageUrl?: string,
): Promise<{ user: IUser; isNewUser: boolean }> => {
    const existingUser = await UserModel.findOne({ kakao_id: kakaoId });
    if (existingUser) {
        return { user: existingUser, isNewUser: false };
    }

    const newUser = await UserModel.create({
        kakao_id: kakaoId,
        name,
        profile_image_url: profileImageUrl || undefined,
        presence: { status: "online" },
    });

    return { user: newUser, isNewUser: true };
};

// JWT 발급 + refreshToken 저장
export const generateTokens = async (user: IUser): Promise<LoginResult> => {
    const accessToken = jwt.sign(
        { userId: user._id },
        env.JWT_SECRET_KEY,
        { expiresIn: Number(env.ACCESS_TOKEN_EXPIRE_MINUTES) * 60 }, // 초 단위
    );

    const refreshToken = jwt.sign(
        { userId: user._id },
        env.JWT_SECRET_KEY,
        { expiresIn: Number(env.REFRESH_TOKEN_EXPIRE_DAYS) * 24 * 60 * 60 }, // 초 단위
    );

    // refreshToken을 DB에 저장
    user.refresh_token = refreshToken;
    await user.save();

    return {
        accessToken,
        refreshToken,
        userId: user._id.toString(),
        name: user.name,
        theme: user.theme?.mode || "light",
        isNewUser: false, // 호출하는 쪽에서 덮어씀
    };
};

// 로그아웃 시 refreshToken 제거
export const removeRefreshToken = async (userId: string) => {
    await UserModel.findByIdAndUpdate(userId, { refresh_token: null });
};
