import { Request, Response, NextFunction } from "express";
import { getMe, getUsers } from "../../services/user.service";

// GET /api/users/me
export const getMeHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await getMe(req.user!.userId);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};

// GET /api/users
export const getUsersHandler = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const search = req.query.search as string | undefined;
        const result = await getUsers(req.user!.userId, search);
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
};
