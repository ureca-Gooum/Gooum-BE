# Gooum Backend

실시간 채팅 + 동시 편집 기반 협업 플랫폼 백엔드

## 기술 스택

| 구분 | 기술 |
|---|---|
| 런타임 | Node.js |
| 프레임워크 | Express |
| 언어 | TypeScript |
| 실시간 채팅 | Socket.io |
| 동시 편집 | y-websocket |
| ODM | Mongoose |
| 인증 | JWT (jsonwebtoken) |
| 요청 검증 | Zod |
| API 문서 | Swagger (swagger-jsdoc + swagger-ui-express) |
| 배포 | Azure App Service |
| DB | Azure Cosmos DB for MongoDB (vCore) |
| 파일 저장소 | Azure Blob Storage |
| 비밀 관리 | Azure Key Vault |

## 프로젝트 구조

```
src/
├── api/
│   ├── controllers/        # 요청 처리 + 응답 반환
│   └── routes/             # URL 매핑 + Swagger 문서
├── core/
│   ├── config/             # 환경변수, DNS, Swagger 설정
│   ├── db/                 # MongoDB 연결
│   ├── middlewares/        # 인증, 에러 핸들러
│   └── security/           # JWT 토큰 관리
├── models/                 # Mongoose 스키마
├── schemas/                # Zod 요청/응답 검증
├── services/               # 비즈니스 로직
├── socket/                 # Socket.io + y-websocket 핸들러
├── types/                  # TypeScript 타입 선언
└── server.ts               # 진입점
```

## 시작하기
### 개발 환경 (Prerequisites)
* **Node.js**: v24.15.0 이상 권장
* **npm**: v11.12.1 이상 권장
### 1. 패키지 설치

```bash
npm install
```

### 2. 환경변수 설정

프로젝트 루트에 `.env` 파일 생성 (`.env.example` 참고):

```
PORT=8000
NODE_ENV=development
KEY_VAULT_URL=
DOCUMENT_DB_CONNECTION_STRING=mongodb+srv://...
DOCUMENT_DATABASE_NAME=gooum
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER_NAME=uploads
```

### 3. 실행

```bash
npm run dev
```

### 4. API 문서 확인

```
http://localhost:8000/api-docs
```

### 5. 디버깅 (VS Code)

F5 키로 디버그 모드 실행 (`.vscode/launch.json` 설정 포함)

## 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | TypeScript 빌드 |
| `npm start` | 프로덕션 서버 실행 |

## API 목록

### Auth

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/login` | 카카오 로그인 |
| POST | `/api/auth/refresh` | Access Token 재발급 |
| POST | `/api/auth/logout` | 로그아웃 |

### Users

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/users/me` | 내 프로필 조회 |
| PATCH | `/api/users/me` | 내 프로필 수정 |
| GET | `/api/users` | 유저 목록 조회 |
| GET | `/api/users/{userId}` | 특정 유저 조회 |

### Rooms

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/rooms` | 채팅방 생성 |
| GET | `/api/rooms` | 내 채팅방 목록 조회 |
| GET | `/api/rooms/{roomId}` | 채팅방 상세 조회 |
| PATCH | `/api/rooms/{roomId}` | 채팅방 이름 수정 |
| DELETE | `/api/rooms/{roomId}` | 채팅방 나가기 |
| PATCH | `/api/rooms/{roomId}/favorite` | 즐겨찾기 토글 |
| POST | `/api/rooms/{roomId}/members` | 멤버 초대 |

### Messages

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/rooms/{roomId}/messages` | 메시지 기록 조회 |
| DELETE | `/api/messages/{messageId}` | 메시지 삭제 |

### Documents

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/documents` | 문서 생성 |
| GET | `/api/documents` | 문서 목록 조회 |
| GET | `/api/documents/{documentId}` | 문서 상세 조회 |
| PATCH | `/api/documents/{documentId}` | 문서 저장 (자동 저장) |
| DELETE | `/api/documents/{documentId}` | 문서 삭제 |

### Notifications

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/notifications` | 내 알림 목록 조회 |
| PATCH | `/api/notifications/{notificationId}` | 알림 읽음 처리 |
| PATCH | `/api/notifications/read-all` | 전체 읽음 처리 |

### Search

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/search` | 통합 검색 |

### Upload

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/upload` | 파일 업로드 |

## Socket.io 이벤트

### 연결

```typescript
const socket = io("http://localhost:8000", {
    auth: { token: "accessToken" }
});
```

### 이벤트 목록

| 이벤트 | 방향 | 설명 |
|---|---|---|
| joinRoom | Client → Server | 채팅방 입장 |
| leaveRoom | Client → Server | 채팅방 퇴장 |
| sendMessage | Client → Server | 메시지 전송 |
| typing | Client → Server | 타이핑 중 |
| updatePresence | Client → Server | 프레즌스 상태 변경 |
| addReaction | Client → Server | 이모지 리액션 |
| newMessage | Server → Client | 새 메시지 수신 |
| userTyping | Server → Client | 상대방 타이핑 표시 |
| presenceChanged | Server → Client | 상대방 상태 변경 |
| newNotification | Server → Client | 실시간 알림 |
| reactionUpdated | Server → Client | 리액션 업데이트 |
| unreadCount | Server → Client | 안 읽은 알림 수 (연결 시) |
| messageDeleted | Server → Client | 메시지 삭제 알림 |

## DB 컬렉션

| 컬렉션 | 용도 |
|---|---|
| users | 사용자 정보, 프레즌스, 알림 설정, 테마 |
| rooms | 채팅방 (1:1 / 그룹) |
| room_members | 채팅방별 유저 정보 (읽은 위치, 즐겨찾기) |
| messages | 채팅 메시지 (텍스트/이미지/파일/문서) |
| documents | 동시 편집 문서 + AI 회의록 |
| notifications | 알림 |

## 배포

Azure App Service에 배포하며, 단일 서버(Single Instance)에서 REST API, Socket.io, y-websocket이 함께 동작합니다.

### Application Settings (Azure Portal)

```
NODE_ENV=production
KEY_VAULT_URL=https://<키볼트이름>.vault.azure.net
```

### 필요 설정

- App Service → ID → 시스템 할당 관리 ID 켜기
- Key Vault → 액세스 정책 → App Service 접근 허용 (Get, List)