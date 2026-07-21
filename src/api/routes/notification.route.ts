import { Router } from "express";
import {
    getNotificationsHandler,
    readNotificationHandler,
} from "../controllers/notification.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: 내 알림 목록 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: 가져올 알림 수 (기본값 20)
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: 이 알림 ID 이전 것들을 조회
 *     responses:
 *       200:
 *         description: 성공
 */
router.get("/", authMiddleware, getNotificationsHandler);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: 알림 읽음 처리
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 성공
 *       404:
 *         description: 알림 없음
 */
router.patch("/:notificationId", authMiddleware, readNotificationHandler);

export default router;
