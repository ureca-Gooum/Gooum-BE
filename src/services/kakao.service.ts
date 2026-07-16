import axios from "axios";
import { env } from "../core/config/env";

interface KakaoTokenResponse {
    access_token: string;
}

interface KakaoUserInfo {
    id: number;
    kakao_account?: {
        profile?: {
            nickname?: string;
        };
    };
}

export const getKakaoToken = async (code: string): Promise<string> => {
    const { data } = await axios.post<KakaoTokenResponse>(
        "https://kauth.kakao.com/oauth/token",
        new URLSearchParams({
            grant_type: "authorization_code",
            client_id: env.KAKAO_REST_API_KEY,
            client_secret: env.KAKAO_CLIENT_SECRET,
            redirect_uri: env.KAKAO_REDIRECT_URI,
            code,
        }),
        {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
    );

    return data.access_token;
};

export const getKakaoUserInfo = async (
    accessToken: string,
): Promise<KakaoUserInfo> => {
    const { data } = await axios.get<KakaoUserInfo>(
        "https://kapi.kakao.com/v2/user/me",
        {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    );

    return data;
};
