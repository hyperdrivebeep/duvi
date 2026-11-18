# 질문하기 사이드 채팅 점검 (2026-11-19)

[← QA 증거 목록](../README.md)

## 무엇을 확인했나

영상 옆과 전체화면에서 질문하기 채팅을 열고, 답변 스트리밍 중 영상 자동 정지, 이어 묻기, 시간칩 이동, 멈춤, 사용 한도 오류, 기록으로 저장, 새로고침 후 복원, 백업·복원 후 대화 복원을 확인했습니다. 답변은 모두 모의 공급자가 만든 문장입니다.

## 어떻게 확인했나

- 브라우저: 임시 프로필을 쓰는 헤드 있는(창이 보이는) Chrome을 omowright 라이브러리로 조종했습니다. 사용자의 Chrome 프로필이나 로그인은 쓰지 않았습니다.
- 진짜 전체화면: 앱의 전체화면 버튼을 CDP 마우스 이벤트로 실제 클릭해 `document.fullscreenElement`가 `#stage`가 되는 것을 확인했습니다. 이 PC는 다른 창이 앞에 있어서 Chrome 창의 전체화면 상태는 요청이 허락된 뒤 CDP로 맞췄습니다. 기본 화면은 1536x864(1920x1080, 125% 배율)입니다.
- 상태: 저장소 복사본, 빈 `LOCALAPPDATA`, 사용하지 않는 포트의 별도 서버를 썼습니다. 평소 쓰는 6103 서버와 계정 보관소는 건드리지 않았습니다.
- 답변 공급자: `DUVI_CHAT_MOCK=1` 모의 공급자 (QA 전용, 기본값은 꺼짐)
- 이미지: 원본 PNG를 최대 너비 1600px, 품질 80의 WebP로 바꿨습니다. 내용은 그대로이고 PC 이름이나 로컬 경로가 보이던 곳만 회색 상자("가림")로 덮었습니다.

## 파일별 내용 (이미지 22장, 원자료 0개)

판정 표시: ✅ 기대대로 동작 · ❌ 결함이 보임 (대부분 이후 커밋에서 수정) · "시작"/"관찰"은 비교 기준 화면입니다.

| 파일 | 보이는 것 | 판정 |
|---|---|---|
| [01-normal-1536-chat-open-playing.webp](01-normal-1536-chat-open-playing.webp) | 창 1536 · 재생 중 질문하기 열기 | ✅ 통과 (모의 답변) |
| [02-normal-1536-streaming-autopaused.webp](02-normal-1536-streaming-autopaused.webp) | 창 1536 · 답변 스트리밍·영상 자동 정지 | ✅ 통과 (모의 답변) |
| [03-normal-1536-answer-done.webp](03-normal-1536-answer-done.webp) | 창 1536 · 답변 완료 | ✅ 통과 (모의 답변) |
| [04-normal-1536-follow-up.webp](04-normal-1536-follow-up.webp) | 창 1536 · 이어 묻기 | ✅ 통과 (모의 답변) |
| [05-normal-1536-time-chip-seek.webp](05-normal-1536-time-chip-seek.webp) | 창 1536 · 시간칩으로 이동 | ✅ 통과 (모의 답변) |
| [06-fs1536-chat-open-controls-hidden.webp](06-fs1536-chat-open-controls-hidden.webp) | 전체화면 1536 · 막대 자동 숨김 · 질문하기 열림 | ✅ 통과 (모의 답변) |
| [07-fs1536-typing-controls-stay-hidden.webp](07-fs1536-typing-controls-stay-hidden.webp) | 전체화면 1536 · 입력 중 막대 숨김 유지 | ✅ 통과 (모의 답변) |
| [08-fs1536-streaming.webp](08-fs1536-streaming.webp) | 전체화면 1536 · 답변 스트리밍 | ✅ 통과 (모의 답변) |
| [09-fs1536-answer-done.webp](09-fs1536-answer-done.webp) | 전체화면 1536 · 답변 완료 | ✅ 통과 (모의 답변) |
| [10-fs1536-saved-to-record.webp](10-fs1536-saved-to-record.webp) | 전체화면 1536 · 기록으로 저장 | ✅ 통과 (모의 답변) |
| [11-fs1536-open-questions-shows-record.webp](11-fs1536-open-questions-shows-record.webp) | 전체화면 1536 · 열린 질문 | ✅ 통과 (모의 답변) |
| [11b-fs1536-open-question-ai-answer.webp](11b-fs1536-open-question-ai-answer.webp) | 전체화면 1536 · 열린 질문의 AI 답변 기록 | ❌ 저장 기록의 도움 수준이 "도움 없이"로 표시 (bd7a3bb 커밋 6분 전 캡처) → bd7a3bb에서 수정, chat-followups 01번에서 재확인 |
| [12-reload-1280-thread-restored.webp](12-reload-1280-thread-restored.webp) | 창 1280 · 새로고침 후 대화 복원 | ✅ 통과 (모의 답변) |
| [13-fs1280-chat-open.webp](13-fs1280-chat-open.webp) | 전체화면 1280 · 질문하기 열림 | ✅ 통과 (모의 답변) |
| [14-fs1280-stopped-partial-saved.webp](14-fs1280-stopped-partial-saved.webp) | 전체화면 1280 · 멈춤·받은 부분 저장 | ✅ 통과 (모의 답변) |
| [15-fs1280-usage-limit-error.webp](15-fs1280-usage-limit-error.webp) | 전체화면 1280 · 사용 한도 오류 표시 | ✅ 오류 상태 표시 확인 (모의 공급자가 만든 오류) |
| [16-fs1920-follow-up-streaming.webp](16-fs1920-follow-up-streaming.webp) | 전체화면 1920 · 이어 묻기 스트리밍 | ✅ 통과 (모의 답변) |
| [17-fs1920-follow-up-done.webp](17-fs1920-follow-up-done.webp) | 전체화면 1920 · 이어 묻기 완료 | ✅ 통과 (모의 답변) |
| [18-before-restore-chat-empty.webp](18-before-restore-chat-empty.webp) | 복원 전 대화 없음 | ✅ 통과 (모의 답변) |
| [19-backup-preview-shows-chats.webp](19-backup-preview-shows-chats.webp) | 백업 미리보기에 대화 수 표시 | ✅ 통과 (모의 답변) · PC 이름/경로 가림 |
| [20-after-restore-thread-back.webp](20-after-restore-thread-back.webp) | 복원 후 대화 돌아옴 | ✅ 통과 (모의 답변) |
| [21-record-tab-shows-saved-ai-answer.webp](21-record-tab-shows-saved-ai-answer.webp) | 기록 탭에 저장된 AI 답변 | ✅ 통과 (모의 답변) |

## 확인하지 않은 것

- 실제 키보드의 Esc 키로 전체화면을 빠져나오는 동작 (자동화는 앱 버튼과 `document.exitFullscreen()`만 사용)
- 물리적으로 다른 두 PC (동기화는 같은 PC의 서로 격리된 두 상태로만 확인)
- 실제 ChatGPT 답변의 품질 (`DUVI_CHAT_MOCK=1` 모의 공급자만 사용)
- 강의 영상 내용 자체 (영상 프레임은 화면 배치를 보여 주는 작은 증거 사진일 뿐입니다)
