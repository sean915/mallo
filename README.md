# 말로 (Mallo) — 한국말로 만드는 앱

구글/카카오 로그인 → 한국말 입력 → 프로그램 출력. 사용자는 API 키도 코드도 볼 일 없음.

## 구조

```
사용자 브라우저 (index.html)
  └─ 소셜 로그인 (Supabase Auth)
  └─ POST /api/generate (Vercel Edge Function)
       ├─ 로그인 검증 (Supabase)
       ├─ 무료 체험/말로 잔액 검사·차감 (Postgres 함수, 원자적)
       ├─ 사용자 요청을 내부 정제 프롬프트로 변환
       └─ LLM 호출 (서버 환경변수의 키) → SSE 스트림으로 실시간 전달
```

컨셉: **한 번 호출하면 원큐로 프로그램(SW) 하나를 만든다.** 사용자는 만료 없는 말로 잔액을 단건 결제로 충전하고, 프로그램 생성/수정은 1회 3,900원, 생성된 도구 안의 AI 기능은 1회 990원이 차감됩니다.

## 가격 정책

| 충전 상품 | 가격 | 표시 |
|---|---:|---|
| 도구 만들기 1회 | 3,900원 | 말로 잔액 3,900원 |
| 도구 만들기 3회 | 11,700원 | 말로 잔액 11,700원 |
| 도구 만들기 5회 | 19,500원 | 말로 잔액 19,500원 |
| 도구 만들기 10회 | 39,000원 | 말로 잔액 39,000원 |

- 무료 체험: 비로그인 기기당 1건 + 로그인(가입) 시 2건
- 말로 잔액 만료 없음
- 생성/수정 모델: Claude (`LLM_PROVIDER=claude`)
- 도구 내부 AI 모델: `AI_API_KEY` 또는 `LLM_FALLBACK_API_KEY` 기반 무료/저비용 모델
- 결제 후 7일 이내 미사용분 환불
- 생성 실패, AI 응답 실패, 중복결제 등 시스템 오류는 잔액 자동 복구 또는 환불

## 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 프론트엔드 전체 (로그인, 채팅, 실시간 미리보기, 단건결제) |
| `api/generate.js` | 프롬프트 정제 + LLM 프록시 + 말로 잔액 차감/실패 복구 + SSE 스트리밍 |
| `api/ai.js` | 생성된 도구의 AI 기능 중계 + 말로 잔액 차감/실패 복구 |
| `api/me.js` | 내 무료 체험/말로 잔액 조회 |
| `api/purchase.js` | 포트원 단건결제 검증 + 말로 잔액 충전 |
| `api/config.js` | 프론트에 Supabase 공개 설정·가격·결제 준비 상태 전달 |
| `api/_lib.js` | 공용 유틸 + 가격 정책 단일 출처 |
| `supabase.sql` | DB 스키마 + 잔액 충전/차감/복구 함수 |
| `terms.html` / `refund.html` / `privacy.html` | 약관·환불·개인정보 문서 |

## 배포 순서 (약 20분)

### 1. Supabase 설정
1. [supabase.com](https://supabase.com) → New Project 생성
2. **SQL Editor** → `supabase.sql` 내용 붙여넣고 Run
3. **Authentication → Providers → Google/Kakao** 활성화
   - Google Cloud Console 또는 Kakao Developers에서 OAuth 앱 생성
   - Supabase가 보여주는 callback URL을 승인된 리디렉션 URI에 추가
   - Client ID/Secret을 Supabase에 입력
4. **Settings → API**에서 `URL`, `anon key`, `service_role key` 복사해 둠

### 2. PortOne 카카오페이 단건결제 설정
1. [PortOne 관리자 콘솔](https://admin.portone.io)에서 상점 생성
2. **결제 연동 → 연동 정보**에서 `Store ID` 확인
3. **결제 연동 → 채널 관리**에서 카카오페이 결제 채널 생성 후 `Channel Key` 확인
4. **결제 연동 → API Secret**에서 서버 API 시크릿 발급
5. Vercel 환경변수에 아래 3개를 추가
   - `PORTONE_STORE_ID`
   - `PORTONE_CHANNEL_KEY`
   - `PORTONE_API_SECRET`
6. 테스트 모드에서 3,900원/11,700원 결제 → `/api/purchase`가 PortOne 결제 조회 후 `add_credits`로 잔액을 충전하는지 확인
7. 실연동 전환 후 실제 3,900원 결제/취소/부분 환불 운영 플로우 확인

### 3. LLM 키 발급
- 추천: 품질 모델 + 저비용 폴백 모델 조합
- 또는 단일 공급자만으로도 운영 가능

### 4. Vercel 배포
1. 이 폴더를 GitHub 저장소에 푸시 → [vercel.com](https://vercel.com)에서 Import
2. **Settings → Environment Variables**:

| 변수 | 값 |
|---|---|
| `SUPABASE_URL` | Supabase URL |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (절대 프론트에 노출 금지) |
| `LLM_PROVIDER` | `claude` 권장. 도구 생성/수정 모델 |
| `LLM_API_KEY` | 해당 LLM API 키 |
| `LLM_MODEL` | 선택. 공급자별 사용할 모델명 |
| `LLM_FALLBACK_API_KEY` | 선택. 1차 모델 실패 및 도구 내부 AI용 무료/저비용 키 |
| `LLM_FALLBACK_PROVIDER` | 선택. 기본 `gemini` |
| `LLM_FALLBACK_MODEL` | 선택. 기본 `gemini-2.5-flash` |
| `AI_API_KEY` | 선택. 도구 내부 AI 전용 키. 없으면 `LLM_FALLBACK_API_KEY` 사용 |
| `AI_PROVIDER` | 선택. 도구 내부 AI 전용 공급자 |
| `AI_MODEL` | 선택. 도구 내부 AI 전용 모델 |
| `PORTONE_STORE_ID` | 포트원 스토어 ID |
| `PORTONE_CHANNEL_KEY` | 포트원 카카오페이 채널 키 |
| `PORTONE_API_SECRET` | 포트원 서버 API 시크릿 |
| `TRIAL_LIMIT` | 선택. 로그인 계정 무료 체험 횟수, 기본 2 |
| `ANON_FREE_LIMIT` | 선택. 비로그인 기기당 무료 체험 횟수, 기본 1 |

3. Supabase **Authentication → URL Configuration**의 Site URL을 Vercel 도메인으로 설정

## 운영 체크리스트
- [ ] Supabase SQL 최신본 재실행: `balance_version`, `add_credits`, `use_generation`, `restore_generation` 함수 반영
- [ ] Vercel 환경변수 `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET` 입력
- [ ] 포트원 카카오페이 테스트 채널로 3,900원 결제/충전 테스트
- [ ] 포트원 실연동 채널로 소액 결제/취소 테스트
- [ ] 생성 실패 또는 AI 응답 실패 시 잔액 복구 테스트
- [ ] 이용약관/환불 정책/개인정보처리방침 최종 검토
- [ ] 어뷰징 방지: 계정당 쿨다운, 일일 상한, 프롬프트 길이 제한
