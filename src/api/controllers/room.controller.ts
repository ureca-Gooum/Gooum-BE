import { Request, Response, NextFunction } from "express";
import { createRoomSchema, favoriteSchema } from "../../schemas/room.schema";
import {
    createRoom,
    getMyRooms,
    getRoomDetail,
    leaveRoom,
    toggleFavorite,
} from "../../services/room.service";

export const createRoomHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const data = createRoomSchema.parse(req.body);
        const result = await createRoom(req.user!.userId, data);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const getMyRoomsHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await getMyRooms(req.user!.userId);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

export const getRoomDetailHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await getRoomDetail(req.params.roomId, req.user!.userId);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

export const leaveRoomHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        await leaveRoom(req.params.roomId, req.user!.userId);
        res.status(200).json({ message: "채팅방에서 나갔어요." });
    } catch (err) {
        next(err);
    }
};

export const toggleFavoriteHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { isFavorite } = favoriteSchema.parse(req.body);
        const result = await toggleFavorite(
            req.params.roomId,
            req.user!.userId,
            isFavorite,
        );
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};
