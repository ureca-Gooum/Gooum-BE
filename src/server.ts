import express, { Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
// Azure가 임의로 부여하는 포트(process.env.PORT)를 우선적으로 사용하도록 설정!
const PORT = process.env.PORT || 8000;

app.use(express.json());

// 배포 테스트용 핑 API
app.get("/ping", (req: Request, res: Response) => {
    res.status(200).json({
        message: "pong! Node.js TS server is running on Azure!",
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
