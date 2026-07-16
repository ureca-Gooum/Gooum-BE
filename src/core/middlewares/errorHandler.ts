import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    console.error(err);
    const status = err.statusCode || 500;
    res.status(status).json({
        message: err.message || "Internal Server Error",
        ...(env.NODE_ENV === "development" && { stack: err.stack }),
    });
};
