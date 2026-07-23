import { z } from "zod";

// PATCH /api/users/me 요청 검증
export const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    statusMessage: z.string().optional(),
    profileImageUrl: z.string().optional(),
    theme: z
        .object({
            mode: z.enum(["light", "dark"]),
        })
        .optional(),
    notificationSettings: z
        .object({
            message: z.boolean(),
            mention: z.boolean(),
        })
        .optional(),
    presence: z
        .object({
            status: z.enum(["online", "away", "busy", "offline"]),
        })
        .optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
