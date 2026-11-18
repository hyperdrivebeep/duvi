# 전체화면 위쪽 띠와 패널 탭 클릭 점검 (2026-11-18)

[← QA 증거 목록](../README.md)

## 무엇을 확인했나

막대가 숨은 상태에서 오른쪽 패널의 탭(대본·질문·학습)과 닫기 버튼을 누르면 첫 클릭이 막대만 띄우고 실제 동작은 하지 않던 문제를 1280x720, 1536x864, 1920x1080에서 확인했습니다. "움직임 없이 바로 탭"과 "마우스를 옮긴 뒤 클릭" 두 방식을 모두 시험했고, 8524519 수정 후에는 모든 클릭이 의도대로 동작했습니다. 클릭 좌표와 실제로 맞은 요소는 click-table.md에 있습니다.

## 어떻게 확인했나

- 브라우저: 임시 프로필을 쓰는 헤드 있는(창이 보이는) Chrome을 omowright 라이브러리로 조종했습니다. 사용자의 Chrome 프로필이나 로그인은 쓰지 않았습니다.
- 진짜 전체화면: 앱의 전체화면 버튼을 CDP 마우스 이벤트로 실제 클릭해 `document.fullscreenElement`가 `#stage`가 되는 것을 확인했습니다. 이 PC는 다른 창이 앞에 있어서 Chrome 창의 전체화면 상태는 요청이 허락된 뒤 CDP로 맞췄습니다. 기본 화면은 1536x864(1920x1080, 125% 배율)입니다.
- 상태: 저장소 복사본, 빈 `LOCALAPPDATA`, 사용하지 않는 포트의 별도 서버를 썼습니다. 평소 쓰는 6103 서버와 계정 보관소는 건드리지 않았습니다.
- 이미지: 원본 PNG를 최대 너비 1600px, 품질 80의 WebP로 바꿨습니다. 내용은 그대로이고 PC 이름이나 로컬 경로가 보이던 곳만 회색 상자("가림")로 덮었습니다.

## 파일별 내용 (이미지 111장, 원자료 1개)

판정 표시: ✅ 기대대로 동작 · ❌ 결함이 보임 (대부분 이후 커밋에서 수정) · "시작"/"관찰"은 비교 기준 화면입니다.

| 파일 | 보이는 것 | 판정 |
|---|---|---|
| [after-fix-1280x720-move-click-close-x-after.webp](after-fix-1280x720-move-click-close-x-after.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1280x720-move-click-close-x-before-bar-hidden.webp](after-fix-1280x720-move-click-close-x-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1280x720-move-click-tab-learning-after.webp](after-fix-1280x720-move-click-tab-learning-after.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1280x720-move-click-tab-learning-before-bar-hidden.webp](after-fix-1280x720-move-click-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1280x720-move-click-tab-question-after.webp](after-fix-1280x720-move-click-tab-question-after.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1280x720-move-click-tab-question-before-bar-hidden.webp](after-fix-1280x720-move-click-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1280x720-move-click-tab-transcript-after.webp](after-fix-1280x720-move-click-tab-transcript-after.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1280x720-move-click-tab-transcript-before-bar-hidden.webp](after-fix-1280x720-move-click-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1280x720-tap-no-move-close-x-after.webp](after-fix-1280x720-tap-no-move-close-x-after.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1280x720-tap-no-move-close-x-before-bar-hidden.webp](after-fix-1280x720-tap-no-move-close-x-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1280x720-tap-no-move-tab-learning-after.webp](after-fix-1280x720-tap-no-move-tab-learning-after.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1280x720-tap-no-move-tab-learning-before-bar-hidden.webp](after-fix-1280x720-tap-no-move-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1280x720-tap-no-move-tab-question-after.webp](after-fix-1280x720-tap-no-move-tab-question-after.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1280x720-tap-no-move-tab-question-before-bar-hidden.webp](after-fix-1280x720-tap-no-move-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1280x720-tap-no-move-tab-transcript-after.webp](after-fix-1280x720-tap-no-move-tab-transcript-after.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1280x720-tap-no-move-tab-transcript-before-bar-hidden.webp](after-fix-1280x720-tap-no-move-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1280x720-video-top-edge-after-hover-bar-shown.webp](after-fix-1280x720-video-top-edge-after-hover-bar-shown.webp) | 진짜 전체화면 1280x720 · 영상 위 가장자리 hover · · hover 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1280x720-video-top-edge-before-bar-hidden.webp](after-fix-1280x720-video-top-edge-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 영상 위 가장자리 hover · · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1536x864-move-click-close-x-after.webp](after-fix-1536x864-move-click-close-x-after.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1536x864-move-click-close-x-before-bar-hidden.webp](after-fix-1536x864-move-click-close-x-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1536x864-move-click-tab-learning-after.webp](after-fix-1536x864-move-click-tab-learning-after.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1536x864-move-click-tab-learning-before-bar-hidden.webp](after-fix-1536x864-move-click-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1536x864-move-click-tab-question-after.webp](after-fix-1536x864-move-click-tab-question-after.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1536x864-move-click-tab-question-before-bar-hidden.webp](after-fix-1536x864-move-click-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1536x864-move-click-tab-transcript-after.webp](after-fix-1536x864-move-click-tab-transcript-after.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1536x864-move-click-tab-transcript-before-bar-hidden.webp](after-fix-1536x864-move-click-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1536x864-tap-no-move-close-x-after.webp](after-fix-1536x864-tap-no-move-close-x-after.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1536x864-tap-no-move-close-x-before-bar-hidden.webp](after-fix-1536x864-tap-no-move-close-x-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1536x864-tap-no-move-tab-learning-after.webp](after-fix-1536x864-tap-no-move-tab-learning-after.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1536x864-tap-no-move-tab-learning-before-bar-hidden.webp](after-fix-1536x864-tap-no-move-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1536x864-tap-no-move-tab-question-after.webp](after-fix-1536x864-tap-no-move-tab-question-after.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1536x864-tap-no-move-tab-question-before-bar-hidden.webp](after-fix-1536x864-tap-no-move-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1536x864-tap-no-move-tab-transcript-after.webp](after-fix-1536x864-tap-no-move-tab-transcript-after.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1536x864-tap-no-move-tab-transcript-before-bar-hidden.webp](after-fix-1536x864-tap-no-move-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1536x864-video-top-edge-after-hover-bar-shown.webp](after-fix-1536x864-video-top-edge-after-hover-bar-shown.webp) | 진짜 전체화면 1536x864 · 영상 위 가장자리 hover · · hover 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1536x864-video-top-edge-before-bar-hidden.webp](after-fix-1536x864-video-top-edge-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 영상 위 가장자리 hover · · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1920x1080-move-click-close-x-after.webp](after-fix-1920x1080-move-click-close-x-after.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1920x1080-move-click-close-x-before-bar-hidden.webp](after-fix-1920x1080-move-click-close-x-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1920x1080-move-click-tab-learning-after.webp](after-fix-1920x1080-move-click-tab-learning-after.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1920x1080-move-click-tab-learning-before-bar-hidden.webp](after-fix-1920x1080-move-click-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1920x1080-move-click-tab-question-after.webp](after-fix-1920x1080-move-click-tab-question-after.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1920x1080-move-click-tab-question-before-bar-hidden.webp](after-fix-1920x1080-move-click-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1920x1080-move-click-tab-transcript-after.webp](after-fix-1920x1080-move-click-tab-transcript-after.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1920x1080-move-click-tab-transcript-before-bar-hidden.webp](after-fix-1920x1080-move-click-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1920x1080-tap-no-move-close-x-after.webp](after-fix-1920x1080-tap-no-move-close-x-after.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1920x1080-tap-no-move-close-x-before-bar-hidden.webp](after-fix-1920x1080-tap-no-move-close-x-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1920x1080-tap-no-move-tab-learning-after.webp](after-fix-1920x1080-tap-no-move-tab-learning-after.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1920x1080-tap-no-move-tab-learning-before-bar-hidden.webp](after-fix-1920x1080-tap-no-move-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1920x1080-tap-no-move-tab-question-after.webp](after-fix-1920x1080-tap-no-move-tab-question-after.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1920x1080-tap-no-move-tab-question-before-bar-hidden.webp](after-fix-1920x1080-tap-no-move-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1920x1080-tap-no-move-tab-transcript-after.webp](after-fix-1920x1080-tap-no-move-tab-transcript-after.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1920x1080-tap-no-move-tab-transcript-before-bar-hidden.webp](after-fix-1920x1080-tap-no-move-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [after-fix-1920x1080-video-top-edge-after-hover-bar-shown.webp](after-fix-1920x1080-video-top-edge-after-hover-bar-shown.webp) | 진짜 전체화면 1920x1080 · 영상 위 가장자리 hover · · hover 후 | ✅ 수정 후 (8524519): 의도대로 동작 |
| [after-fix-1920x1080-video-top-edge-before-bar-hidden.webp](after-fix-1920x1080-video-top-edge-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 영상 위 가장자리 hover · · 클릭 전(막대 숨김) | 수정 후 (8524519) · 시작 상태 |
| [before-fix-1280x720-move-click-close-x-after.webp](before-fix-1280x720-move-click-close-x-after.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1280x720-move-click-close-x-before-bar-hidden.webp](before-fix-1280x720-move-click-close-x-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1280x720-move-click-tab-learning-after.webp](before-fix-1280x720-move-click-tab-learning-after.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1280x720-move-click-tab-learning-before-bar-hidden.webp](before-fix-1280x720-move-click-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1280x720-move-click-tab-question-after.webp](before-fix-1280x720-move-click-tab-question-after.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1280x720-move-click-tab-question-before-bar-hidden.webp](before-fix-1280x720-move-click-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1280x720-move-click-tab-transcript-after.webp](before-fix-1280x720-move-click-tab-transcript-after.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1280x720-move-click-tab-transcript-before-bar-hidden.webp](before-fix-1280x720-move-click-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1280x720-tap-no-move-close-x-after.webp](before-fix-1280x720-tap-no-move-close-x-after.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭이 바뀌지 않음(첫 탭이 막대만 띄움) |
| [before-fix-1280x720-tap-no-move-close-x-before-bar-hidden.webp](before-fix-1280x720-tap-no-move-close-x-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1280x720-tap-no-move-tab-learning-after.webp](before-fix-1280x720-tap-no-move-tab-learning-after.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭이 바뀌지 않음(첫 탭이 막대만 띄움) |
| [before-fix-1280x720-tap-no-move-tab-learning-before-bar-hidden.webp](before-fix-1280x720-tap-no-move-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1280x720-tap-no-move-tab-question-after.webp](before-fix-1280x720-tap-no-move-tab-question-after.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭이 바뀌지 않음(첫 탭이 막대만 띄움) |
| [before-fix-1280x720-tap-no-move-tab-question-before-bar-hidden.webp](before-fix-1280x720-tap-no-move-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1280x720-tap-no-move-tab-transcript-after.webp](before-fix-1280x720-tap-no-move-tab-transcript-after.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 후 | – 수정 전 (8524519 이전): 이미 대본 탭이라 판정 불가 |
| [before-fix-1280x720-tap-no-move-tab-transcript-before-bar-hidden.webp](before-fix-1280x720-tap-no-move-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1280x720 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1536x864-move-click-close-x-after.webp](before-fix-1536x864-move-click-close-x-after.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1536x864-move-click-close-x-before-bar-hidden.webp](before-fix-1536x864-move-click-close-x-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1536x864-move-click-tab-learning-after.webp](before-fix-1536x864-move-click-tab-learning-after.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1536x864-move-click-tab-learning-before-bar-hidden.webp](before-fix-1536x864-move-click-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1536x864-move-click-tab-question-after.webp](before-fix-1536x864-move-click-tab-question-after.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1536x864-move-click-tab-question-before-bar-hidden.webp](before-fix-1536x864-move-click-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1536x864-move-click-tab-transcript-after.webp](before-fix-1536x864-move-click-tab-transcript-after.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1536x864-move-click-tab-transcript-before-bar-hidden.webp](before-fix-1536x864-move-click-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1536x864-tap-no-move-close-x-after.webp](before-fix-1536x864-tap-no-move-close-x-after.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭이 바뀌지 않음(첫 탭이 막대만 띄움) |
| [before-fix-1536x864-tap-no-move-close-x-before-bar-hidden.webp](before-fix-1536x864-tap-no-move-close-x-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1536x864-tap-no-move-tab-learning-after.webp](before-fix-1536x864-tap-no-move-tab-learning-after.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭이 바뀌지 않음(첫 탭이 막대만 띄움) |
| [before-fix-1536x864-tap-no-move-tab-learning-before-bar-hidden.webp](before-fix-1536x864-tap-no-move-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1536x864-tap-no-move-tab-question-after.webp](before-fix-1536x864-tap-no-move-tab-question-after.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭이 바뀌지 않음(첫 탭이 막대만 띄움) |
| [before-fix-1536x864-tap-no-move-tab-question-before-bar-hidden.webp](before-fix-1536x864-tap-no-move-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1536x864-tap-no-move-tab-transcript-after.webp](before-fix-1536x864-tap-no-move-tab-transcript-after.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 후 | – 수정 전 (8524519 이전): 이미 대본 탭이라 판정 불가 |
| [before-fix-1536x864-tap-no-move-tab-transcript-before-bar-hidden.webp](before-fix-1536x864-tap-no-move-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1536x864 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1920x1080-move-click-close-x-after.webp](before-fix-1920x1080-move-click-close-x-after.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1920x1080-move-click-close-x-before-bar-hidden.webp](before-fix-1920x1080-move-click-close-x-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1920x1080-move-click-tab-learning-after.webp](before-fix-1920x1080-move-click-tab-learning-after.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1920x1080-move-click-tab-learning-before-bar-hidden.webp](before-fix-1920x1080-move-click-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1920x1080-move-click-tab-question-after.webp](before-fix-1920x1080-move-click-tab-question-after.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1920x1080-move-click-tab-question-before-bar-hidden.webp](before-fix-1920x1080-move-click-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1920x1080-move-click-tab-transcript-after.webp](before-fix-1920x1080-move-click-tab-transcript-after.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 후 | ✅ 수정 전 (8524519 이전): 의도대로 동작 |
| [before-fix-1920x1080-move-click-tab-transcript-before-bar-hidden.webp](before-fix-1920x1080-move-click-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 마우스를 옮긴 뒤 클릭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1920x1080-tap-no-move-close-x-after.webp](before-fix-1920x1080-tap-no-move-close-x-after.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭이 바뀌지 않음(첫 탭이 막대만 띄움) |
| [before-fix-1920x1080-tap-no-move-close-x-before-bar-hidden.webp](before-fix-1920x1080-tap-no-move-close-x-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1920x1080-tap-no-move-tab-learning-after.webp](before-fix-1920x1080-tap-no-move-tab-learning-after.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭이 바뀌지 않음(첫 탭이 막대만 띄움) |
| [before-fix-1920x1080-tap-no-move-tab-learning-before-bar-hidden.webp](before-fix-1920x1080-tap-no-move-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1920x1080-tap-no-move-tab-question-after.webp](before-fix-1920x1080-tap-no-move-tab-question-after.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭이 바뀌지 않음(첫 탭이 막대만 띄움) |
| [before-fix-1920x1080-tap-no-move-tab-question-before-bar-hidden.webp](before-fix-1920x1080-tap-no-move-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-1920x1080-tap-no-move-tab-transcript-after.webp](before-fix-1920x1080-tap-no-move-tab-transcript-after.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 후 | – 수정 전 (8524519 이전): 이미 대본 탭이라 판정 불가 |
| [before-fix-1920x1080-tap-no-move-tab-transcript-before-bar-hidden.webp](before-fix-1920x1080-tap-no-move-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1920x1080 · 움직임 없이 바로 탭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-native-1536x864-close-x-after-click.webp](before-fix-native-1536x864-close-x-after-click.webp) | 진짜 전체화면 1536x864 (원본 해상도) · 클릭 · 패널 닫기(X) · 클릭 후 | 수정 전 (8524519 이전) · 원본 해상도 관찰 (클릭표 밖, 이미지로만 판단) |
| [before-fix-native-1536x864-close-x-before-bar-hidden.webp](before-fix-native-1536x864-close-x-before-bar-hidden.webp) | 진짜 전체화면 1536x864 (원본 해상도) · 클릭 · 패널 닫기(X) · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-native-1536x864-hover-tab-only-reveals-bar.webp](before-fix-native-1536x864-hover-tab-only-reveals-bar.webp) | 진짜 전체화면 1536x864 (원본 해상도) · 탭 위 hover · 클릭 후 | ❌ 수정 전 (8524519 이전): 탭 위 hover는 막대만 띄움 |
| [before-fix-native-1536x864-tab-learning-after-click.webp](before-fix-native-1536x864-tab-learning-after-click.webp) | 진짜 전체화면 1536x864 (원본 해상도) · 클릭 · 학습 탭 · 클릭 후 | 수정 전 (8524519 이전) · 원본 해상도 관찰 (클릭표 밖, 이미지로만 판단) |
| [before-fix-native-1536x864-tab-learning-before-bar-hidden.webp](before-fix-native-1536x864-tab-learning-before-bar-hidden.webp) | 진짜 전체화면 1536x864 (원본 해상도) · 클릭 · 학습 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-native-1536x864-tab-question-after-click.webp](before-fix-native-1536x864-tab-question-after-click.webp) | 진짜 전체화면 1536x864 (원본 해상도) · 클릭 · 질문 탭 · 클릭 후 | 수정 전 (8524519 이전) · 원본 해상도 관찰 (클릭표 밖, 이미지로만 판단) |
| [before-fix-native-1536x864-tab-question-before-bar-hidden.webp](before-fix-native-1536x864-tab-question-before-bar-hidden.webp) | 진짜 전체화면 1536x864 (원본 해상도) · 클릭 · 질문 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [before-fix-native-1536x864-tab-transcript-after-click.webp](before-fix-native-1536x864-tab-transcript-after-click.webp) | 진짜 전체화면 1536x864 (원본 해상도) · 클릭 · 대본 탭 · 클릭 후 | 수정 전 (8524519 이전) · 원본 해상도 관찰 (클릭표 밖, 이미지로만 판단) |
| [before-fix-native-1536x864-tab-transcript-before-bar-hidden.webp](before-fix-native-1536x864-tab-transcript-before-bar-hidden.webp) | 진짜 전체화면 1536x864 (원본 해상도) · 클릭 · 대본 탭 · 클릭 전(막대 숨김) | 수정 전 (8524519 이전) · 시작 상태 |
| [click-table.md](click-table.md) | 모든 클릭의 대상 좌표, 실제로 맞은 요소, 전후 탭·패널·막대 상태 | 원자료 |

## 확인하지 않은 것

- 실제 키보드의 Esc 키로 전체화면을 빠져나오는 동작 (자동화는 앱 버튼과 `document.exitFullscreen()`만 사용)
- 물리적으로 다른 두 PC (동기화는 같은 PC의 서로 격리된 두 상태로만 확인)
- 실제 ChatGPT 답변의 품질 (`DUVI_CHAT_MOCK=1` 모의 공급자만 사용)
- 강의 영상 내용 자체 (영상 프레임은 화면 배치를 보여 주는 작은 증거 사진일 뿐입니다)
