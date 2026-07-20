import { Request, Response, NextFunction } from "express";
import { createDocument, getDocuments } from "../../services/document.service";
import { createDocumentsSchema } from "../../schemas/document.schema";

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
