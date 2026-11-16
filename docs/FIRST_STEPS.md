# Duvi 첫 학습 시작

첫 본강의는 **MIT Python Lecture 1 → 2 → 3**이다. 1~14강을 먼저 배우고, 신경망 단계에서 17/18강을 거친 뒤 micrograd로 간다. 이미 있는 MIT 26개 강의를 다시 가져오지 않는다.

일정의 정본은 [33주 학습 로드맵](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/10_RESEARCH/DISCOVERY_LEARNING_ROADMAP.md)이다. 앱 지도는 이 버전의 실행용 요약이며 별도 일정의 정본이 아니다. 주 10~12시간의 초기 편성이고 수행에 따라 연장한다.

## 강의 준비

학습 지도의 준비 동작은 기존 MIT 데이터를 재사용하고, 검증된 YouTube 강의의 제목·채널·주소만 등록한다. 폴더는 `learning-phase-1`부터 `learning-phase-8`까지다. 기존 폴더·강의·자막·번역·기록을 유지하고 같은 준비를 반복해도 강의를 중복 생성하지 않는다. 단계 안에서는 지정 강의가 먼저, 사용자가 추가한 강의가 뒤에 온다. 사용자가 바꾼 폴더 이름도 유지한다.

관리용 CLI는 저장소 루트에서 실행한다. 서버가 같은 저장소를 수정하지 않는 상태에서 사용한다. API 경로는 서버가 사용하는 동일 `LectureLibrary` 인스턴스를 전달해야 동시 쓰기가 직렬화된다.

```powershell
node scripts/prepare-learning.mjs
node scripts/prepare-learning.mjs --root "C:/path/to/existing/backend"
```

기본 경로는 이 프로젝트의 `backend`다. 다른 경로는 `data/catalog.json`과 기존 MIT 강의 JSON이 있는 backend 디렉터리를 지정한다. 필수 MIT 1~14·17·18강이 없으면 쓰기 전에 `learning_missing_mit`로 중단한다. 기존 setup을 완료한 저장소를 사용한다. 이 명령은 MIT 원본을 새로 만들거나 자막/영상을 내려받지 않는다. 준비 결과에는 개수만 출력하며 인증정보를 읽지 않는다.

새 YouTube 강의는 자막 대기 상태다. 강의를 열 때 기존 플레이어의 자막 준비 경로를 사용한다. 외부 제공자의 제한으로 실패하면 강의는 남아 있고 기존 SRT/VTT 추가 기능으로 복구할 수 있다. 교재·논문·외부 연습은 학습 지도의 링크로 열며 가짜 강의로 등록하지 않는다. 읽기 중심 단계의 폴더가 비어 있어도 지도에는 자료가 있다.

## 첫 실행: 20~30분

[Python 공식 다운로드](https://www.python.org/downloads/)와 [IDLE 사용법](https://docs.python.org/3/library/idle.html)을 참고해 IDLE을 연다. File → New File에 `print(2 + 3)`을 적고 개인 학습 폴더의 `first.py`로 저장한다. Run → Run Module(F5)에서 5를 확인한다. 파일을 닫았다 다시 열고 2를 4로 바꿔 7을 확인한다. 설치가 지연되면 강의를 다음 회차로 이월한다. Duvi는 임의 Python 코드를 실행하는 도구가 아니므로 실습 파일은 IDLE에서 실행한다.

## 첫 2주: 2시간씩 10회

| 회차 | 할 일 | 남길 결과 |
|---|---|---|
| 1 | 실행 환경 준비 + MIT 1강 앞부분 | 변수 계산, 입력 변경 전 예상. Stanford 도입은 선택이며 최대 8분 |
| 2 | MIT 1강 나머지 + 해당 [Finger Exercise](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/pages/finger-exercises/) | 예상과 실제 출력, 차이가 생긴 이유 |
| 3 | MIT 2강, 조건문 | `measurement = 4`, `5`, `6`을 각각 입력하고 5 이상만 출력 |
| 4 | MIT 2강 복습과 새 입력 | 어떤 값이 기록에서 빠졌는지 설명 |
| 5 | 영상과 답을 닫고 조건문 재작성 | 경계값 5와 반례 4를 포함한 독립 시도, 도움 여부 |
| 6 | MIT 3강, 반복문 | 1~10의 합 55와 개수 10 |
| 7 | MIT 3강 연습, 목록과 반복 | 전체 평균과 선택 평균 비교 |
| 8 | 아래 선택 편향 실습 | 임계값 5/7/11의 결과, 빈 선택 집합 처리 |
| 9 | 새 목록 `[2,4,6,8]`과 +2 오프셋 | 선택 규칙 변경과 측정 오프셋의 차이 |
| 10 | 도움 없이 설명, 원 목록을 숨긴 문제 | 전체 평균을 알 수 없는 이유와 추가로 필요한 정보 |

한 회차가 2시간을 넘으면 다음 회차로 넘긴다. 주간 기본 배분은 강의3·구현4·손계산/회상2·연구 연결1~3시간이다. 완강을 위해 실습을 생략하지 않는다.

## 첫 실습: 기록 규칙이 결론을 바꾸는가

교육용 모의 측정값이다. 자연 현상의 새 법칙을 입증하는 자료가 아니다. 실행 전에 전체 평균과 선택 평균을 예상해서 적는다. 다음 예시는 3강의 반복문을 배운 뒤 사용한다.

```python
measurements = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
threshold = 5
total = 0
count = 0
selected_total = 0
selected_count = 0

for value in measurements:
    total += value
    count += 1
    if value >= threshold:
        selected_total += value
        selected_count += 1

if count > 0:
    print("all:", total / count)
else:
    print("all: no observations")
if selected_count > 0:
    print("selected:", selected_total / selected_count)
else:
    print("selected: no observations")
```

기본 출력은 `all: 5.5`, `selected: 7.5`다. 임계값 7이면 선택 평균은 8.5, 11이면 선택된 관측이 없다. `[2,4,6,8]`에서 임계값 5이면 전체 평균5·선택 평균7이다. 원본 목록을 덮어쓰지 않고 파일을 별도 이름으로 저장한다.

오프셋 비교는 **먼저 원래 값으로 포함 여부를 정하고**, 보관된 각 측정값에 2를 더한다. 전체 보정 전 평균5.5→측정 평균7.5, 같은 여섯 개 보관값 평균7.5→9.5다. 오프셋 후 다시 5 이상을 선택하면 포함 집합까지 달라진다. 두 효과를 같은 실험으로 섞지 않는다.

마지막에는 `[5,6,7,8,9,10]`만 보고 원래 전체 평균을 묻는다. 누락된 개수·값이 없으면 전체 평균을 확정할 수 없다. 예를 들어 누락값이 `[1,2,3,4]`인 경우와 `[0,0,0,0]`인 경우는 같은 보관값을 만들지만 전체 평균은 다르다. 모르는 관측값을 만들어 정답처럼 쓰지 않는다.

## 다음 단계로 넘어가는 기준

시청, 시도, 설명, 계산 확인, 며칠 뒤 새 문제 적용을 구분해 기록한다. 준비 명령이나 시청 완료가 숙달 상태를 자동 변경하지 않는다. 앱의 단계별 `check`는 학습자가 수행 증거로 확인할 기준이며 자동 시험·잠금 기능이 아니다.

새 목록에서 조건·반복·함수를 도움 없이 작성하고, 선택된 자료만으로 알 수 없는 것을 설명한 뒤 다음 단계로 간다. 막히면 Python은 2주 단위, 수학은 4~8주 보충한다. MIT 17/18, tensor shape, 연쇄법칙을 설명하지 못하면 micrograd를 1~2주 미룬다. AI 점수와 칭찬만으로 통과 처리하지 않는다. 예시 코드 실행 검증은 학습자의 이해를 인증하지 않는다.

복습은 1/3/7일을 조정 가능한 출발점으로 잡고, 답을 보지 않은 새 입력에서 확인한다. 이전 답과 실패를 지우지 않는다. 기존 `glorious-purpose-learning`의 Bayesian lesson001은 6~9주에 재사용한다. 그 저장소의 RESUME/first-session 안내 정리는 이 작업 범위 밖의 통합 의존성이다.

## 짧은 기록 틀

평소에는 질문 한 줄만 저장해도 된다. 실습을 발전시킬 때 필요한 항목을 더한다.

```text
강의 ID / 시점 / 질문:
처음 예상과 내 설명:
관측 / 원본 위치 / 단위:
선택 규칙 / 누락 / 변수 / 가정:
사용한 도움: 없음 / 힌트 / 코드 일부 / 전체 생성 (도움을 받은 부분)
실행한 코드 파일 / 입력 / seed(해당할 때):
실제 결과와 계산 확인:
기존 설명 / 다른 설명 / 측정 오류 가능성:
두 설명을 구별할 새 관측과 예상:
생각을 바꾼 근거 / 아직 보류할 것:
며칠 뒤 새 문제의 독립 시도:
Glorious 연결: 해결할 실패 → 바꿀 부품 → 기대 이득/비용 → 확인 실험
```

## 출처 확인 범위 (2026-11-16)

[MIT 공식 목록](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/video_galleries/lecture-videos/), [Karpathy](https://karpathy.ai/zero-to-hero.html), [Silver](https://www.davidsilver.uk/teaching/), [Neal](https://www.bradyneal.com/causal-inference-course), [Google MLCC](https://developers.google.com/machine-learning/crash-course), [Think Bayes](https://allendowney.github.io/ThinkBayes2/chap01.html)에서 자료와 순서를 대조했다. 새 Duvi 영상의 ID·정확한 제목·채널은 YouTube oEmbed 응답으로 확인했다. Neal의 일부 영상은 단원 도입이므로 전체 단원을 배웠다는 의미가 아니며, 지도에 연결한 교재 1~6장과 후속 강의 절을 함께 사용한다.

Stanford `9vM4p9NN0Ts`는 정본에 기록된 제목/시간표를 유지하되 이번 oEmbed 요청은 Unauthorized를 반환했다. 현재 재생 가능하다고 주장하지 않으며 새 Duvi 강의로 등록하지 않는다. 19:08 평가 시작 등의 시각은 정본의 이전 자막 대조 기록에서 온 것으로 이번 작업에서 다시 검증한 시각이 아니다. AI Feynman의 PMC 주소는 브라우저 검사를 반환하여 저자 arXiv 주소를 제공한다. 전체 영상 시청, 전체 자막 대조, 사람의 숙달, 원 연구 실험 재현은 이 작업의 검증 범위가 아니다.

Glorious 연구 노트와 EXP-054~056의 공개 GitHub 요청은 HTTP 404를 반환했다. 공개 접근을 검증한 자료로 표시하지 않는다. 저장소 권한이 있는 계정으로 열거나 제공된 로컬 `../glorious-purpose-reference/PROJECT_WIKI/` 아래 `10_RESEARCH/`와 `30_EXPERIMENTS/` 사본을 사용한다. 정본 버전 식별자는 유지한다. Neal의 공식 사이트/교재는 웹 열람 도구에서 읽혔으나 로컬 Node HTTP 요청은 연결 오류였다. URL 접근 성공은 모든 환경의 영상 재생·자막 제공을 보장하지 않는다.
