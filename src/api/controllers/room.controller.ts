import { Request, Response, NextFunction } from "express";
import { createRoomSchema } from "../../schemas/room.schema";
import {
    createRoom,
    getMyRooms,
    getRoomDetail,
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
