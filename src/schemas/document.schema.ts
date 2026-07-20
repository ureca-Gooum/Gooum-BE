import { z } from "zod";

// POST /api/documents 요청 검증
export const createDocumentsSchema = z.object({
    title: z.string().min(1, "문서 제목이 필요합니다."),
    roomId: z.string().min(1, "채팅방 ID가 필요합니다."),
});

export type CreateDocumentDto = z.infer<typeof createDocumentsSchema>;

// PATCH /api/documents/:id 요청 검증
export const updateDocumentSchema = z.object({
    title: z.string().optional(),
    content: z.any().optional(),
});

export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
