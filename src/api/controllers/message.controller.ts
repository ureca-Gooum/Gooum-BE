import { Request, Response, NextFunction } from "express";
import { deleteMessage, getMessages } from "../../services/message.service";
import { io } from "../../server";

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

// DELETE /api/messages/:messageId
export const deleteMessageHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await deleteMessage(
            req.params.messageId,
            req.user!.userId,
        );

        // 같은 방 멤버들에게 실시간 전달
        if (io) {
            io.to(result.roomId).emit("messageDeleted", {
                messageId: result.messageId,
                roomId: result.roomId,
            });
        }
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};
