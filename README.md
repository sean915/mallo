# 말로 (Mallo) — 한국말로 만드는 앱

구글/카카오 로그인 → 한국말 입력 → 앱 출력. 사용자는 API 키도 코드도 볼 일 없음.

## 구조

```
사용자 브라우저 (index.html)
  └─ 소셜 로그인 (Supabase Auth)
  └─ POST /api/generate (Vercel Edge Function)
       ├─ 로그인 검증 (Supabase)
       ├─ 무료 체험/이용권 잔액 검사·차감 (Postgres 함수, 원자적)
       ├─ 사용자 요청을 내부 정제 프롬프트로 변환
       └─ LLM 호출 (서버 환경변수의 키) → SSE 스트림으로 실시간 전달
```

비용 부담 주체: **운영자(당신)**. 사용자는 만료 없는 이용권(크레딧)을 단건 결제로 충전하고, 도구 생성 또는 수정 1회마다 1회 차감됩니다.

## 가격 정책

| 이용권 | 가격 | 회당 가격 | 표시 |
|---|---:|---:|---|
| 라이트 5회 | 14,500원 | 2,900원 | 기준가 |
| 스탠다드 10회 | 27,000원 | 2,700원 | 2,000원 할인 |
| 프로 30회 | 75,000원 | 2,500원 | 12,000원 할인 |

- 무료 체험: 가입 즉시 3회
- 이용권 만료 없음
- 결제 후 7일 이내 미사용분 환불
- 생성 실패, 모델 오류, 중복결제 등 시스템 오류는 이용권 자동 복구 또는 환불

## 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 프론트엔드 전체 (로그인, 채팅, 실시간 미리보기, 단건결제) |
| `api/generate.js` | 프롬프트 정제 + LLM 프록시 + 이용권 차감/실패 복구 + SSE 스트리밍 |
| `api/me.js` | 내 무료 체험/이용권 잔액 조회 |
| `api/purchase.js` | 포트원 단건결제 검증 + 이용권 충전 |
| `api/config.js` | 프론트에 Supabase 공개 설정·이용권 가격 전달 |
| `api/_lib.js` | 공용 유틸 + 이용권 가격 단일 출처 |
| `supabase.sql` | DB 스키마 + 이용권 충전/차감/복구 함수 |
| `terms.html` / `refund.html` / `privacy.html` | 약관·환불·개인정보 문서 |

## 배포 순서 (약 20분)

### 1. Supabase 설정 (무료)
1. [supabase.com](https://supabase.com) → New Project 생성
2. **SQL Editor** → `supabase.sql` 내용 붙여넣고 Run
3. **Authentication → Providers → Google/Kakao** 활성화
   - Google Cloud Console 또는 Kakao Developers에서 OAuth 앱 생성
   - Supabase가 보여주는 callback URL을 승인된 리디렉션 URI에 추가
   - Client ID/Secret을 Supabase에 입력
4. **Settings → API**에서 `URL`, `anon key`, `service_role key` 복사해 둠

### 2. LLM 키 발급
- 추천: Claude 품질 모델 + Gemini 폴백
- 또는 Gemini / OpenAI 단독 운영 가능

### 3. Vercel 배포
1. 이 폴더를 GitHub 저장소에 푸시 → [vercel.com](https://vercel.com)에서 Import
2. **Settings → Environment Variables**:

| 변수 | 값 |
|---|---|
| `SUPABASE_URL` | Supabase URL |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (절대 프론트에 노출 금지) |
| `LLM_PROVIDER` | `gemini` / `claude` / `openai` |
| `LLM_API_KEY` | 해당 LLM API 키 |
| `LLM_MODEL` | 선택. 기본: gemini-2.0-flash / claude-sonnet-4-6 / gpt-4o |
| `LLM_FALLBACK_API_KEY` | 선택. 1차 모델 실패 시 폴백 키 |
| `PORTONE_STORE_ID` | 포트원 스토어 ID |
| `PORTONE_CHANNEL_KEY` | 포트원 카카오페이 채널 키 |
| `PORTONE_API_SECRET` | 포트원 서버 API 시크릿 |
| `TRIAL_LIMIT` | 선택. 무료 체험 횟수, 기본 3 |

3. Supabase **Authentication → URL Configuration**의 Site URL을 Vercel 도메인으로 설정

## 운영 체크리스트
- [ ] Supabase SQL 최신본 재실행: `add_credits`, `use_generation`, `restore_generation` 함수 반영
- [ ] 포트원 카카오페이 단건결제 실결제/취소 테스트
- [ ] 생성 실패 시 이용권 복구 테스트
- [ ] 이용약관/환불 정책/개인정보처리방침 최종 검토
- [ ] 어뷰징 방지: 계정당 쿨다운, 일일 상한, 프롬프트 길이 제한
