import { z } from "zod";

export const loginSchema = z.object({
    code: z.string().min(1, "카카오 인가 코드가 필요합니다."),
});

export type LoginDto = z.infer<typeof loginSchema>;

export interface LoginResponse {
    accessToken: string;
    userId: string;
    name: string;
    theme: string;
    profileImageUrl: string | null;
    isNewUser: boolean;
}

export interface LogoutResponse {
    message: string;
}
