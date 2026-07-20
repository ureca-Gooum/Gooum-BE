import { Request, Response, NextFunction } from "express";
import { createDocument } from "../../services/document.service";
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
