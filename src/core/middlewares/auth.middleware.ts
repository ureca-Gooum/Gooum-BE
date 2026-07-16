import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ detail: "인증이 필요합니다." });
        return;
    }

    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, env.JWT_SECRET_KEY);
        (req as any).user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ detail: "유효하지 않은 토큰입니다." });
    }
};
