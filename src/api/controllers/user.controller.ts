import { Request, Response, NextFunction } from "express";
import { getUsers } from "../../services/user.service";

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
