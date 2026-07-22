import { Router } from "express";
import {
    addMembersHandler,
    createRoomHandler,
    getMyRoomsHandler,
    getRoomDetailHandler,
    leaveRoomHandler,
    toggleFavoriteHandler,
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

/**
 * @swagger
 * /api/rooms/{roomId}:
 *   get:
 *     tags:
 *       - Rooms
 *     summary: 채팅방 상세 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 성공
 *       403:
 *         description: 멤버가 아님
 *       404:
 *         description: 채팅방 없음
 */
router.get("/:roomId", authMiddleware, getRoomDetailHandler);

/**
 * @swagger
 * /api/rooms/{roomId}:
 *   delete:
 *     tags:
 *       - Rooms
 *     summary: 채팅방 나가기
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 성공
 *       404:
 *         description: 채팅방 없음
 */
router.delete("/:roomId", authMiddleware, leaveRoomHandler);

/**
 * @swagger
 * /api/rooms/{roomId}/favorite:
 *   patch:
 *     tags:
 *       - Rooms
 *     summary: 채팅방 즐겨찾기 토글
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isFavorite:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 성공
 */
router.patch("/:roomId/favorite", authMiddleware, toggleFavoriteHandler);

/**
 * @swagger
 * /api/rooms/{roomId}/members:
 *   post:
 *     tags:
 *       - Rooms
 *     summary: 채팅방 멤버 초대
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 초대 성공
 *       400:
 *         description: 1:1 채팅방
 *       403:
 *         description: 멤버가 아님
 */
router.post("/:roomId/members", authMiddleware, addMembersHandler);

export default router;
