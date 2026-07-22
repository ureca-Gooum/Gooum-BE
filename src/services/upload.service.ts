import { BlobServiceClient } from "@azure/storage-blob";
import { env } from "../core/config/env";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import "multer";

export const uploadFile = async (
    file: Express.Multer.File,
    category: string = "chat",
) => {
    if (!env.AZURE_STORAGE_CONNECTION_STRING) {
        throw { statusCode: 500, message: "스토리지 설정이 되어있지 않아요." };
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(
        env.AZURE_STORAGE_CONNECTION_STRING,
    );
    const containerClient = blobServiceClient.getContainerClient(
        env.AZURE_STORAGE_CONTAINER_NAME,
    );

    // 컨테이너 없으면 생성
    await containerClient.createIfNotExists({ access: "blob" });

    // 1. 깨진 파일 이름을 UTF-8로 복원
    const originalName = Buffer.from(file.originalname, "latin1").toString(
        "utf8",
    );
    // 2. 확장자 추출 및 blobName 생성 시 복원된 이름 활용
    const ext = path.extname(originalName);
    const blobName = `${category}/${uuidv4()}${ext}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
            blobContentType: file.mimetype,
        },
    });

    return {
        fileUrl: blockBlobClient.url,
        fileName: originalName,
        fileSize: file.size,
        mimeType: file.mimetype,
    };
};
