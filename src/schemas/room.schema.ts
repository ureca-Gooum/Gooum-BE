import { z } from "zod";

// POST /api/rooms 요청 검증
export const createRoomSchema = z.object({
    type: z.enum(["direct", "group"]),
    name: z.string().optional(),
    memberIds: z.array(z.string()).min(1, "멤버를 1명 이상 지정해주세요."),
});

export type CreateRoomDto = z.infer<typeof createRoomSchema>;

// PATCH /api/rooms/:id/favorite 요청 검증
export const favoriteSchema = z.object({
    isFavorite: z.boolean(),
});

export type FavoriteDto = z.infer<typeof favoriteSchema>;

// POST /api/rooms/:roomId/members 요청 검증
export const addMembersSchema = z.object({
    memberIds: z
        .array(z.string())
        .min(1, "초대할 멤버를 1명 이상 지정해주세요."),
});

export type AddMembersDto = z.infer<typeof addMembersSchema>;
