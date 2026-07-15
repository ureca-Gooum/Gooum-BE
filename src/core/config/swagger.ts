import swaggerJSDoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Gooum API",
            version: "1.0.0",
            description: "Gooum 프로젝트 API 문서",
        },
        servers: [
            {
                url: "/",
            },
        ],
    },
    // 나중에 라우터 생기면 여기서 JSDoc 주석 긁어옴
    apis: [
        env.NODE_ENV === "production"
            ? "./dist/api/**/*.js"
            : "./src/api/**/*.ts",
    ],
};

export const swaggerSpec = swaggerJSDoc(options);
