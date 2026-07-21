import { NotificationModel } from "../models/notification.model";

// 내 알림 목록 조회
export const getNotifications = async (
    userId: string,
    limit: number = 20,
    cursor?: string,
) => {
    const filter: any = { user_id: userId };

    if (cursor) {
        const cursorNotification = await NotificationModel.findById(cursor);
        if (cursorNotification) {
            filter.created_at = { $lt: cursorNotification.created_at };
        }
    }

    const notifications = await NotificationModel.find(filter)
        .sort({ created_at: -1 })
        .limit(limit + 1);

    const hasMore = notifications.length > limit;
    const result = hasMore ? notifications.slice(0, limit) : notifications;

    // 안 읽은 알림 수
    const unreadCount = await NotificationModel.countDocuments({
        user_id: userId,
        is_read: false,
    });

    return {
        notifications: result.map((n) => ({
            notificationId: n._id.toString(),
            type: n.type,
            title: n.title,
            body: n.body || null,
            roomId: n.room_id?.toString() || null,
            isRead: n.is_read,
            createdAt: n.created_at,
        })),
        unreadCount,
        hasMore,
        nextCursor: hasMore ? result[result.length - 1]._id.toString() : null,
    };
};

// 알림 읽음 처리
export const readNotification = async (
    notificationId: string,
    userId: string,
) => {
    const notification = await NotificationModel.findById(notificationId);
    if (!notification)
        throw { statusCode: 404, message: "알림을 찾을 수 없어요." };

    if (notification.user_id.toString() !== userId) {
        throw { statusCode: 404, message: "알림을 찾을 수 없어요." };
    }

    notification.is_read = true;
    await notification.save();

    return {
        notificationId: notification._id.toString(),
        isRead: true,
    };
};

// 전체 읽음 처리
export const readAllNotifications = async (userId: string) => {
    const result = await NotificationModel.updateMany(
        { user_id: userId, is_read: false },
        { is_read: true },
    );

    return {
        message: "모든 알림을 읽음 처리했어요.",
        updatedCount: result.modifiedCount,
    };
};
