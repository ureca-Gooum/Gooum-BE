import { NotificationModel } from "../models/notification.model";
import { RoomMemberModel } from "../models/room-member.model";
import { MessageModel } from "../models/message.model";

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
            messageId: n.message_id?.toString() || null, 
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

// 안 읽은 알림 수 + 안 읽은 메시지가 있는 채팅방 수
export const getUnreadCounts = async (userId: string) => {
    const unreadNotificationCount = await NotificationModel.countDocuments({
        user_id: userId,
        is_read: false,
    });

    const myMemberships = await RoomMemberModel.find({ user_id: userId }).lean();
    if (myMemberships.length === 0) {
        return { notifications: unreadNotificationCount, rooms: 0 };
    }

    const roomConditions = myMemberships.map((m) => ({
        room_id: m.room_id,
        created_at: { $gt: m.last_read_at },
    }));

    const unreadRoomIds = await MessageModel.distinct("room_id", {
        $or: roomConditions,
    });

    return {
        notifications: unreadNotificationCount,
        rooms: unreadRoomIds.length,
    };
};

// 특정 채팅방에서 온 안 읽은 알림 읽음 처리 (입장/이탈 시)
export const markRoomNotificationsRead = async (roomId: string, userId: string) => {
    await NotificationModel.updateMany(
        { room_id: roomId, user_id: userId, is_read: false },
        { $set: { is_read: true } },
    );
};

// 새 메시지/멘션 알림 생성
export const createMessageNotification = async (data: {
    userId: string;
    type: "message" | "document" | "mention";
    title: string;
    body: string;
    roomId: string;
    messageId: string;
}) => {
    const notification = await NotificationModel.create({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        room_id: data.roomId,
        message_id: data.messageId,
    });

    return {
        notificationId: notification._id.toString(),
        type: notification.type,
        title: notification.title,
        body: notification.body,
        roomId: data.roomId,
        messageId: data.messageId,
        isRead: false,
        createdAt: notification.created_at,
    };
};
