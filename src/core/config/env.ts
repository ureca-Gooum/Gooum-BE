import dotenv from "dotenv";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

dotenv.config();

const settings: Record<string, string> = {
    PORT: process.env.PORT || "8000",
    NODE_ENV: process.env.NODE_ENV || "development",
    KEY_VAULT_URL: process.env.KEY_VAULT_URL || "",
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || "",
    JWT_ALGORITHM: process.env.JWT_ALGORITHM || "",
    ACCESS_TOKEN_EXPIRE_MINUTES:
        process.env.ACCESS_TOKEN_EXPIRE_MINUTES || "30",
    REFRESH_TOKEN_EXPIRE_DAYS: process.env.REFRESH_TOKEN_EXPIRE_DAYS || "7",
    DOCUMENT_DB_CONNECTION_STRING:
        process.env.DOCUMENT_DB_CONNECTION_STRING || "",
    DOCUMENT_DATABASE_NAME: process.env.DOCUMENT_DATABASE_NAME || "",
    KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY || "",
    KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET || "",
    KAKAO_REDIRECT_URI: process.env.KAKAO_REDIRECT_URI || "",
};

// 배포 환경이면 Key Vault에서 시크릿 가져와서 덮어쓰기
export async function loadSecrets() {
    if (!settings.KEY_VAULT_URL) return;

    console.log("🔐 Key Vault에서 시크릿 로드 중...");

    const credential = new DefaultAzureCredential();
    const client = new SecretClient(settings.KEY_VAULT_URL, credential);

    // Key Vault의 모든 시크릿 순회 (Python의 list_properties_of_secrets와 동일)
    for await (const secretProperties of client.listPropertiesOfSecrets()) {
        // Key Vault에서는 이름에 하이픈을 쓰는데, 환경변수는 언더스코어 컨벤션
        const settingKey = secretProperties.name
            .replace(/-/g, "_")
            .toUpperCase();

        if (settingKey in settings) {
            const secret = await client.getSecret(secretProperties.name);
            if (secret.value) {
                settings[settingKey] = secret.value;
            }
        }
    }

    console.log("✅ Key Vault 시크릿 로드 완료");
}

export const env = settings;
