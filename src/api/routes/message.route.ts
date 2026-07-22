import { Router } from "express";
import {
    deleteMessageHandler,
    getMessagesHandler,
} from "../controllers/message.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/rooms/{roomId}/messages:
 *   get:
 *     tags:
 *       - Messages
 *     summary: 메시지 기록 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: 가져올 메시지 수 (기본값 50)
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: 이 메시지 ID 이전 것들을 조회
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 메시지 내용 검색
 *     responses:
 *       200:
 *         description: 성공
 *       403:
 *         description: 멤버가 아님
 */
router.get("/rooms/:roomId/messages", authMiddleware, getMessagesHandler);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     tags:
 *       - Messages
 *     summary: 메시지 삭제
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       403:
 *         description: 본인 메시지만 삭제 가능
 *       404:
 *         description: 메시지 없음
 */
router.delete("/messages/:messageId", authMiddleware, deleteMessageHandler);

export default router;
