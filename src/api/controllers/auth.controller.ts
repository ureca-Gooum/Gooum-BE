import { Request, Response, NextFunction } from "express";
import { loginSchema } from "../../schemas/auth.schema";
import { login, removeRefreshToken } from "../../services/auth.service";
import { env } from "../../core/config/env";

export const loginHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { code } = loginSchema.parse(req.body);
        const result = await login(code);

        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: Number(env.REFRESH_TOKEN_EXPIRE_DAYS) * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            accessToken: result.accessToken,
            userId: result.userId,
            name: result.name,
            theme: result.theme,
            profileImageUrl: result.profileImageUrl,
            isNewUser: result.isNewUser,
        });
    } catch (err: any) {
        if (err.response?.status === 401 || err.response?.data) {
            res.status(401).json({ message: "카카오 인증에 실패했어요." });
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
        res.status(200).json({ message: "로그아웃 되었어요." });
    } catch (err) {
        next(err);
    }
};
