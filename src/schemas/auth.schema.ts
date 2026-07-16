import { z } from "zod";

export const loginSchema = z.object({
    code: z.string().min(1, "카카오 인가 코드가 필요합니다."),
});

export type LoginDto = z.infer<typeof loginSchema>;
