# 전체화면 채우기·학습 흐름 점검 (2026-11-18)

[← QA 증거 목록](../README.md)

## 무엇을 확인했나

설치 직후 첫 화면부터 학습 로드맵 → 강의 열기 → 보기 전 예측 → 질문 저장 → 전체화면 안에서 기록·복습·백업·동기화까지 학습자의 첫 클릭 순서대로 따라가며 찍었습니다. 이름 끝이 `-fixed`인 화면은 같은 날 전체화면 막대 수정(e71fed0)을 반영한 뒤입니다. 50~60번은 같은 PC 안의 두 격리 상태(PC A, PC B)로 클라우드 폴더 동기화를 시험했습니다.

## 어떻게 확인했나

- 브라우저: 임시 프로필을 쓰는 헤드 있는(창이 보이는) Chrome을 omowright 라이브러리로 조종했습니다. 사용자의 Chrome 프로필이나 로그인은 쓰지 않았습니다.
- 진짜 전체화면: 앱의 전체화면 버튼을 CDP 마우스 이벤트로 실제 클릭해 `document.fullscreenElement`가 `#stage`가 되는 것을 확인했습니다. 이 PC는 다른 창이 앞에 있어서 Chrome 창의 전체화면 상태는 요청이 허락된 뒤 CDP로 맞췄습니다. 기본 화면은 1536x864(1920x1080, 125% 배율)입니다.
- 상태: 저장소 복사본, 빈 `LOCALAPPDATA`, 사용하지 않는 포트의 별도 서버를 썼습니다. 평소 쓰는 6103 서버와 계정 보관소는 건드리지 않았습니다.
- 10~12번은 헤드리스 1440px이라 진짜 전체화면이 아닙니다.
- 42-exported-records.md의 질문은 QA가 직접 쓴 예시이고 실제 학습자의 기록이 아닙니다.
- 이미지: 원본 PNG를 최대 너비 1600px, 품질 80의 WebP로 바꿨습니다. 내용은 그대로이고 PC 이름이나 로컬 경로가 보이던 곳만 회색 상자("가림")로 덮었습니다.

## 파일별 내용 (이미지 74장, 원자료 1개)

판정 표시: ✅ 기대대로 동작 · ❌ 결함이 보임 (대부분 이후 커밋에서 수정) · "시작"/"관찰"은 비교 기준 화면입니다.

| 파일 | 보이는 것 | 판정 |
|---|---|---|
| [01-home-1280.webp](01-home-1280.webp) | 창 1280 | ✅ 관찰 · 통과 |
| [01-home-after-setup-1280.webp](01-home-after-setup-1280.webp) | 창 1280 · 설치 직후 홈 | ✅ 관찰 · 통과 |
| [02-roadmap-1280.webp](02-roadmap-1280.webp) | 창 1280 | ✅ 관찰 · 통과 |
| [03-roadmap-micrograd-1280.webp](03-roadmap-micrograd-1280.webp) | 창 1280 · 로드맵 micrograd 단계 | ✅ 관찰 · 통과 |
| [04-roadmap-micrograd-row.webp](04-roadmap-micrograd-row.webp) | 로드맵의 micrograd 줄 | ✅ 관찰 · 통과 |
| [04b-prepare-done.webp](04b-prepare-done.webp) | 강의 준비 완료 | ✅ 관찰 · 통과 |
| [05-after-open-lecture.webp](05-after-open-lecture.webp) | 강의 연 직후 | ✅ 관찰 · 통과 |
| [05-lecture-opened-1280.webp](05-lecture-opened-1280.webp) | 창 1280 · 강의 열림 | ✅ 관찰 · 통과 |
| [06-lecture-controls-1280.webp](06-lecture-controls-1280.webp) | 창 1280 · 강의 조작 막대 | ✅ 관찰 · 통과 |
| [07-question-panel-before-play-1280.webp](07-question-panel-before-play-1280.webp) | 창 1280 · 재생 전 질문 패널 | ✅ 관찰 · 통과 |
| [08-predict-before-watching-1280.webp](08-predict-before-watching-1280.webp) | 창 1280 · 보기 전 예측 입력 | ✅ 관찰 · 통과 |
| [09-playing-1280.webp](09-playing-1280.webp) | 창 1280 · 재생 중 | ✅ 관찰 · 통과 |
| [09a-owned-lecture.webp](09a-owned-lecture.webp) | 가져온 강의 | ✅ 관찰 · 통과 |
| [10-playing-1440-headless.webp](10-playing-1440-headless.webp) | 창 1440 · 재생 중 (헤드리스 1440, 진짜 전체화면 아님) | ✅ 관찰 |
| [11-question-autopause-1440-headless.webp](11-question-autopause-1440-headless.webp) | 창 1440 · 질문 시 자동 일시정지 (헤드리스 1440, 진짜 전체화면 아님) | ✅ 관찰 |
| [12-question-saved-1440-headless.webp](12-question-saved-1440-headless.webp) | 창 1440 · 질문 저장됨 (헤드리스 1440, 진짜 전체화면 아님) | ✅ 관찰 |
| [20-fs-playing-1280-fixed.webp](20-fs-playing-1280-fixed.webp) | 전체화면 1280 · 재생 중 | ✅ 수정 후 (e71fed0) · 통과 |
| [20-fs-playing-1280.webp](20-fs-playing-1280.webp) | 전체화면 1280 · 재생 중 | 수정 전 (e71fed0 이전) 관찰 |
| [20-fs-playing-1536-fixed.webp](20-fs-playing-1536-fixed.webp) | 전체화면 1536 · 재생 중 | ✅ 수정 후 (e71fed0) · 통과 |
| [20b-fs-controls-hidden-1280.webp](20b-fs-controls-hidden-1280.webp) | 전체화면 1280 · 막대 자동 숨김 | 수정 전 (e71fed0 이전) 관찰 |
| [20b-fs-idle-mouse-over-video-1280-fixed.webp](20b-fs-idle-mouse-over-video-1280-fixed.webp) | 전체화면 1280 · 영상 위에 마우스 멈춤 | ✅ 수정 후 (e71fed0) · 통과 |
| [20b-fs-idle-mouse-over-video-1280.webp](20b-fs-idle-mouse-over-video-1280.webp) | 전체화면 1280 · 영상 위에 마우스 멈춤 | 수정 전 (e71fed0 이전) 관찰 |
| [20b-fs-idle-mouse-over-video-1536-fixed.webp](20b-fs-idle-mouse-over-video-1536-fixed.webp) | 전체화면 1536 · 영상 위에 마우스 멈춤 | ✅ 수정 후 (e71fed0) · 통과 |
| [20c-fs-top-edge-controls-1280-fixed.webp](20c-fs-top-edge-controls-1280-fixed.webp) | 전체화면 1280 · 위 가장자리로 막대 표시 | ✅ 수정 후 (e71fed0) · 통과 |
| [20c-fs-top-edge-controls-1536-fixed.webp](20c-fs-top-edge-controls-1536-fixed.webp) | 전체화면 1536 · 위 가장자리로 막대 표시 | ✅ 수정 후 (e71fed0) · 통과 |
| [21-fs-question-open-1280-fixed.webp](21-fs-question-open-1280-fixed.webp) | 전체화면 1280 · 질문 패널 열림 | ✅ 수정 후 (e71fed0) · 통과 |
| [21-fs-question-open-1280.webp](21-fs-question-open-1280.webp) | 전체화면 1280 · 질문 패널 열림 | 수정 전 (e71fed0 이전) 관찰 |
| [21-fs-question-open-1536-fixed.webp](21-fs-question-open-1536-fixed.webp) | 전체화면 1536 · 질문 패널 열림 | ✅ 수정 후 (e71fed0) · 통과 |
| [21b-fs-question-autopause-1536-fixed.webp](21b-fs-question-autopause-1536-fixed.webp) | 전체화면 1536 · 질문 시 자동 일시정지 | ✅ 수정 후 (e71fed0) · 통과 |
| [22-fs-typing-1280-fixed.webp](22-fs-typing-1280-fixed.webp) | 전체화면 1280 · 입력 중 | ✅ 수정 후 (e71fed0) · 통과 |
| [22-fs-typing-1280.webp](22-fs-typing-1280.webp) | 전체화면 1280 · 입력 중 | 수정 전 (e71fed0 이전) 관찰 |
| [22-fs-typing-1536-fixed.webp](22-fs-typing-1536-fixed.webp) | 전체화면 1536 · 입력 중 | ✅ 수정 후 (e71fed0) · 통과 |
| [23-fs-transcript-seek-1280-fixed.webp](23-fs-transcript-seek-1280-fixed.webp) | 전체화면 1280 · 대본 문장 클릭으로 이동 | ✅ 수정 후 (e71fed0) · 통과 |
| [23-fs-transcript-seek-1280.webp](23-fs-transcript-seek-1280.webp) | 전체화면 1280 · 대본 문장 클릭으로 이동 | 수정 전 (e71fed0 이전) 관찰 |
| [23-fs-transcript-seek-1536-fixed.webp](23-fs-transcript-seek-1536-fixed.webp) | 전체화면 1536 · 대본 문장 클릭으로 이동 | ✅ 수정 후 (e71fed0) · 통과 |
| [24-fs-keyboard-focus-1280-fixed.webp](24-fs-keyboard-focus-1280-fixed.webp) | 전체화면 1280 · 키보드 포커스 표시 | ✅ 수정 후 (e71fed0) · 통과 |
| [24-fs-keyboard-focus-1280.webp](24-fs-keyboard-focus-1280.webp) | 전체화면 1280 · 키보드 포커스 표시 | 수정 전 (e71fed0 이전) 관찰 |
| [24-fs-keyboard-focus-1536-fixed.webp](24-fs-keyboard-focus-1536-fixed.webp) | 전체화면 1536 · 키보드 포커스 표시 | ✅ 수정 후 (e71fed0) · 통과 |
| [25-after-exit-1280-fixed.webp](25-after-exit-1280-fixed.webp) | 창 1280 · 전체화면 종료 후 | ✅ 수정 후 (e71fed0) · 통과 |
| [25-after-exit-1280.webp](25-after-exit-1280.webp) | 창 1280 · 전체화면 종료 후 | 수정 전 (e71fed0 이전) 관찰 |
| [25-after-exit-1536-fixed.webp](25-after-exit-1536-fixed.webp) | 창 1536 · 전체화면 종료 후 | ✅ 수정 후 (e71fed0) · 통과 |
| [26-fs-reentered-1280-fixed.webp](26-fs-reentered-1280-fixed.webp) | 전체화면 1280 · 전체화면 재진입 | ✅ 수정 후 (e71fed0) · 통과 |
| [26-fs-reentered-1280.webp](26-fs-reentered-1280.webp) | 전체화면 1280 · 전체화면 재진입 | 수정 전 (e71fed0 이전) 관찰 |
| [26-fs-reentered-1536-fixed.webp](26-fs-reentered-1536-fixed.webp) | 전체화면 1536 · 전체화면 재진입 | ✅ 수정 후 (e71fed0) · 통과 |
| [27-fs-learning-tab-1280-fixed.webp](27-fs-learning-tab-1280-fixed.webp) | 전체화면 1280 · 학습 탭 | ✅ 수정 후 (e71fed0) · 통과 |
| [27-fs-learning-tab-1280.webp](27-fs-learning-tab-1280.webp) | 전체화면 1280 · 학습 탭 | 수정 전 (e71fed0 이전) 관찰 |
| [27-fs-learning-tab-1536-fixed.webp](27-fs-learning-tab-1536-fixed.webp) | 전체화면 1536 · 학습 탭 | ✅ 수정 후 (e71fed0) · 통과 |
| [28-fs-learning-dialog-1280-fixed.webp](28-fs-learning-dialog-1280-fixed.webp) | 전체화면 1280 · 학습 로드맵 대화상자 | ✅ 수정 후 (e71fed0) · 통과 |
| [28-fs-learning-dialog-1280.webp](28-fs-learning-dialog-1280.webp) | 전체화면 1280 · 학습 로드맵 대화상자 | 수정 전 (e71fed0 이전) 관찰 |
| [28-fs-learning-dialog-1536-fixed.webp](28-fs-learning-dialog-1536-fixed.webp) | 전체화면 1536 · 학습 로드맵 대화상자 | ✅ 수정 후 (e71fed0) · 통과 |
| [29-fs-sync-tab-1280.webp](29-fs-sync-tab-1280.webp) | 전체화면 1280 · 동기화 탭 | 수정 전 (e71fed0 이전) 관찰 |
| [30-fs-open-questions-1280.webp](30-fs-open-questions-1280.webp) | 전체화면 1280 · 열린 질문 | 수정 전 (e71fed0 이전) 관찰 |
| [30-fs-records-1280-fixed.webp](30-fs-records-1280-fixed.webp) | 전체화면 1280 · 기록 | ✅ 수정 후 (e71fed0) · 통과 |
| [30-fs-records-1280.webp](30-fs-records-1280.webp) | 전체화면 1280 · 기록 | 수정 전 (e71fed0 이전) 관찰 |
| [30-fs-records-1536-fixed.webp](30-fs-records-1536-fixed.webp) | 전체화면 1536 · 기록 | ✅ 수정 후 (e71fed0) · 통과 |
| [31-fs-review-1280-fixed.webp](31-fs-review-1280-fixed.webp) | 전체화면 1280 · 복습 | ✅ 수정 후 (e71fed0) · 통과 |
| [31-fs-review-1280.webp](31-fs-review-1280.webp) | 전체화면 1280 · 복습 | 수정 전 (e71fed0 이전) 관찰 |
| [31-fs-review-1536-fixed.webp](31-fs-review-1536-fixed.webp) | 전체화면 1536 · 복습 | ✅ 수정 후 (e71fed0) · 통과 |
| [31-fs-upcoming-reviews-1280.webp](31-fs-upcoming-reviews-1280.webp) | 전체화면 1280 · 예정된 복습 | 수정 전 (e71fed0 이전) 관찰 |
| [32-fs-sync-1280-fixed.webp](32-fs-sync-1280-fixed.webp) | 전체화면 1280 · 동기화 | ✅ 수정 후 (e71fed0) · 통과 · PC 이름/경로 가림 |
| [32-fs-sync-1280.webp](32-fs-sync-1280.webp) | 전체화면 1280 · 동기화 | 수정 전 (e71fed0 이전) 관찰 · PC 이름/경로 가림 |
| [32-fs-sync-1536-fixed.webp](32-fs-sync-1536-fixed.webp) | 전체화면 1536 · 동기화 | ✅ 수정 후 (e71fed0) · 통과 · PC 이름/경로 가림 |
| [40-records-all-1280.webp](40-records-all-1280.webp) | 창 1280 · 전체 기록 | ✅ 관찰 · 통과 |
| [41-records-open-questions-1280.webp](41-records-open-questions-1280.webp) | 창 1280 · 열린 질문 · 기록 | ✅ 관찰 · 통과 |
| [42-exported-records.md](42-exported-records.md) | 보관된 QA 기록 5개를 Markdown으로 내보낸 결과 (QA가 직접 쓴 예시 질문) | ✅ 내보내기 형식 확인 |
| [43-upcoming-reviews-1536.webp](43-upcoming-reviews-1536.webp) | 창 1536 · 예정된 복습 | ✅ 관찰 · 통과 |
| [50-pcA-sync-empty-1280.webp](50-pcA-sync-empty-1280.webp) | PC A 상태 · 1280 · 동기화 폴더 비어 있음 | ✅ 두 격리 상태(같은 PC) 사이 동기화 통과 · PC 이름/경로 가림 |
| [51-pcA-sync-exported-1280.webp](51-pcA-sync-exported-1280.webp) | PC A 상태 · 1280 · 동기화 폴더로 내보냄 | ✅ 두 격리 상태(같은 PC) 사이 동기화 통과 · PC 이름/경로 가림 |
| [52-pcB-question-1536.webp](52-pcB-question-1536.webp) | PC B 상태 · 1536 · 질문 | ✅ 두 격리 상태(같은 PC) 사이 동기화 통과 |
| [53-pcB-sees-pcA-1536.webp](53-pcB-sees-pcA-1536.webp) | PC B 상태 · 1536 · PC A 기록 보임 | ✅ 두 격리 상태(같은 PC) 사이 동기화 통과 · PC 이름/경로 가림 |
| [54-pcB-preview-pcA-1536.webp](54-pcB-preview-pcA-1536.webp) | PC B 상태 · 1536 · PC A 합치기 미리보기 | ✅ 두 격리 상태(같은 PC) 사이 동기화 통과 · PC 이름/경로 가림 |
| [57-pcB-export-notice-1536.webp](57-pcB-export-notice-1536.webp) | PC B 상태 · 1536 · 내보내기 안내 | ✅ 두 격리 상태(같은 PC) 사이 동기화 통과 · PC 이름/경로 가림 |
| [58-pcA-preview-pcB-1280.webp](58-pcA-preview-pcB-1280.webp) | PC A 상태 · 1280 · PC B 합치기 미리보기 | ✅ 두 격리 상태(같은 PC) 사이 동기화 통과 · PC 이름/경로 가림 |
| [59-pcA-merged-1280.webp](59-pcA-merged-1280.webp) | PC A 상태 · 1280 · 합치기 완료 | ✅ 두 격리 상태(같은 PC) 사이 동기화 통과 · PC 이름/경로 가림 |
| [60-pcA-records-after-sync-1280.webp](60-pcA-records-after-sync-1280.webp) | PC A 상태 · 1280 · 동기화 후 기록 | ✅ 두 격리 상태(같은 PC) 사이 동기화 통과 |

## 확인하지 않은 것

- 실제 키보드의 Esc 키로 전체화면을 빠져나오는 동작 (자동화는 앱 버튼과 `document.exitFullscreen()`만 사용)
- 물리적으로 다른 두 PC (동기화는 같은 PC의 서로 격리된 두 상태로만 확인)
- 실제 ChatGPT 답변의 품질 (`DUVI_CHAT_MOCK=1` 모의 공급자만 사용)
- 강의 영상 내용 자체 (영상 프레임은 화면 배치를 보여 주는 작은 증거 사진일 뿐입니다)
