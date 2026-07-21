import { Router } from "express";
import { getMeHandler, getUsersHandler } from "../controllers/user.controller";
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

export default router;
