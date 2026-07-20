import { Router } from "express";
import {
    createRoomHandler,
    getMyRoomsHandler,
} from "../controllers/room.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: 채팅방 생성
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [direct, group]
 *               name:
 *                 type: string
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 생성 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post("/", authMiddleware, createRoomHandler);

export default router;

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     tags:
 *       - Rooms
 *     summary: 내 채팅방 목록 조회
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 성공
 */
router.get("/", authMiddleware, getMyRoomsHandler);
