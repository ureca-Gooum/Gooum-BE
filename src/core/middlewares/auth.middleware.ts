import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../security/jwt";
import { UserModel } from "../../models/user.model";

export const authMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "인증이 필요합니다." });
        return;
    }

    try {
        const token = authHeader.split(" ")[1];
        const payload = verifyToken(token);
        const userId = payload.userId;

        if (!userId) {
            res.status(401).json({ message: "유효하지 않은 토큰이에요." });
            return;
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({ message: "유저를 찾을 수 없어요." });
            return;
        }

        // types/express/index.d.ts에서 타입 확장했으므로 as any 불필요
        req.user = { userId: user._id.toString(), name: user.name };
        next();
    } catch (err) {
        res.status(401).json({ message: "유효하지 않은 토큰이에요." });
    }
};
