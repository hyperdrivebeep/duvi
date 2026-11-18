# 질문하기 후속 수정 4건 확인 (2026-11-19)

[← QA 증거 목록](../README.md)

## 무엇을 확인했나

사이드 채팅 점검에서 나온 네 가지 후속 수정을 수정 전 빌드와 수정 후 빌드에서 같은 절차로 비교했습니다.

## 어떻게 확인했나

- 브라우저: 임시 프로필을 쓰는 헤드 있는(창이 보이는) Chrome을 omowright 라이브러리로 조종했습니다. 사용자의 Chrome 프로필이나 로그인은 쓰지 않았습니다.
- 진짜 전체화면: 앱의 전체화면 버튼을 CDP 마우스 이벤트로 실제 클릭해 `document.fullscreenElement`가 `#stage`가 되는 것을 확인했습니다. 이 PC는 다른 창이 앞에 있어서 Chrome 창의 전체화면 상태는 요청이 허락된 뒤 CDP로 맞췄습니다. 기본 화면은 1536x864(1920x1080, 125% 배율)입니다.
- 상태: 저장소 복사본, 빈 `LOCALAPPDATA`, 사용하지 않는 포트의 별도 서버를 썼습니다. 평소 쓰는 6103 서버와 계정 보관소는 건드리지 않았습니다.
- 답변 공급자: `DUVI_CHAT_MOCK=1` 모의 공급자
- 비교한 빌드: 수정 전 490cb99, 푸시된 4278912(251f6c9 포함), 추가 수정 df99a47. 빌드마다 서버와 `LOCALAPPDATA`를 따로 두었습니다.
- 이미지: 원본 PNG를 최대 너비 1600px, 품질 80의 WebP로 바꿨습니다. 내용은 그대로이고 PC 이름이나 로컬 경로가 보이던 곳만 회색 상자("가림")로 덮었습니다.

## 수정별 결과

| 수정 | 확인 방법 | 수정 전 | 수정 후 |
|---|---|---|---|
| 채팅에서 저장한 기록의 도움 수준 (bd7a3bb, 테스트 고정 4278912) | "기록으로 저장" 실제 클릭 → 내 기록·열린 질문 | 예전 캡처 [side-chat 11b](../2026-11-19-side-chat/11b-fs1536-open-question-ai-answer.webp)는 "도움 없이". 파일 시각 00:17:31이 bd7a3bb 커밋(00:23:32)보다 6분 앞서므로 수정 전 화면입니다 | 두 기록 모두 "전체 설명 사용", state.json에도 `help: "full"` |
| 일시정지 중 시간칩 이동 (a9d9f19) | YouTube 화면 실제 클릭으로 재생/정지 → 질문 시간칩 클릭 → 앱 시계(`#clock`) 기록 | 칩 시각 유지, 재생도 칩 시각부터 (이번 측정에서는 재현 안 됨) | 같음 — 일반 화면 00:11 → 00:04 → 재생 후 00:08, 전체화면 00:16 → 00:04 → 00:08 |
| 툴바 버튼 클릭 뒤 막대 자동 숨김 (251f6c9 + df99a47) | 진짜 전체화면, "대본" 버튼 실제 클릭, 6초간 250ms 간격 + 모든 클래스 변화 기록 | 6초 내내 보임 | 251f6c9만으로는 2.5초에 숨었다가 21ms 만에 다시 나타나 5초에 숨음(불완전) → df99a47 이후 2.5초에 숨고 계속 숨김 |
| 새 설치에 복원했을 때 사이드바 순서 (c222cc2) | folders.json 없는 설치에서 "전체 백업 내려받기" → 빈 새 설치에 "확인한 백업 복원" → 새로고침 | 1, 10, 11, …, 19, 2, 20, … | 1, 2, 3, … 26 |

시간칩 수정 전 빌드에서 결함이 재현되지 않은 이유는 확인하지 못했습니다. 이번 측정은 정지 후 1초 이상 기다린 뒤 칩을 눌렀는데, a9d9f19의 테스트가 다루는 "YouTube가 정지 중 이전 시각을 계속 보고하는" 상황이 이 순서에서는 생기지 않았을 수 있습니다. 수정 후 빌드에서 동작이 나빠지지 않았다는 것만 확인했습니다.

## 파일별 내용 (이미지 23장, 원자료 5개)

판정 표시: ✅ 기대대로 동작 · ❌ 결함이 보임 (대부분 이후 커밋에서 수정) · "시작"/"관찰"은 비교 기준 화면입니다.

| 파일 | 보이는 것 | 판정 |
|---|---|---|
| [01-normal-1536-a-chat-answer-saved.webp](01-normal-1536-a-chat-answer-saved.webp) | 창 1536 · 질문하기에서 모의 답변 아래 "기록으로 저장"을 실제 클릭한 직후 안내 문구 | ✅ 저장 안내 표시 |
| [01-normal-1536-b-open-questions-full-help.webp](01-normal-1536-b-open-questions-full-help.webp) | 학습 로드맵 → 내 기록 → 열린 질문 2: 채팅에서 저장한 두 기록 | ✅ 두 기록 모두 "전체 설명 사용" (DOM과 state.json의 help=full 일치) |
| [01-normal-1536-c-records-all-full-help.webp](01-normal-1536-c-records-all-full-help.webp) | 같은 목록의 전체 2 탭 | ✅ "전체 설명 사용" |
| [01-chat-record-help-level.json](01-chat-record-help-level.json) | DOM에서 읽은 도움 수준 문구, state.json의 help 값, 예전 11b 캡처 시각 비교 | 원자료 |
| [02-normal-1536-before-a-paused-after-chip.webp](02-normal-1536-before-a-paused-after-chip.webp) | 창 1536 · 일시정지 상태(00:11)에서 질문 시간칩 00:04 클릭 3초 뒤 · 앱 시계 00:04 | ✅ 수정 전 (490cb99): 시계가 칩 시각 유지 |
| [02-normal-1536-before-b-resumed.webp](02-normal-1536-before-b-resumed.webp) | 창 1536 · 이어서 재생 약 4초 뒤 · 앱 시계 00:08 | ✅ 수정 전 (490cb99): 칩 시각부터 재생 |
| [02-fs-1536-before-a-paused-after-chip.webp](02-fs-1536-before-a-paused-after-chip.webp) | 진짜 전체화면 1536 · 일시정지 상태(00:16)에서 질문 시간칩 00:04 클릭 3초 뒤 · 앱 시계 00:04 | ✅ 수정 전 (490cb99): 시계가 칩 시각 유지 |
| [02-fs-1536-before-b-resumed.webp](02-fs-1536-before-b-resumed.webp) | 진짜 전체화면 1536 · 이어서 재생 약 4초 뒤 · 앱 시계 00:08 | ✅ 수정 전 (490cb99): 칩 시각부터 재생 |
| [02-normal-1536-after-a-paused-after-chip.webp](02-normal-1536-after-a-paused-after-chip.webp) | 창 1536 · 일시정지 상태(00:11)에서 질문 시간칩 00:04 클릭 3초 뒤 · 앱 시계 00:04 | ✅ 수정 후 (a9d9f19 포함): 시계가 칩 시각 유지 |
| [02-normal-1536-after-b-resumed.webp](02-normal-1536-after-b-resumed.webp) | 창 1536 · 이어서 재생 약 4초 뒤 · 앱 시계 00:08 | ✅ 수정 후 (a9d9f19 포함): 칩 시각부터 재생 |
| [02-fs-1536-after-a-paused-after-chip.webp](02-fs-1536-after-a-paused-after-chip.webp) | 진짜 전체화면 1536 · 일시정지 상태(00:16)에서 질문 시간칩 00:04 클릭 3초 뒤 · 앱 시계 00:04 | ✅ 수정 후 (a9d9f19 포함): 시계가 칩 시각 유지 |
| [02-fs-1536-after-b-resumed.webp](02-fs-1536-after-b-resumed.webp) | 진짜 전체화면 1536 · 이어서 재생 약 4초 뒤 · 앱 시계 00:08 | ✅ 수정 후 (a9d9f19 포함): 칩 시각부터 재생 |
| [02-time-chip-seek.json](02-time-chip-seek.json) | 전/후 빌드, 일반·전체화면의 단계별 앱 시계 기록 | 원자료 |
| [03-fs1536-before-a-0.5s-after-transcript-click.webp](03-fs1536-before-a-0.5s-after-transcript-click.webp) | 진짜 전체화면 1536 · 툴바 "대본" 버튼 실제 클릭 0.5초 뒤 (막대 보임) | 수정 전 (490cb99) · 시작 |
| [03-fs1536-before-b-4s-after-transcript-click.webp](03-fs1536-before-b-4s-after-transcript-click.webp) | 같은 장면 4초 뒤 | ❌ 수정 전 (490cb99): 6초 내내 막대가 보임 (클릭한 버튼에 포커스가 남음) |
| [03-fs1536-pushed-251f6c9-a-0.5s-after-transcript-click.webp](03-fs1536-pushed-251f6c9-a-0.5s-after-transcript-click.webp) | 진짜 전체화면 1536 · 툴바 "대본" 버튼 실제 클릭 0.5초 뒤 (막대 보임) | 푸시된 251f6c9 (4278912) · 시작 |
| [03-fs1536-pushed-251f6c9-b-4s-after-transcript-click.webp](03-fs1536-pushed-251f6c9-b-4s-after-transcript-click.webp) | 같은 장면 4초 뒤 | ❌ 푸시된 251f6c9 (4278912): 2.5초에 숨었다가 21ms 만에 다시 나타나 5초에야 숨음 (클래스 변화 2482:H 2503:V 5019:H) |
| [03-fs1536-fixed-a-0.5s-after-transcript-click.webp](03-fs1536-fixed-a-0.5s-after-transcript-click.webp) | 진짜 전체화면 1536 · 툴바 "대본" 버튼 실제 클릭 0.5초 뒤 (막대 보임) | 추가 수정 후 (df99a47) · 시작 |
| [03-fs1536-fixed-b-4s-after-transcript-click.webp](03-fs1536-fixed-b-4s-after-transcript-click.webp) | 같은 장면 4초 뒤 | ✅ 추가 수정 후 (df99a47): 2655ms에 숨고 6초까지 숨김 유지 |
| [03-fullscreen-bar-autohide.json](03-fullscreen-bar-autohide.json) | 250ms 간격 막대 상태와 모든 클래스 변화 시각(MutationObserver), 클릭 후 포커스 요소 | 원자료 |
| [03q-fs1536-before-a-0.5s-after-toolbar-click.webp](03q-fs1536-before-a-0.5s-after-toolbar-click.webp) | 진짜 전체화면 1536 · 툴바 "질문하기" 클릭 0.5초 뒤 | 수정 전 · 시작 |
| [03q-fs1536-before-b-4s-after-toolbar-click.webp](03q-fs1536-before-b-4s-after-toolbar-click.webp) | 같은 장면 4초 뒤 | 참고: 수정 전에서도 2.7초에 숨음 (질문하기는 포커스를 입력칸으로 옮겨서 이 결함이 드러나지 않음) |
| [03q-fs1536-after-a-0.5s-after-toolbar-click.webp](03q-fs1536-after-a-0.5s-after-toolbar-click.webp) | 진짜 전체화면 1536 · 툴바 "질문하기" 클릭 0.5초 뒤 | 251f6c9 · 시작 |
| [03q-fs1536-after-b-4s-after-toolbar-click.webp](03q-fs1536-after-b-4s-after-toolbar-click.webp) | 같은 장면 4초 뒤 | 참고: 251f6c9에서도 2.7초에 숨음 (질문하기는 포커스를 입력칸으로 옮겨서 이 결함이 드러나지 않음) |
| [03q-question-button-autohide.json](03q-question-button-autohide.json) | "질문하기" 버튼 측정값 | 원자료 |
| [04-fresh-restore-1536-before-sidebar.webp](04-fresh-restore-1536-before-sidebar.webp) | folders.json 없는 설치에서 백업 → 빈 새 설치에 복원 → 새로고침 뒤 사이드바 (수정 전 490cb99에서 백업) | ❌ 1, 10, 11, …, 19, 2, 20 순서 |
| [04-fresh-restore-1536-after-sidebar.webp](04-fresh-restore-1536-after-sidebar.webp) | 같은 절차, 수정 후 빌드에서 백업 | ✅ 1, 2, 3, … 26 순서 |
| [04-fresh-install-restore-order.json](04-fresh-install-restore-order.json) | 백업 파일의 폴더 순서, 복원 후 사이드바 순서, 복원 안내 문구 | 원자료 |

### interrupted-lane/ (이전 시도 15장)

PC가 갑자기 재시작되어 중단된 이전 시도의 캡처입니다. 판정 기록이 남아 있지 않아 참고용으로만 둡니다.

| 파일 | 보이는 것 | 판정 |
|---|---|---|
| [interrupted-lane/01-normal-1536-open-questions-full-help.webp](interrupted-lane/01-normal-1536-open-questions-full-help.webp) | 열린 질문 목록의 도움 수준 | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02-normal-1536-a-playing-chip-1022.webp](interrupted-lane/02-normal-1536-a-playing-chip-1022.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (a-playing-chip-1022) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02-normal-1536-b-paused-after-chip.webp](interrupted-lane/02-normal-1536-b-paused-after-chip.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (b-paused-after-chip) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02-normal-1536-b-resumed-from-chip-time.webp](interrupted-lane/02-normal-1536-b-resumed-from-chip-time.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (b-resumed-from-chip-time) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02-normal-1536-paused-chip-then-resumed.webp](interrupted-lane/02-normal-1536-paused-chip-then-resumed.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (paused-chip-then-resumed) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02-normal-1536-playing-after-chip.webp](interrupted-lane/02-normal-1536-playing-after-chip.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (playing-after-chip) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02-normal-1536-time-chip-seek-after.webp](interrupted-lane/02-normal-1536-time-chip-seek-after.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (time-chip-seek-after) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02a-normal-1536-before-chip-at-1042.webp](interrupted-lane/02a-normal-1536-before-chip-at-1042.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (before-chip-at-1042) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02a-normal-1536-playing-after-chip-1022.webp](interrupted-lane/02a-normal-1536-playing-after-chip-1022.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (playing-after-chip-1022) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02b-normal-1536-after-chip-paused.webp](interrupted-lane/02b-normal-1536-after-chip-paused.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (after-chip-paused) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02b-normal-1536-paused-after-chip-1022.webp](interrupted-lane/02b-normal-1536-paused-after-chip-1022.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (paused-after-chip-1022) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02c-normal-1536-after-chip-resumed-player-time.webp](interrupted-lane/02c-normal-1536-after-chip-resumed-player-time.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (after-chip-resumed-player-time) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/02c-normal-1536-resumed-from-chip-time.webp](interrupted-lane/02c-normal-1536-resumed-from-chip-time.webp) | 창 1536 · 시간칩 클릭 전후 재생 위치 (resumed-from-chip-time) | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/03a-fs-after-click-question-bar-visible.webp](interrupted-lane/03a-fs-after-click-question-bar-visible.webp) | 전체화면 · 질문하기 클릭 후 막대 | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |
| [interrupted-lane/03b-fs-6s-after-click-question-bar-hidden.webp](interrupted-lane/03b-fs-6s-after-click-question-bar-hidden.webp) | 전체화면 · 질문하기 클릭 후 막대 | 참고용: PC 재시작으로 중단된 이전 시도, 판정 기록 없음 (위 표가 최종 증거) |

## 확인하지 않은 것

- 실제 키보드의 Esc 키로 전체화면을 빠져나오는 동작 (자동화는 앱 버튼과 `document.exitFullscreen()`만 사용)
- 물리적으로 다른 두 PC (동기화는 같은 PC의 서로 격리된 두 상태로만 확인)
- 실제 ChatGPT 답변의 품질 (`DUVI_CHAT_MOCK=1` 모의 공급자만 사용)
- 강의 영상 내용 자체 (영상 프레임은 화면 배치를 보여 주는 작은 증거 사진일 뿐입니다)
