# Duvi 전체 앱 재설계 · 코드와 과업 인벤토리 (_discovery)

- 작성: 2026-11-24, 읽기 전용 조사(제품 코드 수정 없음).
- 기준: `<duvi>` main **`5f42b61a263f7a3b074e2d66934aa3a4345f9394`**(`git rev-parse HEAD`로 확인, `git status --short` 출력 없음 = 작업 트리 깨끗).
- PR #14 초안: `<duvi PR #14 worktree>`, 브랜치 `design/quiz-checks` HEAD `9b0c056`. `git diff --stat main...HEAD` 결과 새 문서는 `docs/design/2026-11-22-quiz/README.md`(252줄) 1개이고, 나머지 13개는 시안 이미지(webp)다. 이미지는 열어 보지 않았다(§7).
- 커리큘럼 조사 보고서: `<glorious research worktree>/research/20261123-curriculum-vs-goal/REPORT.md`(74줄).
- 표기: `파일:줄`은 기준 커밋의 줄 번호다. 프런트 파일은 대부분 한 줄에 여러 문장을 쓰는 압축 코드라서, 줄 번호는 그 함수나 문장이 시작하는 줄을 가리킨다.

---

## 1. 읽은 범위 (Coverage)

| path | total_lines | last_line_read | method |
|---|---|---|---|
| <duvi>/src/App.jsx | 5 | 5 | Read 1-5 |
| <duvi>/src/main.jsx | 10 | 10 | Read 1-10 |
| <duvi>/src/app.mjs | 251 | 251 | Read 1-251 |
| <duvi>/src/core.mjs | 41 | 41 | Read 1-41 |
| <duvi>/src/media.mjs | 50 | 50 | Read 1-50 |
| <duvi>/src/study-view.mjs | 111 | 111 | Read 1-111 |
| <duvi>/src/library-ui.mjs | 180 | 180 | Read 1-180 |
| <duvi>/src/learning-ui.mjs | 96 | 96 | Read 1-96 |
| <duvi>/src/learning-chat.mjs | 305 | 305 | Read 1-305 |
| <duvi>/src/learning-chat-model.mjs | 60 | 60 | Read 1-60 |
| <duvi>/src/learning-stream-model.mjs | 47 | 47 | Read 1-47 |
| <duvi>/src/learning-timeline.mjs | 47 | 47 | Read 1-47 |
| <duvi>/src/learning-editor.mjs | 65 | 65 | Read 1-65 |
| <duvi>/src/learning-model.mjs | 62 | 62 | Read 1-62 |
| <duvi>/src/learning-tutor-context.mjs | 8 | 8 | Read 1-8 |
| <duvi>/src/learning-map-view.mjs | 52 | 52 | Read 1-52 |
| <duvi>/src/learning-records-view.mjs | 40 | 40 | Read 1-40 |
| <duvi>/src/learning-backup-ui.mjs | 37 | 37 | Read 1-37 |
| <duvi>/src/learning-sync-ui.mjs | 71 | 71 | Read 1-71 |
| <duvi>/src/learning-playback-state.mjs | 43 | 43 | Read 1-43 |
| <duvi>/src/learning-dom.mjs | 12 | 12 | Read 1-12 |
| <duvi>/src/learning-roadmap.mjs | 515 | 515 | Read 1-418, 419-515 |
| <duvi>/src/styles.css | 21 | 21 | Read 1-21 |
| <duvi>/src/library.css | 64 | 64 | Read 1-64 |
| <duvi>/src/study-view.css | 105 | 105 | Read 1-105 |
| <duvi>/src/learning.css | 198 | 198 | Read 1-198 |
| <duvi>/index.html | 28 | 28 | Read 1-28 |
| <duvi>/server.mjs | 20 | 20 | Read 1-20 |
| <duvi>/backend/http-server.mjs | 156 | 156 | Read 1-156 |
| <duvi>/backend/learning-service.mjs | 26 | 26 | Read 1-26 |
| <duvi>/backend/learning.mjs | 87 | 87 | Read 1-87 |
| <duvi>/backend/learning-chat.mjs | 123 | 123 | Read 1-123 |
| <duvi>/backend/learning-tutor.mjs | 35 | 35 | Read 1-35 |
| <duvi>/backend/learning-curriculum.mjs | 58 | 58 | Read 1-58 |
| <duvi>/backend/library.mjs | 165 | 165 | Read 1-165 |
| <duvi>/backend/folders.mjs | 75 | 75 | Read 1-75 |
| <duvi>/backend/learning-backup.mjs | 95 | 95 | Read 1-95 |
| <duvi>/backend/learning-sync.mjs | 210 | 210 | Read 1-210 |
| <duvi>/backend/chatgpt-translate.mjs | 161 | 161 | Read 1-161 |
| <duvi>/docs/LEARNING_DESIGN.md | 192 | 192 | Read 1-192 |
| <duvi>/docs/CONCEPT_MAP.md | 352 | 352 | Read 1-352 |
| <duvi>/docs/LEARNING_CURRICULUM.md | 470 | 470 | Read 1-327, 328-470 |
| <duvi>/docs/CURRICULUM_EVALUATION.md | 214 | 214 | Read 1-214 |
| <duvi>/docs/HOW_TO_STUDY.md | 167 | 167 | Read 1-167 |
| <duvi>/docs/FIRST_STEPS.md | 111 | 111 | Read 1-111 |
| <duvi>/docs/STUDY_GUIDE.md | 1018 | 1018 | Read 1-300, 301-660, 661-1018 |
| <duvi>/docs/MULTI_DEVICE_SYNC.md | 35 | 35 | Read 1-35 |
| <duvi>/README.md | 206 | 206 | Read 1-206 |
| <duvi>/AGENTS.md | 80 | 80 | Read 1-80 |
| <duvi>/DESIGN.md | 312 | 312 | Read 1-312 |
| <duvi PR #14 worktree>/docs/design/2026-11-22-quiz/README.md | 252 | 252 | Read 1-252 |
| <glorious research worktree>/research/20261123-curriculum-vs-goal/REPORT.md | 74 | 74 | Read 1-74 |

합계 52개 파일(src 26 + index.html + server.mjs + backend 11 + docs 9 + README/AGENTS/DESIGN 3 + PR #14 문서 1 + REPORT 1).

줄 수 기준: 여러 번 나눠 읽은 파일(learning-roadmap 515, LEARNING_CURRICULUM 470, STUDY_GUIDE 1018)은 Read 도구가 보고한 총 줄 수다. Read는 파일 끝 개행 뒤의 빈 줄까지 세므로 `awk NR`(514, 469, 1017)보다 1이 많다. 한 번에 읽은 파일은 도구가 총 줄 수를 따로 표시하지 않아 `awk 'END{print NR}'` 값을 적었다.

backend 범위: 프런트가 `/api/...`로 호출하는 라우터(`http-server.mjs`)와 그 핸들러 모듈 10개를 읽었다. `chatgpt-auth.mjs`, `vault.mjs`, `learning-validation.mjs`, `learning-backup-schema.mjs`, `translation-sync.mjs`, `sync-files.mjs`, `sentence-alignment.mjs`, `core.mjs`, `chat-mock.mjs`는 라우트 파일이 아닌 하위 의존성이라 읽지 않았다(§7).

---

## 2. 화면 인벤토리 (오늘 UI에서 도달 가능한 모든 화면·대화상자·패널·탭)

진입점 구조: `index.html:28`이 `/src/app.mjs`를 로드한다. `main.jsx`·`App.jsx`·`styles.css`는 React 스캐폴드로, 어디서도 로드되지 않는 죽은 코드다(`App.jsx:1-5`는 빈 `<main>`, `styles.css:15` `.mobile-prototype`은 쓰는 곳 없음).

| # | 화면 | 도달 경로(클릭) | 만드는 곳 | 상태 |
|---|---|---|---|---|
| S1 | **내 강의 사이드바** | 항상 보임. 960px 이하에서는 숨김 | `index.html:4`, 목록 렌더 `library-ui.mjs:49` `render()`, 행 `library-ui.mjs:87` `lectureRow()` | 불러오는 중("강의를 불러오는 중…"), 검색 결과 없음, 폴더 접힘/펼침/검색 중 강제 펼침, 빈 폴더, 읽기 전용 단계 폴더("영상 대신 읽기·실습", `library-ui.mjs:57-76`), 단계 진행 막대, 강의 행 상태(현재·완료 ✓·"mm:ss부터 이어보기"·"열면 영어 자막 준비"·"영어 자막 확인 필요"·"재생 제한"·썸네일 없음) |
| S1a | 사이드바 "학습 진행·다음" 블록 | 사이드바 "학습 로드맵" 버튼 아래 | `learning-ui.mjs:34`(생성), `learning-ui.mjs:58` `sync()` | "학습 n/N개 완료·%", "다음 · 제목" 버튼, 전부 완료 시 "✓ 계획 완료 · 복습하기", 강의 열기 오류와 "로드맵에서 강의 준비" |
| S1b | 모바일 라이브러리 서랍 | ≤960px에서 헤더 패널 아이콘 | `index.html:12` `#mobileLibrary`, 이동 `app.mjs:225` | 열림/닫힘(닫으면 패널을 `#shell`로 되돌림, `app.mjs:219-224`). 데스크톱 범위 밖 |
| S2 | **강의 추가 대화상자** | 사이드바 "강의 추가" / "재생목록 추가" / 폴더 안 "+ 강의 추가" | `index.html:13-22`, `library-ui.mjs:109` `setMode`, `:122` `import()` | 영상 하나/재생목록 모드, 대기, 진행 중(필드 잠금·progress), 오류(옵션 펼침), 완료("추가한 강의 보기"), 건너뛴 항목 목록. 재생목록 URL을 붙이면 모드가 자동 전환됨 |
| S3 | 새 폴더 / 폴더 관리 대화상자 | "새 폴더" 또는 폴더 행의 ⋯ | `index.html:23`, `library-ui.mjs:149` | 만들기/이름 변경/삭제, 오류, 삭제 도움말 |
| S4 | 강의 이동 대화상자 | 강의 행의 폴더 이동 아이콘 | `index.html:24`, `library-ui.mjs:168` | 대상 폴더 선택, 충돌 409 오류 |
| S5 | **강의 화면(일반)** | 사이드바에서 강의 클릭, 또는 URL `?lecture=` | `index.html:5-11`, 로드 `app.mjs:60` `load()` | 강의 불러오는 중, YouTube/MIT 네이티브 플레이어, 영상 오류, 자막 없음 알림(S5c), 이어보기 복원 |
| S5a | 영상 아래 시각 띠 | 강의 화면에서 항상 보임 | `index.html:6` `#timeStrip`, `learning-timeline.mjs:5` `TimeStrip` | 10분 구간 select, 재생 막대, 질문 마커(채움=내 설명 있음 / 빈 원=열린 질문). 마커를 누르면 그 장면으로 이동하고 멈춤(`learning-ui.mjs:21`) |
| S5b | 2줄 자막 영역 + 툴바 | 강의 화면 | `index.html:6-7`, 갱신 `app.mjs:109` `update()` | "영상을 준비…", 번역 없음 안내, 반복 중(aria-pressed), 자동 멈춤, 속도, 강의 완료 토글과 알림(`learning-ui.mjs:32`), 질문하기 버튼 |
| S5c | 자막 없음 알림 | 영어 자막이 없는 YouTube 강의를 열었을 때 | `index.html:9`, `app.mjs:80` `renderCaptionNotice` | 준비 중 / 실패(오류 메시지) / 비공개 영상, "다시 가져오기", SRT·VTT 파일 추가(2MB 제한) |
| S5d | 상태 바 + "재생·자막 정보" 접힘 | 자막 영역 아래 | `index.html:8,11` | 번역 요약("번역 중/완료/저장된 번역 n/N"), 전체 대본 토글, 재생/일시정지, 출처 링크, 라이선스 문구 |
| S6 | **자막 전체화면(몰입 모드)** | 툴바 ⤢, 영상 위 "자막 전체화면", 키보드 F | `study-view.mjs:59` `enter`, `:44` `setActive`, CSS `study-view.css:28-105` | 네이티브 전체화면 / 창 채우기 대체 모드, 컨트롤 자동 숨김(2.5초, `study-view.mjs:39`)과 설정 핸들(⚙), 자막 위치(영상 아래/영상 위 하단/영상 위 상단), 자막 크기 18/22/26/30, Esc·"나가기"로 종료 |
| S7 | **오른쪽 패널(4개 탭)** | 툴바 "질문하기", 상태 바 "전체 대본", 전체화면 "대본" | `index.html:7` `#transcriptPanel`, `study-view.mjs:96` `selectTab`, `:104` `openPanel`. 폭은 일반 320px(`study-view.css:6`), 전체화면 380px(`study-view.css:30`) | 열림/닫힘, 탭 좌우 화살표·Home·End 키 이동 |
| S7a | 대본 탭 | 패널 "대본" 탭 | `app.mjs:75` `renderTranscript`, `index.html:7` | 현재 문장 강조, 따라가기와 사용자 스크롤 시 중지("현재 문장" 버튼), 문장 클릭으로 이동 |
| S7b | **질문하기 탭 ("이 강의 · 시간순")** | 툴바 "질문하기" → 패널 질문하기 탭 | `learning-chat.mjs:14` `ChatPanel`, `:22` `build`, `:103` `renderLog` | 빈 상태+시작 질문 3개(`:136`), 필터 전체/열린 질문(개수 표시), "지금 mm:ss" 선, 질문·답 묶음, 스트리밍(aria-busy·"답변을 준비하는 중…"), 멈춤/끊김 태그, 인용 미리보기 카드(`:221`), 모델 불러오는 중/"ChatGPT 연결 필요"+"연결 설정 열기"(`:241`), "mm:ss에서 질문 중" 시각 칩과 ×, "보낼 자료" 체크 2개, 전송 실패 시 질문을 입력창에 복원("전송되지 않음"), 새 대화 토글 |
| S7b-i | 내 설명(질문 아래) | 질문하기 탭의 "내 설명 쓰기"/"고치기" | `learning-chat.mjs:179` `mine()` | 보기/편집, localStorage 초안(`duvi-explanation-drafts-v1`), AI 도움 정도 select, 409 충돌 → "최신 저장본 확인" |
| S7c | **기록 탭** | 패널 "기록" 탭, 학습 탭의 "현재 시점 기록 남기기", 기록 카드의 "기록 열기" | `learning-editor.mjs:5`, `:11` build, `:48` open | 탭을 열면 영상이 멈춤(`app.mjs:207` onQuestionOpen, 끌 수 있음). 원문 스냅샷 인용, 저장된 AI 답(접힘), 질문/설명, 근거 6칸(접힘 "이 설명을 시험하기"), 도움 정도, 다음 복습(유지/1/3/7/없음), 초안 복원, 서버 충돌 → 비교 → 재정합, 최초 설명·수정·복습 이력, Markdown 미리보기·내려받기, AI 도움(문맥 미리보기 → 명시 전송, `:32` buildTutor) |
| S7d | 학습 탭 ("내 학습") | 패널 "학습" 탭 | `learning-ui.mjs:72` 근처 `renderPanel()` | 이 강의 완료 여부, "다음 · …", 버튼 4개(질문하기·현재 시점 기록·전체 로드맵·복습할 기록 n개), 이 강의의 기록 목록, 불러오기 실패 시 "다시 불러오기" |
| S8 | **학습 로드맵 대화상자** | 사이드바 "학습 로드맵", 학습 탭 "전체 로드맵" | `index.html:12` `#learningDialog`, `learning-ui.mjs:61` `open`, `:65` `select`. 탭 4개 `learning-ui.mjs:29`. 전체화면에서는 stage 안으로 옮겨짐(`:62`) | 불러오는 중, 실패 → "다시 불러오기" |
| S8a | 로드맵 탭 | 대화상자 "학습 로드맵" | `learning-map-view.mjs:4` `renderRoadmap` | 오늘의 카드(전체 진행·다음 할 일·"이 강의 이어서 공부하기"/"읽기·실습 자료 열기 ↗"·"강의 폴더 준비"), 전부 완료 상태, "왜 이 순서로 배우나요? · Glorious Purpose"(`:13`), 원문 출처 줄, 첫 2주 10회 + 선택 편향 실습과 정답 접힘(`:43`), 13단계 접힘(진행 막대, 자료마다 "강의 열기"/"원문 자료 ↗"/완료 토글/활동 5단계 select, v3 해설 영상의 "채우는 개념"(`:28`)), 409 → "최신 상태 확인" |
| S8b | 내 기록 탭 | 대화상자 "내 기록", 채팅 저장 알림의 "열린 질문 보기" | `learning-records-view.mjs:5` | 전체 n / 열린 질문 n 필터, 전체 Markdown 내려받기, 빈 상태 문구 2종, 카드(질문·위치·도움·다음 복습·내 설명·AI 답 접힘·"원문 시점 확인"·개별 MD) |
| S8c | 복습 탭 ("지금 떠올려 보기") | 대화상자 "복습", 학습 탭 "복습할 기록 n개", 사이드바 "계획 완료 · 복습하기" | `learning-records-view.mjs:5`(review=true), `:9` | 만기 기록만 표시, 회상 입력(필수)·도움·다음 간격 1/3/7(기본 3), 이전 설명은 접어 둠, 예정된 복습 목록(날짜순), 409 → 입력 유지 |
| S8d | 백업·동기화 탭 | 대화상자 "백업·동기화" | 백업 `learning-backup-ui.mjs:14`, 동기화 `learning-sync-ui.mjs:17` | 백업: 내려받기, 파일 선택(16MB), 미리보기(항목 수·충돌 수·충돌 ID), merge/replace, 확인 체크, 복원. 동기화: 폴더 미설정/저장/읽기 오류, 다른 PC 없음, 피어 목록, 합치기 미리보기(10분 유효), 확인 체크 → 합치기, 경고 |
| S9 | 설정 대화상자 | 사이드바 "설정", 번역 대화상자의 "계정·번역 방식 설정", 채팅의 "연결 설정 열기"(전체화면이면 먼저 빠져나옴, `app.mjs:234`) | `index.html:25`, 핸들러 `app.mjs:180-196` | 번역 방식(ChatGPT/Chrome), 계정 select·연결·해제, 계정 상태 문구, 단축키 안내 |
| S10 | 이 강의 번역 대화상자 | 상태 바 번역 요약 클릭 | `index.html:26`, `app.mjs:150` `renderAI`, `:197` `startJob` | 모델 목록, 5분/전체 번역, 진행 막대, 멈춤, 작업 메시지와 오류 코드, Chrome 모드 안내 |
| S11 | ChatGPT 구독 환영 대화상자 | 연결 직후 `needsWelcome` | `index.html:27`, `app.mjs:173,196` | "확인"을 누르면 `/api/auth/ack` |
| S12 | OAuth 왕복 | "Continue with ChatGPT" | `app.mjs:183` → `http-server.mjs:110-113`, `/auth/launch/*`·`/auth/callback`(`http-server.mjs:59-69`) | 303으로 `/?auth=returned` 복귀, `authMessage`가 aiStatus에 표시됨 |

코드에 없어서 화면도 없는 것: 확인 문제, 개념 지도 화면, 강의별 개념 표시, 탐구 노트·포트폴리오, GitHub·커밋·테스트 연결, 주간 시간 계획.

---

## 3. 주요 행동의 실제 코드 경로

형식: 진입 → 화면 → 사용자 행동 → 핸들러 → API(서버 파일:줄) → 상태 → 쓰이는 곳.

1. **강의 열기 + 영한 자막 재생**
   부팅 `app.mjs:248`(refreshSession → refreshLibrary(`?lecture`/localStorage/'1') → load) → S1 강의 클릭 → `library-ui.mjs` `select()` → `app.mjs:60` `load()` → `GET /api/lectures/:id`(`http-server.mjs:94` → `library.get`, `library.mjs`) 그리고 `GET /api/translations/:id`(`http-server.mjs:95` → `chatgpt-translate.mjs:80` `cache`). 정렬된 cues/alignmentRevision을 받으면 lecture.cues를 교체한다(`app.mjs:49-58`). → 상태: 모듈 변수 `lecture`·`aiTranslations`, Chrome 번역은 localStorage `mit6100-ko-<id>`, 위치는 `study-positions`. → 사용처: `MediaPlayer.load`(`media.mjs`), `renderTranscript`(`app.mjs:75`), `update()`가 timeupdate마다 영어·한국어를 칠함(`app.mjs:109`). YouTube 자막이 pending이면 `prepareCaptions` → `POST /api/library/captions`(`http-server.mjs:119` → `library.mjs:110`).
   한국어가 없으면: S10 → `startJob` `app.mjs:197` → `POST /api/translate`(`http-server.mjs:124` → `chatgpt-translate.mjs:90`). 전체 번역이면 문장 정렬도 함께 한다. 3초 폴링(`app.mjs:251`)이 job을 보고 캐시를 다시 읽는다.

2. **문장 이동·반복**
   S5b 버튼/←→R → `app.mjs:205-206`(back/next/repeat), 키보드 `app.mjs:232` → `seek(i)` `app.mjs:108`(표시 문장 단위 = 정렬된 cues) → `update()`가 문장 끝에서 반복이면 되감고, 자동 멈춤이면 정지(`app.mjs:113-116`). API 호출 없음. 위치 저장은 `LearningPlaybackState.save`(`learning-playback-state.mjs`), 4초 간격과 beforeunload.

3. **질문하기에서 질문 → 스트리밍 답**
   툴바 "질문하기" `study-view.mjs:107` → `openPanel('chat')` → `ChatPanel.open`(`learning-chat.mjs`) → 입력 시작 시 `typingAnchor`가 시각을 잡음(`learning-chat-model.mjs`) → Enter → `send()` `learning-chat.mjs:255`(필요하면 자동 멈춤) → `streamApi` `app.mjs:34` → `POST /api/learning/chat`(`http-server.mjs:83` → `streamChat` `:23` → `learning-chat.mjs`(backend) `:73` `ask`). 백엔드는 ±60초 대본(`transcriptWindow` `:22`), 이 강의 노트, 로드맵상 위치, 최근 대화를 묶고 시스템 지시 `CHAT_INSTRUCTIONS`(`:10`)를 붙인다. 사용자 메시지를 먼저 `store.appendChat`(`backend/learning.mjs:48`)으로 저장한 뒤 SSE `start/delta/done|error`를 보낸다. → 상태: `backend/learning/state.json`의 `chats[]`. → 사용처: `onEvent` `learning-chat.mjs:278` → `LearningUI.applyThread` → `lectureStream`(`learning-stream-model.mjs:10`) → 채팅 로그와 시각 띠 마커. 멈추기는 `POST /api/learning/chat/stop`(`http-server.mjs:84`). 모델 목록은 `GET /api/learning/chat/models`(`:85`).

4. **답을 기록으로 저장 (지금은 수동 "기록으로 저장")**
   S7b 답 카드 "기록으로 저장" `learning-chat.mjs:173` → `saveRecord` `:298` → `POST /api/learning/chat/record`(`http-server.mjs:101` → backend `learning-chat.mjs:111`). 질문 시각의 cue로 anchor를 만들고, record={question, explanation:'', aiAnswer, help:'full', reviewDueAt:+1일}(`:120`)를 `store.saveChatRecord`(`backend/learning.mjs:64`)가 쓰면서 message.recordId를 연결한다. → 상태: `records[]`. → 사용처: 열린 질문 필터, 복습(다음 날), 시각 띠 빈 원 마커, 기록 탭의 "저장한 AI 튜터 답변". **질문을 보내는 것만으로는 records에 들어가지 않는다.** 채팅 thread에만 남고, 그래도 시각 띠·시간순 흐름에는 "열린 질문"으로 표시된다(`learning-stream-model.mjs` `item.open=true`).

5. **내 설명 쓰기·고치기**
   (a) 채팅 흐름 안: "내 설명 쓰기" `learning-chat.mjs:179` → 저장 → `LearningUI.saveExplanation` `learning-ui.mjs:47`. 기록이 없으면 먼저 `/api/learning/chat/record`로 만들고, 이어서 `saveRecord` → `mutate('/api/learning/records')`(`learning-ui.mjs:92`) → `POST /api/learning/records`(`http-server.mjs:98` → `backend/learning.mjs:23` `saveRecord`). recordRevision을 검사하고, 이전 판을 `history[]`에 넣으며, 최초 설명 `originalExplanation`(`newRecord`)은 보존한다.
   (b) 기록 탭: `learning-editor.mjs:60` `save()` → `validateRecord`(`learning-model.mjs:45`, 영어 자막 시점이 필수) → 같은 API. 409가 나면 초안을 유지하고 비교한 뒤 재정합한다. AI 도움은 `POST /api/learning/tutor`(`http-server.mjs:81` → `learning-tutor.mjs`)로 가고, 응답 본문은 저장하지 않고 도움 정도만 저장한다.

6. **만기 복습**
   S8c → `renderRecords(review)` → `dueRecords`(`learning-model.mjs:27`) → 회상 제출 → `LearningUI.review` `learning-ui.mjs:95` → `POST /api/learning/review`(`http-server.mjs:100` → `backend/learning.mjs:77`). `reviews[]`에 추가하고 `reviewDueAt`=+intervalDays. → 사용처: 복습 목록, 예정 목록, 학습 탭 "복습할 기록 n개", 채팅 "내 설명 · 복습 날짜".

7. **로드맵 → 다음 할 일 → 완료**
   부팅 `learningUI.init` → `refresh` `learning-ui.mjs:57` → `GET /api/learning` + `GET /api/learning/roadmap`(`http-server.mjs:88,91`, 서버가 `src/learning-roadmap.mjs`의 `ROADMAP`을 그대로 import). 다음 할 일은 `nextResource`(`learning-model.mjs:18`, 학습 중·실습 중 자료가 우선이고 없으면 순서상 첫 미완료). "이어서 공부하기"/"강의 열기" → `openResource` `learning-ui.mjs:87` → `app.mjs:243` onOpen(라이브러리에 없으면 "폴더 준비" 오류). 외부 자료는 링크만 연다(`learning-map-view.mjs:3`). 완료: 툴바 "강의 완료"/사이드바 ○/로드맵 "완료로 표시" → `complete` `learning-ui.mjs:94` → `POST /api/learning/progress`(`http-server.mjs:99` → `backend/learning.mjs:72`, `{status, completed}` 토글) → `progress[resourceId]` → 사용처: 사이드바 배지와 단계 막대(`onStateChange` → `libraryUI.setLearning`), 로드맵, 학습 탭. 활동 5단계 select는 같은 API에 status만 보낸다. "강의 폴더 준비" → `prepare` `learning-ui.mjs:90` → `POST /api/learning/prepare`(`http-server.mjs:108` → `learning-curriculum.mjs:7`): YouTube 메타 파일(cues 비어 있음)을 만들고 단계 폴더 13개의 순서를 맞춘다.

8. **폴더·재생목록 가져오기**
   S2 → `LibraryUI.import` `library-ui.mjs:122` → 재생목록이면 `POST /api/library/playlist`(`http-server.mjs:118` → `library.mjs:79`, yt-dlp `--flat-playlist`, 최대 500개, 강의 JSON은 cues 비어 있음 → `folders.mjs:65` `addPlaylist`), 영상이면 `POST /api/library/import`(`:117` → `importIntoFolder` → `library.mjs:138` `import`, yt-dlp 메타 → json3 자막 또는 사용자 SRT/VTT → `normalizeCues`→`sentences`). 폴더 CRUD는 `/api/folders/create|rename|delete|move`(`http-server.mjs:120-123` → `folders.mjs`). → 상태: `backend/library/yt_*.json`, `backend/library/folders.json`. → 사용처: `GET /api/library`·`/api/folders` → 사이드바.

9. **백업·동기화**
   백업: S8d "전체 백업 내려받기" → `GET /api/learning/export`(`http-server.mjs:89` → `learning-backup.mjs` capture)에 브라우저 허용 키(`learning-backup-ui.mjs:3`)를 합쳐 JSON으로 내려받는다. 복원: 파일 → `POST /api/learning/import/preview`(`:102`, 16MB 한도 `:76` → `learning-backup.mjs:48`, 토큰 10분) → 체크 → `POST /api/learning/import`(`:103` → `:61` commit; 저널 쓰기, before-import.json, 실패 시 recover) → 브라우저 키 적용.
   동기화: `GET /api/learning/sync`(`:90`) → 폴더 저장 `POST /api/learning/sync/folder`(`:104`, Git 작업 트리와 Duvi 데이터 폴더 거부 `learning-sync.mjs:122`) → 내보내기 `POST /api/learning/sync/export`(`:105` → `learning-sync.mjs:150`, 위치·번역 별도 파일) → 다른 PC: 미리보기 `/sync/preview`(`:106` → `:169`) → 합치기 `/sync/import`(`:107` → `:194`; 기록은 descends/conflict 병합, 대화는 메시지 합집합, before-sync.json) → 위치를 브라우저에 병합(`resumeSync.merge`, `app.mjs:238-241`).

---

## 4. 후보 과업 기능 상태

| 과업 | 상태 | 근거 |
|---|---|---|
| (a) 강의 시청 + 영한 자막 + 질문이 시간축에 **자동** 기록 | **partial** | 시청과 영한 정렬 자막은 구현됨(`app.mjs:60,109`; 정렬 `chatgpt-translate.mjs:90`, README "영어·한국어 문장 맞추기"). 질문은 thread에 `seconds`와 함께 자동 저장되고(`backend/learning-chat.mjs:73`, 메시지에 seconds) 시각 띠·시간순 흐름에 "열린 질문"으로 바로 나타난다(`learning-stream-model.mjs:10`, `learning-timeline.mjs`). 그러나 **학습 기록(records)·복습·열린 질문 목록(내 기록)·Markdown에는 "기록으로 저장"이나 내 설명 저장 때만 들어간다**(`learning-chat.mjs:173,298`; AGENTS.md:69 "becomes a learning record only when the learner presses 기록으로 저장"). 자동 기록화는 현재 사용자 결정과 충돌하므로 바꾸려면 결정 변경이 필요하다. |
| (b) 대본 + 학습자의 GitHub 코드·위키로 만드는 확인 문제 (PR #14 + 사용자 아이디어) | **design-only**(대본 기반) / **idea**(GitHub 코드·위키 기반) | PR #14 README:26 "확인 문제 없음. quiz/퀴즈/문제 생성 코드 0건". 설계: 검증 계약(`README:128` §7: executed/source_quoted/learner_confirmed/ai_unverified/retired), `backend/quizzes/<강의>.json`과 state `attempts`(스키마 3)(`:158` §8), 시안 A~E와 권고 "B 뼈대 + C 카드"(`:216`), 진단 사례 D·설계 세션 E는 Glorious 기록(EXP-065 등)을 출처로 쓴다(`:92-127`). 학습자 **자신의 GitHub 코드·위키·커밋**으로 문제를 만드는 경로는 PR #14에도 없다. P0 표(`:230`)는 "학습자 자신의 실습 코드·commit 연결은 범위 밖"이라고 적었다. 열린 결정: 학습자 코드 Pyodide 실행(`:252`), AGENTS.md:44 "run learner code 금지"와 충돌. |
| (c) 개념 지도 개관 + 강의가 다루는 개념 | **partial(문서) / idea(앱)** | 개념 160개 지도는 문서로만 있다(`docs/CONCEPT_MAP.md`, R-019 사본). 개념→자료 대응은 `docs/STUDY_GUIDE.md`(생성물, `scripts/study-guide-data.json` 기반). 앱에서는 v3 해설 영상 58개만 `concepts` 필드가 있고(`learning-roadmap.mjs` extraVideos 5번째 요소, `extra()`), 로드맵 행에 "신규 해설 영상 · 채우는 개념"이라는 한 줄 텍스트로만 표시된다(`learning-map-view.mjs:28`). 나머지 169개 자료와 MIT 강의에는 개념 태그가 없다. 개념 지도 화면, 개념별 숙련 기록, 강의를 여는 순간의 "이 강의의 개념" 표시는 없다. 채팅 백엔드는 로드맵 위치(단계·자료 제목·설명)만 보낸다(`backend/learning-chat.mjs` `lecturePlace`). |
| (d) P0 로컬 커밋·테스트 결과에서 학습 증거 | **idea**(Duvi 안) | src에서 github/commit/pytest를 grep하면 로드맵 문구 외 0건. `FIRST_STEPS.md:24`, `LEARNING_DESIGN.md` 구현 경계는 "Duvi는 코드를 실행하지 않는다, 임의 셸 실행 추가 금지"다. 기록에는 `result` 자유 텍스트 칸("코드/노트북 경로·seed·한계", `learning-editor.mjs:4` labels)만 있다. 출처: PR #14 README:230(Glorious QA 세션 S-20261122-DUVI-LIVE-QA의 P0 제안). |
| (d) P1 Glorious Purpose 연결 | **partial(정적) / design-only** | 정적 연결: 로드맵 정본 URL과 commit(`learning-roadmap.mjs:2-3`), "왜 이 순서로 배우나요? · Glorious Purpose" 접힘(`learning-map-view.mjs:13`), 8단계 Glorious 문서 링크 7개(공개 URL 404, REPORT.md:26), 기록 Markdown의 빈 "연구 연결 (직접 확인 후 작성)" 칸(`learning-model.mjs:54`), 채팅 지시문의 로드맵 위치. 동적 연결(실험 결과·커밋·과제)은 PR #14 D/E 설계(README:231)와 LEARNING_DESIGN 목표 7번(`:92`, 미구현)뿐이다. |
| (d) P4 증거 기반 진척도 | **design-only** | 현재 진척도는 "완료 표시한 자료 수"뿐이다(`learning-model.mjs` `completionSummary`; 화면 문구 `learning-map-view.mjs:14` "시청 시간이나 이해도를 뜻하지 않습니다"). 활동 5단계는 자기 표시다(`learning-model.mjs:1` PROGRESS). 증거 기반 진척은 PR #14 README:234(모델 감각 지도 8칸, 도움 없이 푼 수)에서 설계로만 있고, "로드맵 완료 조건에 묶을지는 미정"이다. |

---

## 5. 재설계가 드러내야 할 커리큘럼 빈틈 (REPORT.md)

- **판정 통계와 인과 구조 학습이 로드맵·개념 지도에서 0건이다**(REPORT.md:9, :16). 진행 중인 EXP-073 주제가 인과 구조 학습(GIES·SCM)이다(:16). → 앱에 "개념 지도에 아예 없는 축"을 표시할 자리가 필요하다.
- **직무 축(분산 시스템·사후학습/평가·데이터 파이프라인)은 앱에서 재생되는 자료가 0개이고, 글쓰기는 1주제다**(:15).
- **링크 상태**: 216/227 정상. 8단계 GitHub 링크 7개 404, Stanford 3개 삽입 차단, Sutton·Barto PDF 끊김(:25). → 자료 행에 링크 상태를 보여 줄 필요가 있다.
- **8단계가 가장 약하다**: 앱 재생 0/7, 링크 404, 다루는 실험이 EXP-054~056인데 현재는 EXP-073이다(:26).
- **프로젝트 개념 113개 중 있음 48, 일부 24, 없음 41**(:27). 판정 오류는 커버리지를 부풀리는 쪽이라 실제 빈칸은 더 크다(:28).
- **단계별 수준 차이**: 1 Python "큼"(ProcessPool·원자적 저장·subprocess·SHA-256)(:34), 3·3B "큼"(Holm·BH·TOST·Wilcoxon·쌍 부트스트랩·검정력)(:35), 4 인과 "큼"(GIES)(:36), 5D "중간"(GP 실습 없음)(:37), 7 "중간"(:38).
- **설계 세션에 급한 빈칸 상위**: 다중 비교 보정, TOST, 검정력·MDE, Wilcoxon·부호 순열, 쌍 부트스트랩, 확증 vs 탐색, 사전등록, GIES, 라우터·오라클 상한, 긴 실험 운영(:43). 실패 사례 19건 중 14건이 "없음" 개념을 필요로 하며, **Duvi 확인 문제의 진단 사례 원료로 쓸 수 있다**(:44). PR #14 D와 바로 이어진다.
- **보강 제안(확정 아님)**: 새 3C(판정 통계), 4단계 확장(인과 구조), MIT 19~26 + 새 5E(긴 실험 운영), 새 9(LLM 스택)(:52-56). MIT 19~26강은 이미 설치돼 있지만 로드맵에 없다(:20).
- **미측정**: 두 빈칸 중 어느 쪽이 학습자에게 더 큰지(:69). 영상 내용은 확인하지 않았다(:70).

Duvi 문서에 남은 관련 빈틈(CURRICULUM_EVALUATION.md): 읽기 자료에 대한 질문은 저장할 수 없다(:94, `validateRecord`가 영어 자막을 요구), 주당 시간 계획 없음(:127), "보기 전 예측" 체크포인트 없음(:143), 읽기 자료용 기록(anchor 확장)은 미구현(:142).

---

## 6. 실제 적용 중인 디자인 토큰과 사용자 결정

### 6.1 토큰 (CSS 기준; DESIGN.md §2-4는 같은 값을 문서화)

| 항목 | 값 | 위치 |
|---|---|---|
| 글꼴 | Noto Sans KR Variable, Arial, sans-serif. 기본 15px | `library.css:1-2` |
| 색 | `--blue #1769e8`, `--muted #617088`, `--line #e5eaf1`, `--soft #f2f5fa`, 글자 `#111a2d`, 배경 `#fff` | `library.css:2` |
| 의미 별칭 | `--library-surface #f8fafd`, `--selected #eaf2ff`, `--ink #111a2d`, `--focus #75a6f0` | `library.css:21` |
| 간격·크기 | `--space-1..6` = 4/8/12/16/20/24, `--text-small 12`, `--text-body 14`, `--text-tiny 11`, `--target 44px`, `--thumb-width 72px`(961–1400px 48, ≤960px 64), `--radius-small 6` | `library.css:21`, `:63-64` |
| 경고 색 | `.notice` `#8b3d24` | `library.css:4` |
| 버튼·입력 | 최소 높이 44px, radius 9(버튼)/8(입력), primary는 blue, 호버 `#eaf1fc` | `library.css:2` |
| 제목 | h1 27px/720, h2 25px, 강의 제목 clamp(22,2vw,31) | `library.css:2,4` |
| 레이아웃 | 사이드바 `clamp(280px,25vw,372px)`(≥1700px에서 350), main 최대 1500px, padding 25/26 | `library.css:3,4,8` |
| 영상 | 16:9, `#080808`, radius 10 | `library.css:4` |
| 일반 자막 | 상자 min 184 / max 340px, 2행 grid, 글자 clamp(17px,1.65vw,25px) | `library.css:4,18` |
| 대본 패널 | 일반 320px(gap 20), ≤1100px에서 아래로 | `study-view.css:6,84` |
| 시각 띠 | 띠 높이 24px, 마커 24px 대상/12px 점 | `study-view.css:14-26` |
| 전체화면 | 배경 `#090b10`, 면 `#141922`/`#0f141d`, 버튼 `#232e40`, 선택 `#203652`, 패널 380px, 자막 `--fullscreen-caption-size` 기본 22(18/22/26/30), 줄 1.5, 최대 4.5em | `study-view.css:28,30,45` |
| 대화상자 | 560px, radius 14, padding 26. 학습 대화상자 `--learning-width 1040px`, 읽기폭 760px, 입력 최소 96px, radius 8 | `library.css:6`, `learning.css:1` |
| 채팅 | 높이 min(80dvh,700px), 사용자 말풍선 selected, AI 말풍선 soft + line 테두리, 시각 칩 26px pill, 인용 카드 `--ink` 배경 | `learning.css:99`, `:173` |

### 6.2 사용자 결정: 기능 약속 vs 시각·배치

**기능 약속(데이터·개인정보·라벨·판정)** — 재설계해도 유지해야 한다.
- 범용 강의 앱이며 MIT 전용이 아님(AGENTS.md:3).
- 영한 문장 경계를 같은 원자적 캐시에 저장하고, 경계가 바뀐 뒤 인덱스 키 번역을 재사용하지 않음. 문장 이동과 반복은 표시 단위로(AGENTS.md:25).
- 폴더를 지워도 강의는 남김, 재생목록 자막 실패에도 영상은 유지(AGENTS.md:13-16).
- 인증 정보·강의/번역 데이터·로그는 Git에 넣지 않음, 기존 vault 경로 유지(AGENTS.md:34).
- 첫 행동은 "학습 로드맵 → MIT 1강", 정본 URL·commit 유지, 경쟁 일정 금지, 폴더 준비가 자막 다운로드나 완료를 암시하지 않음(AGENTS.md:38-40).
- 질문 한 줄로 시작 가능, 근거 칸은 선택. 최초 설명·수정 이력·도움 정도·복습 이력 보존. **AI 도움은 선택이고, 명시적으로 요청하며, 원문 근거가 있고, "제안"으로 표시. 시청 시간·자기 표시·AI 승인은 숙달을 인증하지 않음**(AGENTS.md:42).
- `backend/learning/`·초안·백업은 비공개. 복원은 검증된 미리보기와 충돌 정책 선택, 인증 정보 제외. **노트 게시, 학습자 코드 실행, 외부 저장소 push를 자동 학습 동작으로 하지 않음**(AGENTS.md:44). (b)·(d) 설계에 직접 걸리는 조항이다.
- 완료는 명시적이고 되돌릴 수 있으며 활동·위치·숙달과 분리. 읽기 전용 단계를 빈 영상 폴더로 보이지 않기(AGENTS.md:50-52).
- 질문하기 답은 학습자 본인의 ChatGPT 연결로 스트리밍, 강의별 대화 보관, **"AI 제안" 라벨, "기록으로 저장"을 눌러야 학습 기록이 됨**, `DUVI_CHAT_MOCK=1`은 QA 전용이며 기본값이 아니고 답 품질의 증거가 아님(AGENTS.md:66-71).
- B+: 표시는 채움/빈 원, 마커를 누르면 이동+멈춤, 내 설명은 AI 답과 따로 저장, 질문 시각은 입력 시작 시점, "보낼 자료" 체크가 실제 전송 내용을 바꿈(AGENTS.md:73-80).
- DESIGN.md:94 "가짜 개수·자동 숙달 금지", :100 "AI 요청은 보낼 문맥을 그대로 보이고 명시적으로 전송", :306 채팅 답 기록의 help "full"·다음 날 복습.

**시각·배치** — 재설계 대상이지만 사용자가 고른 것이다.
- 2026-10-09 시안 concept-1: 왼쪽 강의 라이브러리, 넓은 영상, 분리된 영어/한국어 자막 영역, 조용한 파랑/흰색(AGENTS.md:3).
- 전체화면은 영상 밖 compact 자막이 기본, 대본은 선택형 오른쪽 패널, 컨트롤 자동 숨김, 오버레이 옵션(AGENTS.md:27-31).
- 전체화면이 핵심 화면이고 이번 범위는 데스크톱. 1280·1536에서 잘림 없음, YouTube iframe 위에서도 숨은 컨트롤에 닿을 수 있어야 함(AGENTS.md:58-64).
- B+: 넓은 영상·2줄 자막·영상 아래 시각 띠, 패널은 필요할 때만 열고 사이드바는 유지(AGENTS.md:73-80).
- DESIGN.md §2-4(색·글꼴·간격), §8(전체화면 수치), 장식 애니메이션 없음(§6).

---

## 7. 모르는 것·가정

1. **시안 이미지 13장(webp)은 열어 보지 않았다.** PR #14 README의 시안 설명만 근거로 썼다.
2. 읽지 않은 backend 하위 모듈: `learning-validation.mjs`(정확한 스키마·한도 `CHAT_LIMITS`), `learning-backup-schema.mjs`, `translation-sync.mjs`, `sync-files.mjs`, `sentence-alignment.mjs`, `chatgpt-auth.mjs`, `vault.mjs`, `chat-mock.mjs`, `backend/core.mjs`. state의 정확한 schemaVersion(DESIGN §12는 "learning state v2"라고 씀)은 validation을 보지 않아 미확인이다.
3. `scripts/study-guide-data.json`(개념→자료 대응 원본)과 `scripts/study-guide.mjs`는 읽지 않았다. 개념 커버리지를 앱 데이터로 쓸 수 있는 형태인지 확인이 필요하다.
4. 실제 브라우저 동작, 실제 ChatGPT 응답, 라이브 데이터(강의 수·기록 수)는 이번에 관찰하지 않았다. 이 인벤토리는 소스와 문서만 근거로 한다.
5. **문서와 코드가 어긋난 곳**(재설계 때 정리 필요):
   - DESIGN.md §12(:275-)는 질문하기에 "conversation select"가 있다고 쓰지만 현재 코드에는 없다. `threadLabel`(`learning-chat-model.mjs:57`)은 정의만 있고 쓰이지 않으며, B+에서 "새 대화" 토글로 대체됐다.
   - LEARNING_DESIGN.md:26 "AI 응답 전문 영속 보관 없음"은 채팅에서는 틀린 말이다(chats·aiAnswer로 저장됨). 기록 탭 튜터 답에만 맞다.
   - README.md:133 "두 PC 사이에 자동 동기화는 없습니다"는 수동 폴더 동기화가 생긴 뒤에도 "자동"이라는 점에서 기술적으로는 참이지만, 바로 앞 문단과 함께 읽으면 혼란스럽다.
   - `http-server.mjs` `/health`의 app 이름 `mit-dual-player`와 `staticFiles`의 `/style.css`·`/app.mjs` 목록은 이전 플레이어의 잔재로 보인다(Vite 빌드 자산은 `/assets/*`).
6. 백업 허용 키(`learning-backup-ui.mjs:3`)에 채팅 설정(`duvi-chat-*`), 접힌 폴더, `study-position-stamps`가 빠져 있다. 의도인지는 미확인이다.
7. 가정: "질문 자동 기록"(a)은 AGENTS.md:69의 현 결정을 바꾸는 일이라 사용자 승인이 필요하다고 본다. (b) GitHub 코드 기반 문제와 (d) P0 커밋·테스트 증거는 AGENTS.md:44(학습자 코드 실행·외부 push 금지)와 FIRST_STEPS.md:24의 경계를 건드리므로, 읽기 전용(로컬 git log, 테스트 결과 파일 가져오기)과 실행형을 나눠 결정해야 한다고 본다.
8. 이 작업은 omo QA 실행자 형식으로 받았지만 제품 변경이 없는 읽기 전용 인벤토리여서 manualQa 매트릭스는 만들지 않았다. ulw attempt 디렉터리를 조회할 JS eval 도구도 이 세션에는 없었다.
