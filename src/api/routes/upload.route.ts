import { Router } from "express";
import multer from "multer";
import { uploadHandler } from "../controllers/upload.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags:
 *       - Upload
 *     summary: 파일 업로드
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               category:
 *                 type: string
 *                 enum: [profile, chat]
 *                 description: 저장 경로 분류 (기본값 chat)
 *     responses:
 *       200:
 *         description: 업로드 성공
 *       400:
 *         description: 파일 없음 또는 용량 초과
 */
router.post("/", authMiddleware, upload.single("file"), uploadHandler);

export default router;
