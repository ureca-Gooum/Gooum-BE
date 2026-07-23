import { Router } from "express";
import { searchHandler } from "../controllers/search.controller";
import { authMiddleware } from "../../core/middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/search:
 *   get:
 *     tags:
 *       - Search
 *     summary: 통합 검색
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: 검색 키워드
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *         description: 채팅방 내 검색 시
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: 카테고리별 최대 개수 (기본값 10)
 *     responses:
 *       200:
 *         description: 성공
 *       400:
 *         description: 검색어 없음
 */
router.get("/", authMiddleware, searchHandler);

export default router;
