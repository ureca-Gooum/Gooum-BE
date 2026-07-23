import { Request, Response, NextFunction } from "express";
import { search } from "../../services/search.service";

export const searchHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const q = req.query.q as string;
        if (!q) {
            res.status(400).json({ message: "검색어가 필요해요." });
            return;
        }

        const roomId = req.query.roomId as string | undefined;
        const limit = Number(req.query.limit) || 10;

        const result = await search(req.user!.userId, q, roomId, limit);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};
