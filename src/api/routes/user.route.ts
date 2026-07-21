import { Router } from "express";
import {
    getMeHandler,
    getUsersHandler,
    updateMeHandler,
} from "../controllers/user.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: 내 프로필 조회
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 성공
 */
router.get("/me", authMiddleware, getMeHandler);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: 유저 목록 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 이름 검색
 *     responses:
 *       200:
 *         description: 성공
 */
router.get("/", authMiddleware, getUsersHandler);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     tags:
 *       - Users
 *     summary: 내 프로필 수정
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               statusMessage:
 *                 type: string
 *               profileImageUrl:
 *                 type: string
 *               theme:
 *                 type: object
 *                 properties:
 *                   mode:
 *                     type: string
 *                     enum: [light, dark]
 *               notificationSettings:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: boolean
 *                   mention:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: 수정 성공
 */
router.patch("/me", authMiddleware, updateMeHandler);

export default router;
