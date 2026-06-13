# 말로 (Mallo) — 한국말로 만드는 앱

구글 로그인 → 한국말 입력 → 앱 출력. 사용자는 API 키도 코드도 볼 일 없음.

## 구조

```
사용자 브라우저 (index.html)
  └─ 구글 로그인 (Supabase Auth)
  └─ POST /api/generate (Vercel Edge Function)
       ├─ 로그인 검증 (Supabase)
       ├─ 체험 30분 / 월 100회 한도 검사·차감 (Postgres 함수, 원자적)
       └─ LLM 호출 (서버 환경변수의 키) → SSE 스트림으로 실시간 전달
```

비용 부담 주체: **운영자(당신)**. LLM 비용은 월 9,900원 구독료 안에서 사용량 제한(기본 100회/월)으로 통제.

## 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 프론트엔드 전체 (로그인, 채팅, 실시간 미리보기) |
| `api/generate.js` | LLM 프록시 + 쿼터 차감 + SSE 스트리밍 |
| `api/me.js` | 내 체험/구독/사용량 조회 |
| `api/subscribe.js` | 구독 처리 (현재 데모 — 토스페이먼츠 연동 지점 주석 참고) |
| `api/config.js` | 프론트에 Supabase 공개 설정 전달 |
| `api/_lib.js` | 공용 유틸 |
| `supabase.sql` | DB 스키마 + 쿼터 함수 |

## 배포 순서 (약 20분)

### 1. Supabase 설정 (무료)
1. [supabase.com](https://supabase.com) → New Project 생성
2. **SQL Editor** → `supabase.sql` 내용 붙여넣고 Run
3. **Authentication → Providers → Google** 활성화
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 클라이언트 ID 생성 (웹 애플리케이션)
   - 승인된 리디렉션 URI에 Supabase가 보여주는 callback URL 추가
   - Client ID/Secret을 Supabase에 입력
4. **Settings → API**에서 `URL`, `anon key`, `service_role key` 복사해 둠

### 2. LLM 키 발급 (하나만)
- 추천: **Gemini** ([aistudio.google.com](https://aistudio.google.com/apikey)) — gemini-2.0-flash가 가장 저렴, 무료 할당량으로 테스트 가능
- 또는 Claude (console.anthropic.com) / OpenAI (platform.openai.com)

### 3. Vercel 배포 (무료)
1. 이 폴더를 GitHub 저장소에 푸시 → [vercel.com](https://vercel.com)에서 Import (또는 `npx vercel` 한 줄)
2. **Settings → Environment Variables**:

| 변수 | 값 |
|---|---|
| `SUPABASE_URL` | Supabase URL |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (절대 프론트에 노출 금지) |
| `LLM_PROVIDER` | `gemini` / `claude` / `openai` |
| `LLM_API_KEY` | 해당 LLM API 키 |
| `LLM_MODEL` | (선택) 기본: gemini-2.0-flash / claude-sonnet-4-6 / gpt-4o |
| `MONTHLY_LIMIT` | (선택) 월 생성 한도, 기본 100 |
| `TRIAL_MINUTES` | (선택) 무료 체험 시간(분), 기본 30 |

3. Supabase **Authentication → URL Configuration**의 Site URL을 Vercel 도메인으로 설정

### 4. 결제 연동 (출시 전 필수)
`api/subscribe.js`는 현재 데모(누르면 바로 구독됨). 토스페이먼츠 정기결제(빌링) 연동 절차는 해당 파일 상단 주석 참고. 사업자등록 + 토스페이먼츠 가맹 심사 필요 (보통 2~3일).

## 운영 비용 (대략)
- Vercel·Supabase 무료 플랜으로 시작 가능 (유저 수천 명까지)
- LLM 비용: gemini-2.0-flash 기준 생성 1회(앱 1개) ≈ 수 원 수준 → 구독자 1인 월 100회 써도 원가 수백 원대 → 마진 충분
- Claude/GPT를 기본 모델로 쓰면 품질↑ 원가↑ — `MONTHLY_LIMIT` 낮추거나 가격 조정 필요

## 출시 전 체크리스트
- [ ] 토스페이먼츠 빌링 연동 + 해지 플로우
- [ ] 이용약관/개인정보처리방침 페이지 (결제 심사에 필요)
- [ ] 어뷰징 방지: IP당 가입 제한, 프롬프트 길이 제한(적용됨)
- [ ] 카카오 로그인 추가 (Supabase Kakao provider — 한국 전환율↑)
