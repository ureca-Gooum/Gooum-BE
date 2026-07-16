/**
 * Express Request 타입 확장
 * auth.middleware.ts에서 req.user에 값을 넣는데,
 * Express 기본 타입에는 user가 없어서 여기서 선언해줘야 함
 */
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                name: string;
            };
        }
    }
}

export {};
