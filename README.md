# 🥔 Gooum (구움)

> 매일 갓 구운 이야기가 있는 곳
> 대화를 나누고, 협업하며, 결과물을 함께 구워내는 공간

![Gooum 서비스 소개](/docs/images/Gooum-banner.png)

---

## 📌 목차

- [프로젝트 소개](#-프로젝트-소개)
- [팀원 소개 및 역할 분배](#-팀원-소개-및-역할-분배)
- [기획 배경 및 해결책](#-기획-배경-및-해결책)
- [핵심 기능](#-핵심-기능)
- [기술 아키텍처](#️-기술-아키텍처)
- [기술적 핵심 구현 사항](#-기술적-핵심-구현-사항)
- [트러블슈팅](#-트러블슈팅)
- [폴더 구조](#-폴더-구조)
- [향후 계획](#-향후-계획)
- [포팅 매뉴얼](#-포팅-매뉴얼)
- [API 목록](#-api-목록)
- [Socket.io 이벤트](#-socketio-이벤트)
- [DB 컬렉션](#️-db-컬렉션)
- [배포](#️-배포)

---

## 📖 프로젝트 소개

**구움(Gooum)** 은 팀명인 구운감자의 '구움'과, 사람들이 모여 대화하고 협업하는 공간을 뜻하는 **Room**을 결합한 이름입니다.

실시간 채팅, 문서 공동 편집, AI 회의록 자동 생성을 하나로 결합한 **통합 AI 협업 메신저**로, 소속이나 조직에 관계없이 누구와도 워크스페이스 가입 절차 없이 바로 생산성 높은 협업을 시작할 수 있는 것을 목표로 합니다.

> 단순한 메신저를 넘어 **'대화 → 협업 → 기록'** 의 흐름을 하나의 서비스로 연결합니다.

---

## 👥 팀원 소개 및 역할 분배

|                                                     장준환 (FE) - 팀장                                                     |                                                    박소연 (FE)                                                    |                                                        서지현 (BE)                                                        |
| :------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------: |
| <a href="https://github.com/junhwan0697"><img src="https://github.com/junhwan0697.png?s=200" width="120" height="120"></a> | <a href="https://github.com/Ppakso"><img src="https://github.com/Ppakso.png?s=200" width="120" height="120" ></a> | <a href="https://github.com/jhwest-dev"><img src="https://github.com/jhwest-dev.png?s=200" width="120" height="120" ></a> |
|                                       [@junhwan0697](https://github.com/junhwan0697)                                       |                                       [@Ppakso](https://github.com/Ppakso)                                        |                                       [@jhwest-dev](https://github.com/jhwest-dev)                                        |
|                                      동시 편집 · 문서 · 반응형 · 알림 · 카카오 로그인                                      |                                   AI 회의록 · 채팅 · 환경 세팅 및 배포 · Figma                                    |                                     API/Socket.io 설계 및 개발 · DB 설계 · Azure 배포                                     |

---

## 💡 기획 배경 및 해결책

- **Pain Point 1 — 협업 도구의 파편화**
  대화는 메신저(슬랙·카카오톡), 문서 작성은 외부 툴(노션·구글독스)로 이원화되어 있어 잦은 화면 전환과 정보 유실이 발생합니다.
- **Pain Point 2 — 기록의 비효율**
  회의가 끝난 후 누군가 별도의 시간을 들여 회의록을 정리해야 하는 번거로움이 있습니다.
- **Pain Point 3 — 높은 도입 장벽**
  Slack/Teams류는 '같은 조직'을 전제로 하여 해커톤, 프리랜서, 사이드 프로젝트, 대학 팀플처럼 소속이 다른 팀은 도입이 어렵습니다.

**Our Solution**

소통(채팅) · 작업(문서) · 기록(AI 회의록)의 흐름을 하나의 스페이스에 연결하고, 워크스페이스 없이 가입만으로 누구와든 바로 협업할 수 있도록 설계했습니다.

---

## 🌟 핵심 기능

|                      스크린샷                      | 설명                                                                                                                                                                                                                                                    |
| :------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  ![실시간 채팅](/docs/images/screenshot-chat.png)   | **01. 실시간 채팅**<br>· WebSocket 기반 실시간 송수신 — 새로고침 없이 즉시 메시지 반영<br>· Tiptap 마크다운 에디터 — 코드 블록·굵게 등 서식 지원<br>· 멘션 + 실시간 접속 상태 — 태그 알림과 온라인 여부 동시 표시<br>· 1:1 · 그룹 채팅 + 안 읽음 카운트 |
| ![동시 문서 편집](/docs/images/screenshot-docs.png) | **02. 동시 문서 편집**<br>· 마크다운 기반의 편리한 문서 생성 및 수정<br>· 여러 사용자의 동시 편집 (CRDT 기반 Yjs)<br>· 변경 사항 실시간 반영, 작성자별 커서 위치 표시                                                                                   |
|    ![AI 회의록](/docs/images/screenshot-ai.png)     | **03. AI 회의록 생성**<br>· 채팅 내용을 기반으로 회의록 자동 생성 (Gemini API)<br>· 원하는 형식·요청사항을 반영한 회의 내용 요약<br>· 생성된 회의록을 동시 편집 가능한 문서로 즉시 저장                                                                 |

---

## 🛠️ 기술 아키텍처

### 기술 스택

| 구분                 | 스택                                          |
| -------------------- | ---------------------------------------------- |
| Runtime / Framework  | Node.js, Express                              |
| Language             | TypeScript                                    |
| Real-time            | Socket.io, y-websocket (Yjs)                  |
| Database             | Azure Cosmos DB for MongoDB (Mongoose)        |
| Auth                 | JWT (jsonwebtoken), Kakao OAuth               |
| Validation / Docs    | Zod, Swagger                                  |
| Storage / Secrets    | Azure Blob Storage, Azure Key Vault           |
| Deployment           | Azure App Service                             |

### 시스템 구조

![](/docs/images/SystemArchitecture.png)

- **모듈 기반 디렉터리 구조**: `api` / `core` / `models` / `schemas` / `services` / `socket` / `types` (자세히는 [폴더 구조](#-폴더-구조) 참고)
- **멀티 채널 통신**
  - REST API (Express) — 일반 CRUD, 인증
  - Socket.io — 채팅 · 프레즌스 · 알림 실시간 이벤트 (핸드셰이크 단계에서 JWT 인증)
  - y-websocket (ws) — 문서 동시 편집 동기화, Yjs 문서/awareness 상태를 방 단위로 브로드캐스트

### ERD / DB 설계

Azure Cosmos DB(MongoDB API) 기반 6개 컬렉션(`users` · `rooms` · `roommembers` · `messages` · `documents` · `notifications`)으로 구성됩니다.
상세 ERD 다이어그램과 컬렉션별 설명은 [DB 컬렉션](#️-db-컬렉션) 섹션을 참고하세요.

---

## 🧩 기술적 핵심 구현 사항

- **Socket.io JWT 인증 미들웨어**: 핸드셰이크의 `auth.token` / `Authorization` 헤더에서 토큰을 검증해 `socket.userId`를 주입하고, 연결 시 유저 ID를 방 이름으로 자동 join시켜 개인 알림을 타겟팅 (`src/socket/index.ts`)
- **y-websocket 커스텀 서버**: HTTP 서버의 `upgrade` 이벤트를 가로채 문서별 Yjs 문서/awareness 상태를 메모리에 유지하고, sync·awareness 프로토콜 메시지를 방에 연결된 클라이언트에 브로드캐스트 (`src/socket/yws.handler.ts`)
- **프레즌스 디바운싱**: 소켓 연결 해제 시 즉시 오프라인 처리하지 않고 300ms 대기 후에도 활성 소켓이 없을 때만 오프라인으로 전환 — 새로고침 순간의 온/오프라인 깜빡임 방지 (`src/socket/chat.handler.ts`)
- **알림 대상 필터링**: 멘션 여부와 유저별 `notification_settings`(mention/message)를 함께 확인하고, 이미 해당 방에 접속 중인 유저는 제외해 알림을 생성하며 `unreadCount`를 실시간으로 갱신
- **Key Vault 시크릿 자동 로딩**: 배포 환경에서 `DefaultAzureCredential`(Managed Identity)로 Key Vault의 시크릿을 순회 조회해 하이픈→언더스코어로 변환 후 환경변수를 덮어씀 (`src/core/config/env.ts`)

---

## 🚀 트러블슈팅

| 이슈                                                             | 원인                                                         | 해결                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| **DB 리전 이슈** - API 응답 3~6초 지연                           | App Service(Korea Central)와 DB(Brazil South) 간 물리적 거리 | DB 리전을 Japan East로 이전 → 응답 시간 0.5초 이내로 단축 |
| **로컬 환경 실시간 테스트 이슈** - 로컬에서 실시간 메시지 미반영 | 각자 다른 localhost 소켓 서버에 연결되어 있음                | 배포된 서버에 함께 접속해 테스트                          |

---

## 📂 폴더 구조

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

---

## 🔭 향후 계획

| 항목                         | 현재                                          | 확장 방향                                                 | 효과                                                 |
| ---------------------------- | --------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| API 키 서버 사이드 전환      | 프론트엔드에서 Gemini API 직접 호출로 키 노출 | 백엔드 프록시 서버를 통해 호출, 키는 서버 환경변수로 관리 | API 키 탈취 방지, 요금 폭탄·호출 한도 초과 위험 제거 |
| 마크다운 기반 리치 문서 편집 | 동시 편집은 되나 순수 텍스트만 지원           | 제목·볼드·리스트·코드블록·테이블 등 실시간 렌더링 지원    | 회의록·기획서 등 실무 문서를 플랫폼 안에서 완결      |
| 리액션 기능                  | 메시지 피드백이 텍스트 답장뿐                 | 이모지 리액션으로 간편 응답                               | 불필요한 답장 감소, 빠른 의사 표현                   |

---

## 📄 포팅 매뉴얼

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
DOCUMENT_DB_CONNECTION_STR=mongodb+srv://...
DOCUMENT_DATABASE_NAME=gooum
JWT_SECRET_KEY=
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=http://localhost:3000/auth/callback
AZURE_STORAGE_CONNECTION_STR=
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

---

## 📡 API 목록

전체 엔드포인트 상세 스펙(요청/응답 스키마 포함)은 [배포 Swagger 문서](https://app-gooum-backend.azurewebsites.net) 또는 로컬 실행 후 `http://localhost:8000/api-docs`에서, 더 자세한 명세는 [Notion API 명세](https://app.notion.com/p/uplusureca-4/API-39db1b3b865680398783e4853bef447e?source=copy_link)에서 확인할 수 있습니다.

| 리소스 | 설명 |
|---|---|
| Auth | 카카오 로그인, 토큰 재발급/로그아웃 |
| Users | 내 프로필 조회/수정, 유저 목록/상세 조회 |
| Rooms | 채팅방 생성/조회/수정/나가기, 즐겨찾기, 멤버 초대 |
| Messages | 메시지 기록 조회, 메시지 삭제 |
| Documents | 문서 생성/조회/자동 저장/삭제 |
| Notifications | 알림 목록 조회, 읽음 처리 |
| Search | 통합 검색 |
| Upload | 파일 업로드 |

---

## 🔌 Socket.io 이벤트

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

---

## 🗄️ DB 컬렉션

더 자세한 DB 명세는 [Notion DB 명세](https://app.notion.com/p/uplusureca-4/DB-ERD-39cb1b3b865680619006de2a0d4c75bb?source=copy_link)를 참고하세요.

### ERD


> 원본 편집 파일: [`docs/erd/gooum.vuerd.json`](/docs/erd/gooum.vuerd.json) ([erd-editor](https://erd-editor.io)에서 열람 가능)

| 컬렉션 | 용도 |
|---|---|
| users | 사용자 정보 |
| rooms | 채팅방 (1:1 / 그룹) |
| roommembers | 채팅방별 유저 정보 (읽은 위치, 즐겨찾기) |
| messages | 채팅 메시지 (텍스트/이미지/파일/문서) |
| documents | 동시 편집 문서 + AI 회의록 |
| notifications | 알림 |

---

## ☁️ 배포

Azure App Service에 배포하며, 단일 서버(Single Instance)에서 REST API, Socket.io, y-websocket이 함께 동작합니다.

### Application Settings (Azure Portal)

```
NODE_ENV=production
KEY_VAULT_URL=https://<키볼트이름>.vault.azure.net
```

### 필요 설정

- App Service → ID → 시스템 할당 관리 ID 켜기
- Key Vault → 액세스 정책 → App Service 접근 허용 (Get, List)
