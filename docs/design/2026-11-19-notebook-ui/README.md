# Duvi 사용자 과업 기반 UI 설계 · 노트북형 재구성 검토

작성일: 2026-11-19. 범위: **설계**(task-first-frontend 1–6단계). 구현(7–8단계)은 사용자가 시안을 고른 뒤에만 한다.

사용자 요청(2026-11-19): "llm note 북처럼 ui 구성하면 안되니? 너 내가 만든 스킬 안 썼지 쓰면 이렇게 나오나?"
— Google NotebookLM처럼 자료·대화·노트를 한 화면에 두는 구성을 검토하고, 사용자가 만든 `task-first-frontend` 스킬 절차를 그대로 따르라는 요청으로 읽었다.

핵심 과업은 **영어 강의를 보다 막힌 순간, 영상과 두 줄 자막을 놓치지 않은 채 묻고, 답을 근거 장면과 맞춰 보고, 그 자리에서 내 말로 설명을 적는 것**이다. 성공하면 강의 시간에 고정된 질문·AI 제안·내 설명이 한 기록으로 남고, 다음 회차에 열린 질문과 복습으로 다시 나타난다.

> 작업 중 초안(WIP). 단계 5–6 결과가 추가되면 갱신한다.

## 기준과 권한 (1단계)

- 저장소/지침: github.com/hyperdrivebeep/duvi, `AGENTS.md`, `DESIGN.md`(§8 전체화면, §12 사이드 채팅).
- 코드 기준: 원격 `origin/main` = **`b9e32be`** (2026-11-19 `git fetch`로 확인). 설치본 checkout `C:/Users/9950X3D/duvi`는 `0be5767`(한 커밋 뒤, 차이는 문서 `docs/study-walkthrough`뿐)이라 UI 코드는 동일. 설계는 별도 worktree(`b9e32be`)에서 읽었다.
- dirty/동시 작업: 설치본 checkout은 손대지 않았다. 실행 중인 6103 서버는 멈추지 않았고 학습 상태를 바꾸지 않았다.
- 현행 화면 출처: 2026-11-19 `0be5767` 설치본을 Chrome에서 조작한 캡처 23장(`duvi-work/study-walkthrough/`, 1733×833 등) + 저장소 `docs/qa-evidence/`. 설계에 쓴 UI 코드는 두 커밋에서 동일하므로 캡처를 현행 근거로 쓴다.
- 승인 범위: 설계·시안·브리프 작성, 브리프와 시안 이미지(WebP)를 `docs/design/2026-11-19-notebook-ui/`에 commit/push(사용자 승인). 제품 코드 변경 없음. 데스크톱만.
- 자료 성격: 강의 영상 장면은 MIT OpenCourseWare(CC BY-NC-SA 4.0) 실제 캡처. 03:16 영어 자막 한 줄은 실제 캡처 문장. 한국어 번역·다른 대본 문장·AI 답변·노트 내용은 **시안용 예시**(ChatGPT 미연결 상태라 실제 답변은 관찰하지 않음).

## 코드와 상태 연결 (2단계)

| 정상 진입 | 화면/행동 | handler/API | 상태 소유자 | 결과 소비자 | 코드 근거 |
| --- | --- | --- | --- | --- | --- |
| `index.html` → `src/app.mjs` | 사이드바 **학습 로드맵** / **다음 · MIT 1** | `LearningUI.open('roadmap')`, `GET /api/learning/roadmap` | 서버 로드맵 + `state.progress` | 로드맵 모달, 사이드바 `학습 n/227` | `learning-ui.mjs` `open`,`sync`; `learning-map-view.mjs` |
| 강의 행 클릭 | 영상 + 영어/한국어 자막 | `GET /api/lectures/:id`, `/api/translations/:id` | 강의 데이터 + 번역 캐시 | `.captions`, 대본 `.cue` | `app.mjs` `load` (63행), `study-view.mjs` |
| 툴바 **질문하기** | 오른쪽 패널 `질문하기` 탭 | `POST /api/learning/chat`(스트림), `/chat/stop`, `/chat/models` | `state.chats`(강의별 대화) | 메시지 로그, 시간 칩 → seek | `learning-chat.mjs` `send`,`onEvent`,`chip` |
| 답변 **기록으로 저장** | 기록 생성 | `POST /api/learning/chat/record` | `state.records`(aiAnswer 분리) | 열린 질문, 내일 복습 | `learning-chat.mjs` `saveRecord` |
| 패널 **기록** 탭 | 자동 멈춤 + 원문 앵커 + 질문/내 설명 | `POST /api/learning/records`(recordRevision) | `state.records` | 내 기록, 복습 | `learning-ui.mjs` `question`,`saveRecord`; `learning-editor.mjs` |
| 로드맵 모달 **내 기록 / 복습** | 목록·필터·회상 | `POST /api/learning/review` | `records[].reviewDueAt` | 예정된 복습 | `learning-records-view.mjs` |
| 전체화면(F) | 영상·자막 dock + 오른쪽 320px 패널 | `setupStudyView.enter` | DOM 클래스 `study-focus`, `has-transcript` | 같은 4탭 패널 | `study-view.mjs`, `study-view.css` |
| 백업·동기화 | 내보내기/미리보기/합치기 | `/api/learning/sync/*`, `/import*` | 학습 상태 파일 | 다른 PC | `learning-sync-ui.mjs` |

중요한 구조 사실: 오른쪽 패널은 **한 번에 탭 하나**(`selectTab`이 다른 `data-stage-panel`을 모두 `hidden`)다. 그래서 `질문하기`의 답과 `기록`의 내 설명 입력을 동시에 볼 수 없다. 내 기록·복습·로드맵은 영상 위를 덮는 **모달**(`learningDialog`)에 있다. 채팅 질문은 이미 재생 시점(`seconds`)과 ±1분 대본을 함께 보낸다(`send` → `/api/learning/chat`, 힌트 문구 `chat-context`).

### 디자인 토큰(최종 적용 순서: `library.css` → `study-view.css` → `learning.css`)

파랑 `#1769e8`, 보조 글자 `#617088`, 선 `#e5eaf1`, 부드러운 면 `#f2f5fa`, 사이드바 `#f8fafd`, 선택 `#eaf2ff`, 글자 `#111a2d`, 포커스 `#75a6f0`, 알림 `#8b3d24`. 전체화면 어두운 면 `#090b10 / #141922 / #203652 / #232e40`, 자막 영어 `#dce3ee`·한국어 `#fff` 22px. 글꼴 Noto Sans KR Variable, 본문 14–15px, 보조 12px. 간격 4/8/12/16/20/24, 모서리 6–9px, 버튼 44px, 아이콘 lucide.

## 사용자 과업 (2단계, 코드·문서 기반 가설 — 인터뷰 아님)

| 상황 | 목적 | 필요한 정보 | 주 행동 | 완료 조건 | 근거/가정 |
| --- | --- | --- | --- | --- | --- |
| 회차 시작 | 오늘 할 일 고르기 | 다음 강의·이어볼 위치, 오늘 복습 수 | 오늘 할 일 열기 | 맞는 강의가 이어볼 위치에서 열림 | `nextResource`, 로드맵 hero / 주 10–12h 가정 |
| 시청 중 | 영어 강의 뜻 잡기 | 영어 문장 + 한국어 번역, 이전/다시/다음 | 문장 이동·반복 | 현재 문장을 두 언어로 이해 | §8, 캡처 06·17 |
| 막힌 순간 | 그 자리에서 묻기 | 지금 시점, 보내는 맥락(±1분 대본, 내 기록) | 질문 보내기(자동 멈춤) | 답을 받고 근거 시각으로 이동해 원문과 대조 | `learning-chat.mjs`, 캡처 18 |
| 답을 읽은 뒤 | 내 말로 적기 | AI 답(제안 표시), 원문 앵커 | 내 설명 저장 | 질문·내 설명이 시각에 고정된 기록으로 저장 | `learning-editor.mjs`, 캡처 11–13·19 |
| 회차 끝/다음 날 | 열린 질문·복습 | 설명 없는 질문, 예정 복습 | 떠올려 보기 후 저장 | 열린 질문 감소, 다음 복습 날짜 지정 | `learning-records-view.mjs`, 캡처 14–16 |
| PC 이동 | 이어서 공부 | 동기화 폴더 상태 | 내보내기/합치기 | 다른 PC에 같은 기록 | `learning-sync-ui.mjs`, 캡처 22–23 |

미확인 가정: 실제 사용 빈도, 질문 길이, 노트를 영상 중에 쓰는지 끝나고 쓰는지, 1280 노트북과 1536 이상 모니터 중 주 사용 화면.

## 현행 화면 관찰 (3단계)

새 캡처 없이 2026-11-19 캡처를 사용했다(23단계가 전 과업을 덮음). 전체화면은 자동화 Chrome에서 창 채움 대체 모드로 찍혔다(실제 모니터 전체화면 미확인).

| 캡처 | 과업 | 장점 | 문제 | 사용자 영향 | 개선 가설 |
| --- | --- | --- | --- | --- | --- |
| 05-playing | 시청 | 영상이 넓다 | 1733×833에서 자막·툴바가 첫 화면 아래로 밀림 | 일반 모드에서는 스크롤해야 자막을 봄 | 일반 모드도 영상+자막을 한 화면에 |
| 18-fullscreen-chat | 묻기 | 영상·자막·채팅 동시 표시, 자동 멈춤 | 4탭 중 하나만 보임, 상단 설정 2줄이 대화 공간 차지 | 답을 보며 내 설명을 쓸 수 없음 | 대화와 노트를 동시에 |
| 19-fullscreen-record | 적기 | 원문 앵커·자동 멈춤 | 긴 폼(도움 정도, 복습, 접힌 4개)이 320px에 세로로 쌓임 | 저장 버튼이 스크롤 아래 | 짧은 노트 + 세부는 나중에 |
| 14-my-records-list | 다시 보기 | 원문·설명·복습 함께 보관 | 모달이 영상을 가림, 강의와 분리 | 기록 보며 해당 장면 재생 불가 | 노트를 강의 옆 상시 영역으로 |
| 02/03-roadmap | 오늘 할 일 | 첫 할 일이 명확 | 모달, 강의 화면과 따로 | 강의 중 '오늘 할 일' 확인에 모달 왕복 | 오늘 할 일을 강의 화면에 상주 |
| 09-ask-panel | 묻기(일반 모드) | 시작 질문 3개 | 질문 버블의 시각 칩은 있으나 보내는 대본 범위는 문장 힌트로만 | 무엇이 근거로 갔는지 안 보임 | 보낸 시점·±60초 범위를 칩으로 보이기 |

한계: 캡처는 한 세션 관찰이며 사람 사용성 시험이 아니다. 대비비·키보드 동작은 스크린샷으로 인증하지 않았다.

## 레퍼런스 적용 (4단계, 확인일 2026-11-19)

사용자 가이드 2개(Google Drive `1uibapms…`, `1VRYj…`)는 로그인 요구로 **열지 못했다**. 스킬 본문의 요약표(증거 유형 먼저, 공식 문서 우선)를 따랐다. Mobbin 등 로그인 사이트는 보지 않았다.

| 출처 | 근거 유형 | 관찰 원리 | 적용 가설 | 가져오지 않을 것 | 확인 수준 |
| --- | --- | --- | --- | --- | --- |
| [Google 블로그 2024-12 재설계](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-new-features-december-2024/) | 공식 설명 | Sources / Chat / Studio 세 영역, 소스 뷰어와 노트 편집기를 나란히 펼침 | 강의(자료)·대화·노트를 동시에 두면 탭 전환 없이 답을 보며 적음 | Studio의 원클릭 생성물(오디오 요약 등) — Duvi 원칙상 AI는 명시 요청·제안 표시 | 공식 설명, 직접 사용 안 함 |
| [NotebookLM(현 Gemini Notebook) 채팅 도움말](https://support.google.com/notebooklm/answer/16179559?hl=en) | 공식 문서 | 답변 인용 칩 → 선택 시 원문 위치로 이동, 답에 쓸 소스 선택, Save to note | `[mm:ss]` 칩 → 영상 seek(이미 있음)을 모든 시안에 유지, 보낸 맥락(시점·±60초·내 기록)을 선택 가능하게 표시 | "소스만으로 답" 제한 — Duvi 튜터는 일반 설명도 허용 | 공식 문서 |
| [노트 도움말](https://support.google.com/notebooklm/answer/16262519?hl=en) | 공식 문서 | 노트가 소스 패널에 함께 나타나 다음 질문의 근거가 됨, 저장한 답은 인용 제거 후 편집 | 내 기록을 다음 질문 맥락으로(이미 '이 강의의 내 기록' 전송) 보이게 | 저장한 AI 답을 내 설명으로 바꿔 쓰기 — Duvi는 aiAnswer와 내 설명을 분리 | 공식 문서 |
| [Google 블로그 2023-12 noteboard](https://blog.google/innovation-and-ai/products/notebooklm-new-features-availability/) | 공식 설명 | 채팅 인용·원문 발췌·내 메모를 한 noteboard에 핀 | 질문·답·내 설명을 한 노트 흐름으로 | 자동 요약 제안 | 공식 설명 |
| [Coursera 지원 커뮤니티 답변](https://www.coursera.support/s/question/0D51U00003BlYjLSAV/how-do-you-take-notes?language=en_US) | 커뮤니티 설명(검색 요약) | 영상 아래 Save Note(시각 고정), 대본 구간 선택 → Save Note | 대본 문장에서 바로 노트 시작 | 화면 캡처 노트 | 낮음 — 페이지가 JS 렌더라 본문 미확인 |
| [Language Reactor 내보내기 도움말](https://www.languagereactor.com/help/export) | 공식 문서(검색 요약) | 자막 단어를 표시하면 그 문맥 문장과 함께 저장 | 자막 문장에서 저장할 때 영어·한국어 문장 쌍을 함께 | 단어장·플래시카드 기능 | 낮음 — 본문 JS 렌더 |

## 다음 (WIP)

5단계 정보 구조·상태 계약, 6단계 세 시안(HTML/CSS, 1280·1536·전체화면)을 이 문서에 추가한다.
