import { Request, Response, NextFunction } from "express";
import {
    getNotifications,
    readAllNotifications,
    readNotification,
    getUnreadCounts,
} from "../../services/notification.service";
import { io } from "../../server";

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

// PATCH /api/notifications/:notificationId
export const readNotificationHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.userId;
        const result = await readNotification(
            req.params.notificationId,
            req.user!.userId,
        );

        getUnreadCounts(userId)
                    .then((counts) => io.to(userId).emit("unreadCount", counts))
                    .catch((err) => console.error("[Socket] unreadCount 전송 실패:", err));

        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

// PATCH /api/notifications/read-all
export const readAllNotificationsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.userId;
        const result = await readAllNotifications(req.user!.userId);


        getUnreadCounts(userId)
                .then((counts) => io.to(userId).emit("unreadCount", counts))
                .catch((err) => console.error("[Socket] unreadCount 전송 실패:", err));

        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};
