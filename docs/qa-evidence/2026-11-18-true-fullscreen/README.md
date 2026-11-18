# 진짜 전체화면 핵심 화면 점검 (2026-11-18)

[← QA 증거 목록](../README.md)

## 무엇을 확인했나

강의 전체화면(사용자가 "핵심"이라고 한 화면)에서 영상·영어/한국어 자막·질문 패널·대본 이동·키보드 이동·종료 후 재진입이 1280/1536/1920 크기에서 잘리거나 겹치지 않는지 확인했습니다. 여기서 찾은 결함(자막 문장마다 영상 높이 흔들림, 30px 자막 잘림, 입력할 때마다 막대가 영상 위로 나타남, 학습 대화상자를 닫으면 포커스가 사라짐)은 7971c10에서 고쳤고, 40번대 파일이 수정 후 화면입니다.

## 어떻게 확인했나

- 브라우저: 임시 프로필을 쓰는 헤드 있는(창이 보이는) Chrome을 omowright 라이브러리로 조종했습니다. 사용자의 Chrome 프로필이나 로그인은 쓰지 않았습니다.
- 진짜 전체화면: 앱의 전체화면 버튼을 CDP 마우스 이벤트로 실제 클릭해 `document.fullscreenElement`가 `#stage`가 되는 것을 확인했습니다. 이 PC는 다른 창이 앞에 있어서 Chrome 창의 전체화면 상태는 요청이 허락된 뒤 CDP로 맞췄습니다. 기본 화면은 1536x864(1920x1080, 125% 배율)입니다.
- 상태: 저장소 복사본, 빈 `LOCALAPPDATA`, 사용하지 않는 포트의 별도 서버를 썼습니다. 평소 쓰는 6103 서버와 계정 보관소는 건드리지 않았습니다.
- 한국어 자막은 "[QA]"가 붙은 합성 문장입니다 (이 격리 상태에는 ChatGPT 계정이 없었습니다).
- 이미지: 원본 PNG를 최대 너비 1600px, 품질 80의 WebP로 바꿨습니다. 내용은 그대로이고 PC 이름이나 로컬 경로가 보이던 곳만 회색 상자("가림")로 덮었습니다.

## 파일별 내용 (이미지 39장, 원자료 0개)

판정 표시: ✅ 기대대로 동작 · ❌ 결함이 보임 (대부분 이후 커밋에서 수정) · "시작"/"관찰"은 비교 기준 화면입니다.

| 파일 | 보이는 것 | 판정 |
|---|---|---|
| [00-home-window-1280.webp](00-home-window-1280.webp) | 창 1280 · 홈 화면(창 모드) | 기준 화면 (창 모드) |
| [01-home-window-1280.webp](01-home-window-1280.webp) | 창 1280 · 홈 화면(창 모드) | 기준 화면 (창 모드) |
| [02-lecture-window-1280.webp](02-lecture-window-1280.webp) | 창 1280 · 강의 화면(창 모드) | 기준 화면 (창 모드) |
| [03-playing-window-1280.webp](03-playing-window-1280.webp) | 창 1280 · 재생 중(창 모드) | 기준 화면 (창 모드) |
| [10-fs1536-playing.webp](10-fs1536-playing.webp) | 전체화면 1536 · 재생 중 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [11-fs1536-top-edge-controls.webp](11-fs1536-top-edge-controls.webp) | 전체화면 1536 · 위 가장자리로 막대 표시 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [12-fs1536-controls-hidden.webp](12-fs1536-controls-hidden.webp) | 전체화면 1536 · 막대 자동 숨김 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [13-fs1536-question-open.webp](13-fs1536-question-open.webp) | 전체화면 1536 · 질문 패널 열림 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [14-fs1536-typing-question-and-explanation.webp](14-fs1536-typing-question-and-explanation.webp) | 전체화면 1536 · 질문·내 설명 입력 중 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [15-fs1536-typing-controls-hidden.webp](15-fs1536-typing-controls-hidden.webp) | 전체화면 1536 · 입력 중 막대 숨김 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [16-fs1536-typing-keys-shows-toolbar.webp](16-fs1536-typing-keys-shows-toolbar.webp) | 전체화면 1536 · 입력 키를 누르자 막대가 다시 나타남 | ❌ 결함: 입력 키마다 막대가 영상 위로 다시 나타남 → 7971c10에서 수정 (47번 참고) |
| [17-fs1536-transcript-seek.webp](17-fs1536-transcript-seek.webp) | 전체화면 1536 · 대본 문장 클릭으로 이동 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [18-fs1536-keyboard-focus.webp](18-fs1536-keyboard-focus.webp) | 전체화면 1536 · 키보드 포커스 표시 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [19-after-exit-window-1280.webp](19-after-exit-window-1280.webp) | 창 1280 · 전체화면 종료 후 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [20-fs1536-reentered-question-draft-kept.webp](20-fs1536-reentered-question-draft-kept.webp) | 전체화면 1536 · 질문 초안 유지 · 전체화면 재진입 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [21-fs1536-learning-tab.webp](21-fs1536-learning-tab.webp) | 전체화면 1536 · 학습 탭 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [22-fs1536-review-click.webp](22-fs1536-review-click.webp) | 전체화면 1536 · 복습 열기 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [23-fs1536-roadmap-click.webp](23-fs1536-roadmap-click.webp) | 전체화면 1536 · 로드맵 열기 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [24-fs1536-records.webp](24-fs1536-records.webp) | 전체화면 1536 · 기록 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 |
| [25-fs1536-backup-sync.webp](25-fs1536-backup-sync.webp) | 전체화면 1536 · 백업·동기화 | 수정 전 빌드 관찰 · 이 화면에서 결함 없음 · PC 이름/경로 가림 |
| [30-fs1280-playing.webp](30-fs1280-playing.webp) | 전체화면 1280 · 재생 중 | ❌ 수정 전: 자막 문장마다 영상 높이가 흔들리고 30px 자막이 잘림 → 7971c10에서 수정 (40~46번) |
| [31-fs1280-playing-resumed.webp](31-fs1280-playing-resumed.webp) | 전체화면 1280 · 재생 재개 | ❌ 수정 전: 자막 문장마다 영상 높이가 흔들리고 30px 자막이 잘림 → 7971c10에서 수정 (40~46번) |
| [32-fs1280-size30-transcript-open.webp](32-fs1280-size30-transcript-open.webp) | 전체화면 1280 · 자막 30px · 대본 열림 | ❌ 수정 전: 자막 문장마다 영상 높이가 흔들리고 30px 자막이 잘림 → 7971c10에서 수정 (40~46번) |
| [40-fixed-fs1536-size30-playing.webp](40-fixed-fs1536-size30-playing.webp) | 전체화면 1536 · 자막 30px · 재생 중 | ✅ 수정 후 (7971c10) · 통과 |
| [41-fixed-fs1536-size22.webp](41-fixed-fs1536-size22.webp) | 전체화면 1536 · 자막 22px | ✅ 수정 후 (7971c10) · 통과 |
| [42-fixed-fs1280-size22.webp](42-fixed-fs1280-size22.webp) | 전체화면 1280 · 자막 22px | ✅ 수정 후 (7971c10) · 통과 |
| [43-fixed-fs1280-size22-panel.webp](43-fixed-fs1280-size22-panel.webp) | 전체화면 1280 · 자막 22px · 옆 패널 | ✅ 수정 후 (7971c10) · 통과 |
| [44-fixed-fs1280-size30-panel.webp](44-fixed-fs1280-size30-panel.webp) | 전체화면 1280 · 자막 30px · 옆 패널 | ✅ 수정 후 (7971c10) · 통과 |
| [45-fixed2-fs1280-size22-panel.webp](45-fixed2-fs1280-size22-panel.webp) | 전체화면 1280 · 자막 22px · 옆 패널 | ✅ 수정 후 (7971c10) · 통과 |
| [46-fixed2-fs1280-size30-panel.webp](46-fixed2-fs1280-size30-panel.webp) | 전체화면 1280 · 자막 30px · 옆 패널 | ✅ 수정 후 (7971c10) · 통과 |
| [47-fixed-fs1536-typing-controls-stay-hidden.webp](47-fixed-fs1536-typing-controls-stay-hidden.webp) | 전체화면 1536 · 입력 중 막대 숨김 유지 | ✅ 수정 후 (7971c10) · 통과 |
| [48-fixed-fs1536-dialog-closed-focus.webp](48-fixed-fs1536-dialog-closed-focus.webp) | 전체화면 1536 · 대화상자 닫은 뒤 포커스 위치 | ✅ 수정 후 (7971c10) · 통과 |
| [49-fixed-after-exit-button.webp](49-fixed-after-exit-button.webp) | 종료 버튼으로 나온 뒤 | ✅ 수정 후 (7971c10) · 통과 |
| [50-fixed-fs1536-reentered.webp](50-fixed-fs1536-reentered.webp) | 전체화면 1536 · 전체화면 재진입 | ✅ 수정 후 (7971c10) · 통과 |
| [51-fixed-fs1536-playing-default.webp](51-fixed-fs1536-playing-default.webp) | 전체화면 1536 · 기본 배치로 재생 | ✅ 수정 후 (7971c10) · 통과 |
| [52-fixed-fs1536-question-autopause.webp](52-fixed-fs1536-question-autopause.webp) | 전체화면 1536 · 질문 시 자동 일시정지 | ✅ 수정 후 (7971c10) · 통과 |
| [53-fixed-fs1536-transcript-seek.webp](53-fixed-fs1536-transcript-seek.webp) | 전체화면 1536 · 대본 문장 클릭으로 이동 | ✅ 수정 후 (7971c10) · 통과 |
| [54-fixed-fs1920-playing.webp](54-fixed-fs1920-playing.webp) | 전체화면 1920 · 재생 중 | ✅ 수정 후 (7971c10) · 통과 |
| [55-fixed-fs1920-question.webp](55-fixed-fs1920-question.webp) | 전체화면 1920 · 질문 | ✅ 수정 후 (7971c10) · 통과 |

## 확인하지 않은 것

- 실제 키보드의 Esc 키로 전체화면을 빠져나오는 동작 (자동화는 앱 버튼과 `document.exitFullscreen()`만 사용)
- 물리적으로 다른 두 PC (동기화는 같은 PC의 서로 격리된 두 상태로만 확인)
- 실제 ChatGPT 답변의 품질 (`DUVI_CHAT_MOCK=1` 모의 공급자만 사용)
- 강의 영상 내용 자체 (영상 프레임은 화면 배치를 보여 주는 작은 증거 사진일 뿐입니다)
