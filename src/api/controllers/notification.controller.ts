import { Request, Response, NextFunction } from "express";
import { getNotifications } from "../../services/notification.service";

// GET /api/notifications
export const getNotificationsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const limit = Number(req.query.limit) || 20;
        const cursor = req.query.cursor as string | undefined;
        const result = await getNotifications(req.user!.userId, limit, cursor);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};
