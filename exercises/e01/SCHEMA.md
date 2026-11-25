# E01 기록 형식 v1

실행당 UTF-8 JSONL 파일 하나. 한 줄은 JSON 객체 하나다. 순번은 파일의 물리적
줄 번호와 같다. 한 호출은 `request` 한 줄과 바로 다음 `return` 한 줄을 남긴다.

| 필드 | 값 |
| --- | --- |
| `version` | 정수 `1` |
| `run_id`, `world_id` | 실행과 세계를 식별하는 16자리 16진 문자열. 이름·계정 등 개인 식별자는 넣지 않는다. |
| `seed` | 정수. 공개 세트는 `0`이며 평가 모드의 시드 0과는 별개다. |
| `seq`, `call_id` | 각각 1부터 연속 증가하는 줄/호출 번호. 쌍의 `call_id`는 동일하다. |
| `kind`, `tool` | `request`/`return`, `measure`/`submit` |
| `input` | 실제 좌표 정수 또는 후보 문자열(`null`이면 보류). 두 줄에 동일하게 기록한다. |
| `return` | 요청에서는 `null`. 반환에서는 실제 도구 객체. |
| `remaining_turns`, `remaining_measurements` | 0 이상의 정수. 호출을 받는 순간 턴 1, 측정 요청이면 측정도 1 차감. 반환 줄까지 유지한다. |
| `termination` | 진행 중 `null`; 종료 반환에서 `submitted`, `deferred`, 또는 `turns_exhausted`. |
| `config_hash`, `state_hash` | 아래 규칙의 SHA-256, 소문자 64자리 16진 문자열. |

반환 예: `{"status":"ok","value":7}`(측정), `{"status":"ok"}`(접수),
`{"status":"transient","evidence":"injected_transient"}`(주입),
`{"status":"ambiguous","message":"measurement unavailable"}`(원인 정보 없음),
`{"status":"invalid"}`(입력이 격자/후보 계약 밖). 층위가 다르므로 접수는 정답을
뜻하지 않는다. `measure` 예산이 0이면 호출하지 말고 남은 턴에서 제출한다.

정규화는 Python JSON에서 키 정렬, ASCII 이스케이프 강제 안 함, 구분자 `,`와 `:`,
NaN 불허, UTF-8 인코딩이다. 키 순서나 공백을 바꿔도 정규화 해시는 바뀌지 않는다.

* `config_hash = digest(config)`; 같은 이름의 `.config.json`은 공개 설정(버전,
  ID, seed, 턴·측정 상한, 허용 좌표 `points`, 좌표 순의 후보별 `predictions`)이다.
* `state_hash = digest([이전 state_hash, 현재 행에서 state_hash만 뺀 객체])`.
  첫 행은 `config_hash`에서 시작한다. 행의 실행 상태와 관측 이력을 묶는 해시다.
* 로그의 정규화 해시는 행 객체 **배열**의 `digest`다. 재채점 전후 원본 해시는
  JSON 정규화 없이 파일의 **바이트 그대로** 구한다.
* `.diagnoses.json`은 오류 반환의 `{"seq": 줄 번호,"label": 라벨}` 목록이다.
  줄 번호 순으로 적고 라벨은 `주입된 일시 오류` 또는 `원인 불명`이다.

해시는 일관성을 검사하는 도구이지 서명이나 위조 방지 장치가 아니다. 답과 오류
스케줄은 도구/채점 측에 있고, 공개 설정과 `solve` 인자로 전달하지 않는다.
