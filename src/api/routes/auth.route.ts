import { Router } from "express";
import { loginHandler, logoutHandler } from "../controllers/auth.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 카카오 로그인
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: 카카오 인가 코드
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       401:
 *         description: 카카오 인증 실패
 */
router.post("/login", loginHandler);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 로그아웃
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 */
router.post("/logout", authMiddleware, logoutHandler);

export default router;
