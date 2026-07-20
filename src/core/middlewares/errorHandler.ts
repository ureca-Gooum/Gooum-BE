import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    console.error(err);

    // Zod 검증 에러
    if (err instanceof ZodError) {
        res.status(422).json({
            message: "요청 데이터가 올바르지 않아요.",
            errors: err.issues,
        });
        return;
    }

    // 커스텀 에러 (throw { statusCode: 400, message: "..." })
    if (err.statusCode) {
        res.status(err.statusCode).json({ message: err.message });
        return;
    }

    // 그 외 에러
    const status = 500;
    res.status(status).json({
        message: err.message || "Internal Server Error",
        ...(env.NODE_ENV === "development" && { stack: err.stack }),
    });
};
