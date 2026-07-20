import { Router } from "express";
import { authMiddleware } from "../../core/middlewares/auth.middleware";
import { createDocumentHandler } from "../controllers/document.controller";

const router = Router();

/**
 * @swagger
 * /api/documents:
 *   post:
 *     tags:
 *       - Documents
 *     summary: 문서 생성
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               roomId:
 *                 type: string
 *     responses:
 *       201:
 *         description: 생성 성공
 *       403:
 *         description: 채팅방 멤버가 아님
 */
router.post("/", authMiddleware, createDocumentHandler);

export default router;
