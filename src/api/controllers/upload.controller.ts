import { Request, Response, NextFunction } from "express";
import { uploadFile } from "../../services/upload.service";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const uploadHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.userId;
        const file = req.file;
        if (!file) {
            res.status(400).json({ message: "파일이 없어요." });
            return;
        }

        const category = (req.body.category as string) || "chat";

        // 용량 체크
        const isImage = file.mimetype.startsWith("image/");
        const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

        if (file.size > maxSize) {
            const limitText = isImage ? "5MB" : "100MB";
            res.status(400).json({
                message: `파일 크기가 ${limitText}를 초과했어요.`,
            });
            return;
        }

        const result = await uploadFile(file, category);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};
