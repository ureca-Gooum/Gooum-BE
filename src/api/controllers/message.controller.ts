import { Request, Response, NextFunction } from "express";
import { getMessages } from "../../services/message.service";

// GET /api/rooms/:roomId/messages
export const getMessagesHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { roomId } = req.params;
        const limit = Number(req.query.limit) || 50;
        const cursor = req.query.cursor as string | undefined;
        const search = req.query.search as string | undefined;

        const result = await getMessages(
            roomId,
            req.user!.userId,
            limit,
            cursor,
            search,
        );
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};
