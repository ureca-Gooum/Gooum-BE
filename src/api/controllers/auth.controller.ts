import { Request, Response, NextFunction } from "express";
import { loginSchema } from "../../schemas/auth.schema";
import { getKakaoToken, getKakaoUserInfo } from "../../services/kakao.service";
import {
    findOrCreateUser,
    generateTokens,
    removeRefreshToken,
} from "../../services/auth.service";

export const loginHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        // 1. 요청 검증
        const { code } = loginSchema.parse(req.body);

        // 2. 카카오 인가 코드 → 액세스 토큰
        const kakaoAccessToken = await getKakaoToken(code);

        // 3. 카카오 유저 정보 조회
        const kakaoUser = await getKakaoUserInfo(kakaoAccessToken);
        const kakaoId = kakaoUser.id.toString();
        const name = kakaoUser.kakao_account?.profile?.nickname || "사용자";

        // 4. 유저 찾거나 생성
        const { user, isNewUser } = await findOrCreateUser(kakaoId, name);

        // 5. JWT 발급
        const tokens = await generateTokens(user);

        // 6. refreshToken을 httpOnly 쿠키로 전달
        res.cookie("refreshToken", tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge:
                Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS || 7) *
                24 *
                60 *
                60 *
                1000,
        });

        // 7. 응답
        res.status(200).json({
            accessToken: tokens.accessToken,
            userId: tokens.userId,
            name: tokens.name,
            theme: tokens.theme,
            profileImageUrl: user.profile_image_url || null,
            isNewUser,
        });
    } catch (err: any) {
        // 카카오 인증 실패 구분
        if (err.response?.status === 401 || err.response?.data) {
            res.status(401).json({ detail: "카카오 인증에 실패했어요." });
            return;
        }
        next(err);
    }
};

export const logoutHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = (req as any).user?.userId;

        if (userId) {
            await removeRefreshToken(userId);
        }

        res.clearCookie("refreshToken");
        res.status(200).json({ message: "로그아웃 되었습니다." });
    } catch (err) {
        next(err);
    }
};
