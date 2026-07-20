import { Request, Response, NextFunction } from "express";
import {
    createDocument,
    deleteDocument,
    getDocumentDetail,
    getDocuments,
    updateDocument,
} from "../../services/document.service";
import {
    createDocumentsSchema,
    updateDocumentSchema,
} from "../../schemas/document.schema";

export const createDocumentHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const data = createDocumentsSchema.parse(req.body);
        const result = await createDocument(req.user!.userId, data);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const getDocumentsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const roomId = req.query.roomId as string | undefined;
        const type = req.query.type as string | undefined;
        const result = await getDocuments(req.user!.userId, roomId, type);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

export const getDocumentDetailHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await getDocumentDetail(
            req.params.documentId,
            req.user!.userId,
        );
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

export const updateDocumentHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const data = updateDocumentSchema.parse(req.body);
        const result = await updateDocument(
            req.params.documentId,
            req.user!.userId,
            data,
        );
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

export const deleteDocumentHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        await deleteDocument(req.params.documentId, req.user!.userId);
        res.status(200).json({ message: "문서가 삭제되었어요." });
    } catch (err) {
        next(err);
    }
};
