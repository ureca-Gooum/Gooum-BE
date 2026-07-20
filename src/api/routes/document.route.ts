import { Router } from "express";
import { authMiddleware } from "../../core/middlewares/auth.middleware";
import {
    createDocumentHandler,
    getDocumentDetailHandler,
    getDocumentsHandler,
} from "../controllers/document.controller";

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

/**
 * @swagger
 * /api/documents:
 *   get:
 *     tags:
 *       - Documents
 *     summary: 문서 목록 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *         description: 특정 채팅방 문서만 필터
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [document, ai_summary]
 *         description: 문서 타입 필터
 *     responses:
 *       200:
 *         description: 성공
 */
router.get("/", authMiddleware, getDocumentsHandler);

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     tags:
 *       - Documents
 *     summary: 문서 상세 조회
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 성공
 *       403:
 *         description: 접근 권한 없음
 *       404:
 *         description: 문서 없음
 */
router.get("/:documentId", authMiddleware, getDocumentDetailHandler);

export default router;
