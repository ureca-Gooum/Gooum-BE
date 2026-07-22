import { Request, Response, NextFunction } from "express";
import { loginSchema, RefreshResponse } from "../../schemas/auth.schema";
import {
    login,
    refresh,
    removeRefreshToken,
} from "../../services/auth.service";
import { env } from "../../core/config/env";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: Number(env.REFRESH_TOKEN_EXPIRE_DAYS) * 24 * 60 * 60 * 1000,
};

export const loginHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { code } = loginSchema.parse(req.body);
        const result = await login(code);

        res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

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

export const refreshHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const oldRefreshToken = req.cookies.refreshToken;

        if (!oldRefreshToken) {
            res.status(401).json({ message: "유효하지 않은 토큰이에요." });
            return;
        }

        const result = await refresh(oldRefreshToken);

        res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);

        const response: RefreshResponse = {
            accessToken: result.accessToken,
        };

        res.status(200).json(response);
    } catch (err) {
        res.status(401).json({ message: "유효하지 않은 토큰이에요." });
    }
};
