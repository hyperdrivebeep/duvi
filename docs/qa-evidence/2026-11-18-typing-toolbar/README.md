# 입력 중 전체화면 막대 점검 (2026-11-18)

[← QA 증거 목록](../README.md)

## 무엇을 확인했나

전체화면에서 질문·내 설명을 입력하거나 노트 패널 안에서 마우스를 움직일 때 조작 막대가 영상 위로 튀어나오지 않는지 확인했습니다. `v`로 시작하는 파일은 수정 전, `f`로 시작하는 파일은 수정 후(22482e5)입니다. 단계별 측정값은 두 JSON 파일에 있습니다.

## 어떻게 확인했나

- 브라우저: 임시 프로필을 쓰는 헤드 있는(창이 보이는) Chrome을 omowright 라이브러리로 조종했습니다. 사용자의 Chrome 프로필이나 로그인은 쓰지 않았습니다.
- 진짜 전체화면: 앱의 전체화면 버튼을 CDP 마우스 이벤트로 실제 클릭해 `document.fullscreenElement`가 `#stage`가 되는 것을 확인했습니다. 이 PC는 다른 창이 앞에 있어서 Chrome 창의 전체화면 상태는 요청이 허락된 뒤 CDP로 맞췄습니다. 기본 화면은 1536x864(1920x1080, 125% 배율)입니다.
- 상태: 저장소 복사본, 빈 `LOCALAPPDATA`, 사용하지 않는 포트의 별도 서버를 썼습니다. 평소 쓰는 6103 서버와 계정 보관소는 건드리지 않았습니다.
- 이미지: 원본 PNG를 최대 너비 1600px, 품질 80의 WebP로 바꿨습니다. 내용은 그대로이고 PC 이름이나 로컬 경로가 보이던 곳만 회색 상자("가림")로 덮었습니다.

## 파일별 내용 (이미지 24장, 원자료 2개)

판정 표시: ✅ 기대대로 동작 · ❌ 결함이 보임 (대부분 이후 커밋에서 수정) · "시작"/"관찰"은 비교 기준 화면입니다.

| 파일 | 보이는 것 | 판정 |
|---|---|---|
| [after-fix-steps.json](after-fix-steps.json) | 수정 후 단계별 측정값 (시각, 막대 표시 여부, 포커스, 화면 크기) | 원자료 |
| [before-fix-steps.json](before-fix-steps.json) | 수정 전 단계별 측정값 (시각, 막대 표시 여부, 포커스, 화면 크기) | 원자료 |
| [f01-playing-bar-autohidden.webp](f01-playing-bar-autohidden.webp) | 전체화면 1536 · 재생 중 막대 자동 숨김 · 막대 숨김 | ❌ 수정 후 (22482e5): 입력·노트 패널 조작에 막대가 영상 위로 나타남 |
| [f02-question-panel-opened.webp](f02-question-panel-opened.webp) | 전체화면 1536 · 질문 패널 열림 · 막대 보임 | ✅ 수정 후 (22482e5) |
| [f03-question-open-bar-autohidden-again.webp](f03-question-open-bar-autohidden-again.webp) | 전체화면 1536 · 질문 패널 열림 · 막대 숨김 | ✅ 수정 후 (22482e5) |
| [f04a-typing-question-start.webp](f04a-typing-question-start.webp) | 전체화면 1536 · 질문 입력 시작 · 막대 숨김 | ✅ 수정 후 (22482e5) |
| [f04b-typing-question-middle.webp](f04b-typing-question-middle.webp) | 전체화면 1536 · 질문 입력 중간 · 막대 숨김 | ✅ 수정 후 (22482e5) |
| [f04c-typing-question-end.webp](f04c-typing-question-end.webp) | 전체화면 1536 · 질문 입력 끝 · 막대 숨김 | ✅ 수정 후 (22482e5) |
| [f04d-clicked-explanation-field.webp](f04d-clicked-explanation-field.webp) | 전체화면 1536 · 내 설명 칸 클릭 · 막대 숨김 | ✅ 수정 후 (22482e5) |
| [f04e-typing-explanation-middle.webp](f04e-typing-explanation-middle.webp) | 전체화면 1536 · 내 설명 입력 중간 · 막대 숨김 | ✅ 수정 후 (22482e5) |
| [f04f-typing-explanation-end.webp](f04f-typing-explanation-end.webp) | 전체화면 1536 · 내 설명 입력 끝 · 막대 숨김 | ✅ 수정 후 (22482e5) |
| [f05-mouse-over-video.webp](f05-mouse-over-video.webp) | 전체화면 1536 · 영상 위 마우스 이동 · 막대 숨김 | ✅ 수정 후 (22482e5) |
| [f06-mouse-moves-in-notes-panel.webp](f06-mouse-moves-in-notes-panel.webp) | 전체화면 1536 · 노트 패널 안 마우스 이동 · 막대 숨김 | ✅ 수정 후 (22482e5) |
| [f07-top-edge-still-reveals-bar.webp](f07-top-edge-still-reveals-bar.webp) | 전체화면 1536 · 위 가장자리는 여전히 막대 표시 · 막대 보임 | ✅ 수정 후 (22482e5) |
| [sync-merge-preview-pcA-sees-pcB-1536.webp](sync-merge-preview-pcA-sees-pcB-1536.webp) | PC A에서 PC B 기록 합치기 미리보기 (1536) | ✅ 관찰 · PC 이름/경로 가림 |
| [v01-playing-bar-autohidden.webp](v01-playing-bar-autohidden.webp) | 전체화면 1536 · 재생 중 막대 자동 숨김 · 막대 숨김 | ❌ 수정 전 (22482e5 이전): 입력·노트 패널 조작에 막대가 영상 위로 나타남 |
| [v02-question-panel-opened.webp](v02-question-panel-opened.webp) | 전체화면 1536 · 질문 패널 열림 · 막대 보임 | ✅ 수정 전 (22482e5 이전) |
| [v03-question-open-bar-autohidden-again.webp](v03-question-open-bar-autohidden-again.webp) | 전체화면 1536 · 질문 패널 열림 · 막대 숨김 | ✅ 수정 전 (22482e5 이전) |
| [v04a-typing-question-start.webp](v04a-typing-question-start.webp) | 전체화면 1536 · 질문 입력 시작 · 막대 숨김 | ✅ 수정 전 (22482e5 이전) |
| [v04b-typing-question-middle.webp](v04b-typing-question-middle.webp) | 전체화면 1536 · 질문 입력 중간 · 막대 숨김 | ✅ 수정 전 (22482e5 이전) |
| [v04c-typing-question-end.webp](v04c-typing-question-end.webp) | 전체화면 1536 · 질문 입력 끝 · 막대 숨김 | ✅ 수정 전 (22482e5 이전) |
| [v04d-clicked-explanation-field.webp](v04d-clicked-explanation-field.webp) | 전체화면 1536 · 내 설명 칸 클릭 · 막대 보임 | ❌ 수정 전 (22482e5 이전): 입력·노트 패널 조작에 막대가 영상 위로 나타남 |
| [v04e-typing-explanation-middle.webp](v04e-typing-explanation-middle.webp) | 전체화면 1536 · 내 설명 입력 중간 · 막대 보임 | ❌ 수정 전 (22482e5 이전): 입력·노트 패널 조작에 막대가 영상 위로 나타남 |
| [v04f-typing-explanation-end.webp](v04f-typing-explanation-end.webp) | 전체화면 1536 · 내 설명 입력 끝 · 막대 숨김 | ✅ 수정 전 (22482e5 이전) |
| [v05-mouse-over-video.webp](v05-mouse-over-video.webp) | 전체화면 1536 · 영상 위 마우스 이동 · 막대 숨김 | ✅ 수정 전 (22482e5 이전) |
| [v06-mouse-moves-in-notes-panel.webp](v06-mouse-moves-in-notes-panel.webp) | 전체화면 1536 · 노트 패널 안 마우스 이동 · 막대 보임 | ❌ 수정 전 (22482e5 이전): 입력·노트 패널 조작에 막대가 영상 위로 나타남 |

## 확인하지 않은 것

- 실제 키보드의 Esc 키로 전체화면을 빠져나오는 동작 (자동화는 앱 버튼과 `document.exitFullscreen()`만 사용)
- 물리적으로 다른 두 PC (동기화는 같은 PC의 서로 격리된 두 상태로만 확인)
- 실제 ChatGPT 답변의 품질 (`DUVI_CHAT_MOCK=1` 모의 공급자만 사용)
- 강의 영상 내용 자체 (영상 프레임은 화면 배치를 보여 주는 작은 증거 사진일 뿐입니다)
