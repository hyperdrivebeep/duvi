# 학습 커리큘럼과 강의·자료 목록

> Duvi 학습 로드맵 버전 1을 읽기 편하게 펼쳐 쓴 문서입니다. 단계 순서·영상·자료의 정본은 [앱의 학습 로드맵 소스](../src/learning-roadmap.mjs)와 [Glorious Purpose 학습 로드맵](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/10_RESEARCH/DISCOVERY_LEARNING_ROADMAP.md)입니다. 앱 정본 버전: `15e84dd2a58aebb67f0f2f0de4d648806525c805` (확인 기록 2026-11-16). 이 문서는 학습 기록이나 개인 완료 상태를 담지 않습니다.

## 이 순서로 배우는 이유

북극성은 [인간의 삶을 바꿀 과학의 발전을 만드는 에이전트](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/00_DIRECTION/NORTH_STAR.md)입니다. 데이터가 충분해 보여도 어떤 대상을 모았는지, 무엇을 측정했고, 어떤 표현과 가정으로 해석했는지에 따라 결론이 달라질 수 있다는 질문에서 출발합니다. 그래서 먼저 직접 작은 데이터를 만들고 계산하는 힘을 익힌 다음, 증거의 불확실성·예측 검증·인과 식별·모델 구조·탐색 정책을 차례로 배웁니다. 마지막에는 기존 설명을 유지할지, 자료를 재분석할지, 새로 측정할지, 아직 판단을 보류할지를 실제 문제에 적용합니다.

전체 일정은 초안 1–5주 → 6–9주 → 10–13주 → 14–17주 → 18–21주 → 22–25주 → 26–29주 → 30–33주입니다. 이는 고정된 졸업 기한이 아닙니다. 선수 지식과 직접 수행 여부에 따라 단계를 연장합니다. 영상 시청률·자기 완료 표시·AI의 칭찬으로 이해나 과학적 발견을 인증하지 않습니다.

### 연결된 자료 수

- 강의·영상 항목 42개 (같은 Stanford 강의의 서로 다른 구간은 별도 학습 항목으로 셈)
- 읽기 자료 23개
- 연습 과제 1개
- 합계 66개

## 1. Python과 자료 생성 · 1–5주

**목표:** 첫 본강의는 MIT 1 → 2 → 3. 이후 14강까지 순서대로 배우며 자료가 선택되는 과정을 코드로 설명한다.

**왜 이 단계인가:** 변수·조건문·반복문·자료 구조를 직접 다뤄야 어떤 관측이 선택되고 버려지는지 코드로 추적할 수 있습니다. 첫 과제는 선택 규칙만으로 평균이 바뀌는 현상을 작게 재현합니다.

**직접 해 볼 일:** 첫 2주: 모의 측정값 [1..10]의 전체 평균 5.5와 5 이상만 보관한 평균 7.5를 계산한다. 선택 규칙을 바꾸고 +2 센서 오프셋과 비교한다. 3~5주는 함수·목록·딕셔너리로 원본과 결과를 분리한다.

**다음 단계 전 확인:** 새 목록에서 조건/반복/함수를 도움 없이 작성하고, 선택된 값만으로 원래 평균을 확정할 수 없는 이유를 설명한다. 실패하면 2주 단위로 보충. 시청률이나 AI 칭찬은 통과가 아니다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 영상 | MIT 1. Introduction to CS and Programming Using Python | 값·변수·연산을 실행하고 입력을 바꾸기 전에 출력을 예상한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-1-version-2_mp4/) |
| 영상 | MIT 2. Strings, Input/Output, and Branching | 조건문으로 측정값 5 이상만 기록한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-2-multi-version-4_1_mp4/) |
| 영상 | MIT 3. Iteration | 반복으로 합·개수를 계산하고 전체/선택 평균을 비교한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-3-multi_mp4/) |
| 영상 | MIT 4. Loops over Strings, Guess-and-Check, and Binary | 반복의 종료와 탐색 범위를 작은 입력으로 확인한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-4-multi_mp4/) |
| 영상 | MIT 5. Floats and Approximation Methods | 부동소수점 오차와 허용 오차를 구분한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-5-multi_mp4/) |
| 영상 | MIT 6. Bisection Search | 구간과 종료 조건을 설명하고 다른 입력에서 시험한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-6-multi-version-3_mp4/) |
| 영상 | MIT 7. Decomposition, Abstraction, and Functions | 선택 규칙과 평균 계산을 함수로 나눈다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-7-multi_mp4/) |
| 영상 | MIT 8. Functions as Objects | 다른 선택 함수를 같은 자료에 적용한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-8-version-2_mp4/) |
| 영상 | MIT 9. Lambda Functions, Tuples, and Lists | 순서·자료 구조와 계산 결과의 관계를 설명한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-9-version-2_mp4/) |
| 영상 | MIT 10. Lists and Mutability | 원본 목록을 보존하며 선택된 목록을 만든다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-10-version-3_1_mp4/) |
| 영상 | MIT 11. Aliasing and Cloning | 복사와 공유 참조의 차이를 실제 출력으로 확인한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-11-version-2_mp4/) |
| 영상 | MIT 12. List Comprehension, Functions as Objects, Testing, and Debugging | 빈 목록·경계값·반례 입력으로 선택 함수를 검사한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-12-multi-version-4_mp4/) |
| 영상 | MIT 13. Exceptions and Assertions | 잘못된 입력과 계산할 수 없는 평균을 명시한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-13-version-2_mp4/) |
| 영상 | MIT 14. Dictionaries | 원본·선택 규칙·결과를 구분해 저장한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-14-multi_mp4/) |
| 실습 | MIT Finger Exercises | 본 강의 번호에 해당하는 연습을 풀고 원래 답·도움·수정 이유를 남긴다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/pages/finger-exercises/) |
| 영상 | Stanford CS229 — Building LLMs (Yann Dubois) (0:00–8:00) | 선택 오리엔테이션 최대 8분. 현재 URL 접근 미확인으로 외부 링크만 제공. 어려우면 생략하고 MIT 1부터 시작한다. | [열기](https://www.youtube.com/watch?v=9vM4p9NN0Ts) |

## 2. 수학·표본·베이즈 · 6–9주

**목표:** Python 독립 수행 이후 벡터·미분·조건부확률로 증거와 불확실성을 계산한다.

**왜 이 단계인가:** 벡터·미분·확률·베이즈 계산으로 측정값과 가설의 관계, 표본 변동, 새 증거가 판단에 주는 영향을 숫자로 다룹니다.

**직접 해 볼 일:** 두 가설의 prior×likelihood를 정규화해 posterior를 손계산한다. 반복 표본·결측·선택 규칙을 바꾸고 변동을 비교한다. 기존 Bayesian lesson001은 여기서 재사용한다.

**다음 단계 전 확인:** 분수·지수·로그·그래프·조건부확률·벡터를 작은 수로 설명하고 새 증거에 따른 업데이트를 독립 계산한다. 막히면 수학 보충 4~8주를 추가한다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 영상 | Vectors \| Chapter 1, Essence of linear algebra | 벡터를 좌표와 방향 두 방식으로 설명한다. | [열기](https://www.youtube.com/watch?v=fNk_zzaMoSs) |
| 영상 | Linear combinations, span, and basis vectors \| Chapter 2, Essence of linear algebra | 작은 벡터의 선형 결합을 직접 계산한다. | [열기](https://www.youtube.com/watch?v=k7RM-ot2NWY) |
| 영상 | Linear transformations and matrices \| Chapter 3, Essence of linear algebra | 행렬을 변환으로 읽고 입력/출력 shape를 확인한다. | [열기](https://www.youtube.com/watch?v=kYB8IZa5AuE) |
| 영상 | Dot products and duality \| Chapter 9, Essence of linear algebra | 내적을 손계산하고 표현의 의미를 설명한다. | [열기](https://www.youtube.com/watch?v=LyGKycYT2v0) |
| 영상 | The essence of calculus | 함수 그래프의 작은 변화와 기울기를 연결한다. | [열기](https://www.youtube.com/watch?v=WUvTyaaNkzM) |
| 영상 | Visualizing the chain rule and product rule \| Chapter 4, Essence of calculus | 연쇄법칙 결과를 수치 미분과 비교한다. | [열기](https://www.youtube.com/watch?v=YG15m2VwSjA) |
| 읽기 | Think Bayes 1. Probability | 외부 교재. 작은 수로 계산한 뒤 코드로 확인하고 가정과 선택 규칙을 적는다. | [열기](https://allendowney.github.io/ThinkBayes2/chap01.html) |
| 읽기 | Think Bayes 2. Bayes’s Theorem | 외부 교재. 작은 수로 계산한 뒤 코드로 확인하고 가정과 선택 규칙을 적는다. | [열기](https://allendowney.github.io/ThinkBayes2/chap02.html) |
| 읽기 | Think Bayes 3. Distributions | 외부 교재. 작은 수로 계산한 뒤 코드로 확인하고 가정과 선택 규칙을 적는다. | [열기](https://allendowney.github.io/ThinkBayes2/chap03.html) |
| 읽기 | Think Bayes 4. Estimating Proportions | 외부 교재. 작은 수로 계산한 뒤 코드로 확인하고 가정과 선택 규칙을 적는다. | [열기](https://allendowney.github.io/ThinkBayes2/chap04.html) |

## 3. ML과 검증 · 10–13주

**목표:** 손실을 줄이는 예측과 새로운 원리를 발견한다는 주장을 구분한다.

**왜 이 단계인가:** 훈련 자료에서 잘 맞는 예측과 새로운 세계에서도 유지되는 설명은 다릅니다. 분할·누수·과적합·seed 변동을 직접 비교합니다.

**직접 해 볼 일:** 행 무작위 분할과 세계 단위 분할의 성능을 비교한다. 전처리와 설정 선택은 훈련/검증 안에서 수행하고 실행 전 예상을 보존한다.

**다음 단계 전 확인:** 새 세계에서의 오차·seed 변동·비용을 보고하고 누수 사례를 찾는다. 오차 허용값 0.015→0.030 변화가 모델 개선이 아닌 이유를 설명한 뒤 다음 단계로 간다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 읽기 | MLCC — Linear regression | 외부 Google 학습 모듈. 회귀와 가중치·절편을 읽는다. | [열기](https://developers.google.com/machine-learning/crash-course/linear-regression) |
| 읽기 | MLCC — Loss | 외부 모듈. 같은 예측의 손실을 직접 계산한다. | [열기](https://developers.google.com/machine-learning/crash-course/linear-regression/loss) |
| 읽기 | MLCC — Gradient descent | 외부 모듈. 작은 선형 모델의 가중치를 한 번 갱신한다. | [열기](https://developers.google.com/machine-learning/crash-course/linear-regression/gradient-descent) |
| 읽기 | MLCC — Datasets, generalization, and overfitting | 외부 모듈. 분할·과적합을 배우고 세계/시점 단위 holdout과 연결한다. | [열기](https://developers.google.com/machine-learning/crash-course/overfitting) |

## 4. 인과·정보·불확실성 · 14–17주

**목표:** 관찰로 식별할 수 있는 것과 추가 개입이 필요한 것을 분리한다.

**왜 이 단계인가:** 관측된 연관만으로 원인을 확정할 수 있는지 검토합니다. 잠재 결과·그래프·구조 모형·무작위 실험을 통해 필요한 가정을 드러냅니다.

**직접 해 볼 일:** 관측은 같고 개입 결과가 다른 두 세계를 만든다. (0.5,0.5)/(0.9,0.1)의 entropy와 기대 사후 entropy, 구간 포함률+폭, Brier와 반복 변동을 함께 계산한다.

**다음 단계 전 확인:** 새 사례에서 가정·식별 가능성·추가 측정을 독립 설명한다. 필요한 정보가 없으면 보류하고, 불확실한 예측과 가설을 구별하는 측정을 혼동하지 않는다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 영상 | 1.1 - Intro and Outline of A Brief Introduction to Causal Inference | 동기 도입. 아래 공식 교재 1장 및 강의 목록의 후속 절을 함께 읽는다. | [열기](https://www.youtube.com/watch?v=CfzO4IEMVUk) |
| 영상 | 2.1 - What are Potential Outcomes? | 잠재 결과 표에서 관측하지 못한 값을 구분한다. 교재 2장과 연결한다. | [열기](https://www.youtube.com/watch?v=q8x9aetyok0) |
| 영상 | 3.1 - Graphical Models (Intro and Outline) | 그래프 단원 도입. 교재 3장에서 chain/fork/collider를 비교한다. | [열기](https://www.youtube.com/watch?v=Go4EkHN_PcA) |
| 영상 | 4.7 - Structural Causal Models SCMs | 구조 방정식과 관측/개입을 구분한다. 교재 4장과 함께 본다. | [열기](https://www.youtube.com/watch?v=dQeRqb0N6gs) |
| 영상 | 5.1 - Randomized Experiments and Identification (Intro and Outline) | 무작위 실험 단원 도입. 교재 5~6장에서 식별 가정을 확인한다. | [열기](https://www.youtube.com/watch?v=z91LnTDyhtI) |
| 읽기 | Brady Neal — Introduction to Causal Inference, chapters 1–6 | 외부 교재. 도입 클립만으로 단원을 마치지 않는다. 잠재 결과→그래프→SCM→무작위 실험 순서로 읽는다. | [열기](https://www.bradyneal.com/Introduction_to_Causal_Inference-Dec17_2020-Neal.pdf) |
| 읽기 | Brady Neal — 공식 강의·슬라이드 목록 | 각 도입 다음의 후속 절을 이 목록에서 선택한다. | [열기](https://www.bradyneal.com/causal-inference-course) |
| 읽기 | Think Bayes 9. Decision Analysis | 외부 교재. 기대 효용과 정보의 가치를 계산한다. | [열기](https://allendowney.github.io/ThinkBayes2/chap09.html) |

## 5. 신경망·LLM · 18–21주

**목표:** MIT 17/18 → tensor → micrograd → makemore 순서. 문맥·posterior·후보·가중치·기억 중 무엇이 바뀌는지 구분한다.

**왜 이 단계인가:** Python 객체와 행렬 연산을 준비한 뒤 역전파와 작은 언어 모형을 살펴봅니다. 모델의 가중치 조정·문맥·학습 자료·후처리 중 무엇이 변했는지 나누어 생각합니다.

**직접 해 볼 일:** 최소 40시간: 선수10·영상6·역전파/bigram12·3-token attention 손계산4·평가/설명8. 고정 연산 그래프를 역순으로 미분하고 수치 미분과 비교한다.

**다음 단계 전 확인:** micrograd 전에 값/기울기 객체 메서드 수정, 행렬곱, 연쇄법칙을 도움 없이 수행한다. 미충족이면 1~2주 연장. 작은 bigram 수정이 범위이며 full GPT는 별도 선택 4주다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 영상 | MIT 17. Python Classes | micrograd 선수: 값과 기울기를 가진 작은 객체를 만든다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-17-version-2_mp4/) |
| 영상 | MIT 18. More Python Class Methods | micrograd 선수: 메서드를 수정하고 결과를 독립적으로 예상한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/resources/6100l-lecture-18-multi-version-2_mp4/) |
| 읽기 | PyTorch — Tensors | 선수 연결 4시간. 2×3과 3×2 행렬곱의 shape와 원소를 설명한다. | [열기](https://docs.pytorch.org/tutorials/beginner/basics/tensorqs_tutorial.html) |
| 영상 | The spelled-out intro to neural networks and backpropagation: building micrograd | 선수 확인 후 스칼라 역전파를 수정한다. 전체 재귀 엔진 구현은 별도 보충이다. | [열기](https://www.youtube.com/watch?v=VMj-3S1tku0) |
| 영상 | The spelled-out intro to language modeling: building makemore | 작은 bigram의 일부를 수정하고 손실·표본·분할을 설명한다. 전체 GPT 구현은 선택 심화다. | [열기](https://www.youtube.com/watch?v=PaCmpygFfXo) |
| 영상 | Stanford CS229 — Building LLMs (Yann Dubois) (19:08–40:41) | 정본의 자막 확인 기록: 평가 시작 19:08. 설명란 16:00과 다름. 현재 링크 접근 미확인; 전체 시청 검증 아님. | [열기](https://www.youtube.com/watch?v=9vM4p9NN0Ts&t=1148s) |
| 영상 | Stanford CS229 — Building LLMs (Yann Dubois) (59:54) | 정본 기록: 59:54 post-training, 1:02:24 SFT, 1:10:05/1:12:28 SFT 한계·RLHF. 시청 가능할 때 해당 절을 선택한다. | [열기](https://www.youtube.com/watch?v=9vM4p9NN0Ts&t=3594s) |
| 읽기 | MIT 15–16 — 선택 보충: recursion | 재귀 그래프 순회를 직접 구현할 때만 15~16강을 별도 보충한다. | [열기](https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/video_galleries/lecture-videos/) |

## 6. RL·탐색 · 22–25주

**목표:** David Silver 1→2→3→4→5→8→9의 필요한 절을 보며 자료 수집 정책을 시험한다.

**왜 이 단계인가:** 에이전트가 자료를 고르는 정책 자체가 관측 결과를 바꿀 수 있습니다. 무작위 선택·정보를 얻는 선택·강제 탐색을 같은 예산에서 시험합니다.

**직접 해 볼 일:** 작은 표 기반 환경과 학습한 전이 모델을 만든다. 같은 관측/계산 예산에서 무작위·정보 선택·강제 탐색을 비교한다.

**다음 단계 전 확인:** 평가 oracle과 숨은 생성 규칙을 입력에서 제외한다. 새 seed/세계에서 실패까지 보고하고 특정 합성 세계의 우위를 보편 법칙으로 확대하지 않는다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 영상 | RL Course by David Silver - Lecture 1: Introduction to Reinforcement Learning | 상태·행동·보상과 관측을 구분한다. | [열기](https://www.youtube.com/watch?v=2pWv7GOvuf0) |
| 영상 | RL Course by David Silver - Lecture 2: Markov Decision Process | 작은 전이표와 반환을 손계산한다. | [열기](https://www.youtube.com/watch?v=lfHX2hHRMVQ) |
| 영상 | RL Course by David Silver - Lecture 3: Planning by Dynamic Programming | 표 기반 환경에서 가치 갱신을 계산한다. | [열기](https://www.youtube.com/watch?v=Nd1-UUMVfz4) |
| 영상 | RL Course by David Silver - Lecture 4: Model-Free Prediction | 실제 경험으로 예측을 갱신한다. | [열기](https://www.youtube.com/watch?v=PnHCvfgC_ZA) |
| 영상 | RL Course by David Silver - Lecture 5: Model Free Control | 탐색과 정책 개선을 비교한다. | [열기](https://www.youtube.com/watch?v=0g4j2k_Ggc4) |
| 영상 | RL Course by David Silver - Lecture 8: Integrating Learning and Planning | 학습한 전이 모델로 계획하고 실제 경험과 구분한다. | [열기](https://www.youtube.com/watch?v=ItMutbeOHtc) |
| 영상 | RL Course by David Silver - Lecture 9: Exploration and Exploitation | 무작위·정보 선택·강제 탐색을 같은 예산으로 비교한다. | [열기](https://www.youtube.com/watch?v=sGuiWX07sKw) |
| 읽기 | David Silver — 강의 슬라이드와 Easy21 | 외부 공식 자료. 필요한 강의 절과 표 기반 실습을 연결한다. | [열기](https://www.davidsilver.uk/teaching/) |

## 7. 역학·변수·기호 회귀 · 26–29주

**목표:** 벡터·뉴턴·스프링/진동을 통해 단위, 표현과 판별 가능한 관측 범위를 연결한다.

**왜 이 단계인가:** 물리량의 단위와 운동 모형을 배우고 후보 식이 자료를 설명하는 범위를 따집니다. 좁은 범위에서 맞는 식을 곧바로 새로운 법칙이라 부르지 않도록 합니다.

**직접 해 볼 일:** 단위가 맞지 않는 후보를 제외하고 원시 변수와 계산 가능한 새 조합을 비교한다. y=x와 y=x+c·x³가 갈라지는 측정 범위를 제안한다.

**다음 단계 전 확인:** 새 변수가 관측에서 계산 가능한지, 두 식의 예측 차이가 측정 오차보다 큰지 설명한다. 좁은 범위의 적합을 새로운 물리 법칙 발견으로 부르지 않는다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 영상 | 0.1 Vectors vs. Scalars | 물리량의 단위·크기·방향을 구분한다. | [열기](https://www.youtube.com/watch?v=5ucfHd8FWKw) |
| 영상 | 4.1 Newton's First and Second Laws | 관측한 운동과 힘에 대한 가정을 분리한다. | [열기](https://www.youtube.com/watch?v=89SjJv30kGU) |
| 영상 | 7.1 Pushing Pulling and Tension | 힘의 전달을 그린 뒤 공식 역학 자료에서 스프링·진동으로 이어간다. | [열기](https://www.youtube.com/watch?v=RBaBEjzMr4E) |
| 읽기 | MIT 8.01SC — Chapter 23: Simple Harmonic Motion | 외부 교재. 질량-스프링의 힘·진동수·단위를 확인한다. | [열기](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter23.pdf) |
| 읽기 | AI Feynman — 방법 부분 | 외부 저자 논문. 차원 분석·변수 변환·기호 회귀의 가정을 읽는다. 원문 PMC는 접근 확인 중 브라우저 검사를 반환했다. | [열기](https://arxiv.org/abs/1905.11481) |

## 8. 네 조건 비교 실습 · 30–33주

**목표:** 기존 설명 유지·재분석·새 측정·보류가 각각 적절한 상황을 구분한다.

**왜 이 단계인가:** 앞 단계의 도구를 Glorious 문제에 연결합니다. 기존 설명 유지·재분석·새 측정·보류가 각각 필요한 조건을 비교하고, 원래 실험의 재현과 교육용 실습을 구별합니다.

**직접 해 볼 일:** ① 원자료에 단서 있음 ② 관측 범위 밖에서만 후보 차이 ③ 필요한 정보 없음 ④ 기존 이론+잡음/오프셋의 네 조건을 만든다. 고정 trace 해석과 능동 실험 선택 비교를 분리한다.

**다음 단계 전 확인:** 동일 예산·후보·관측 접근, 새 seed/세계군 평가, 실패·유지 사례를 보존한다. SHA/config/seed/의존성/체크포인트/실행 명령·비용이 없으면 원 EXP 재현으로 표시하지 않는다. 도움 없는 새 문제 수행과 수정 근거로만 진전을 판단한다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 읽기 | 데이터 한계와 발견 연구 노트 | 공개 URL은 404. 제공된 glorious-purpose-reference/PROJECT_WIKI/10_RESEARCH의 로컬 사본 또는 저장소 접근 권한이 필요하다. 연구 주장·관측·한계를 분리한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/10_RESEARCH/DATA_AND_DISCOVERY_LIMITS.md) |
| 읽기 | EXP-054 PLAN | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-054/PLAN.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/30_EXPERIMENTS/EXP-054/PLAN.md) |
| 읽기 | EXP-054 RESULT | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-054/RESULT.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/30_EXPERIMENTS/EXP-054/RESULT.md) |
| 읽기 | EXP-055 PLAN | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-055/PLAN.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/30_EXPERIMENTS/EXP-055/PLAN.md) |
| 읽기 | EXP-055 RESULT | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-055/RESULT.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/30_EXPERIMENTS/EXP-055/RESULT.md) |
| 읽기 | EXP-056 PLAN | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-056/PLAN.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/30_EXPERIMENTS/EXP-056/PLAN.md) |
| 읽기 | EXP-056 RESULT | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-056/RESULT.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/15e84dd2a58aebb67f0f2f0de4d648806525c805/PROJECT_WIKI/30_EXPERIMENTS/EXP-056/RESULT.md) |

## 첫 2주: 주 10시간을 2시간씩 나누는 예시

아래는 현재 앱 로드맵의 10회 연습입니다. 강의를 빨리 끝내기보다, 실행 전 예상과 실제 결과를 비교하고 선택 규칙이 결론에 미치는 영향을 직접 설명하는 것이 목적입니다.

| 회차 | 학습 활동 | 직접 남길 결과 |
|---:|---|---|
| 1 | 실행 환경 준비 + MIT 1강 앞부분 | IDLE에 print(2 + 3)을 저장·실행하고 입력을 바꾸기 전 결과를 예상한다. Stanford 도입8분은 선택이다. |
| 2 | MIT 1강 나머지 + Finger Exercise | 입력 변경 전 예상과 실제 출력, 차이가 생긴 이유를 남긴다. |
| 3 | MIT 2강과 조건문 | 4·5·6을 각각 입력해 5 이상일 때만 출력하는 코드를 쓴다. |
| 4 | MIT 2강 복습 + 새 입력 | 어떤 측정이 기록에서 빠졌는지 선택 규칙으로 설명한다. |
| 5 | 화면을 닫고 조건문 다시 작성 | 경계값5와 반례4를 확인하고 AI 도움 여부를 적는다. |
| 6 | MIT 3강 반복문 | 1~10의 합55와 개수10을 반복문으로 계산한다. |
| 7 | MIT 3강 연습 + 전체/선택 평균 | 모의 측정값 [1..10]에서 전체5.5와 5 이상 선택7.5를 비교한다. |
| 8 | 선택 규칙 바꾸기 | 임계값5·7·11을 비교하고 선택값이 없을 때 평균을 만들지 않는다. |
| 9 | 새 목록 + 고정 오프셋 | [2,4,6,8]에서 반복한다. 포함 여부를 먼저 고정한 +2 오프셋과 재선택을 구분한다. |
| 10 | 도움 없이 설명 + 원 목록 숨기기 | 누락값과 개수를 모르면 전체 평균을 확정할 수 없는 이유를 설명하고 필요한 정보를 적는다. |

## 자료 확인 범위와 주의점

이 목록은 2026-11-16에 기록된 Duvi 로드맵 스냅샷을 그대로 정리합니다. 확인 기록: 제공된 로컬 정본과 공식 강의 목록/YouTube 제목·채널 확인. Glorious 공개 URL은 HTTP 404로 로컬 사본 또는 저장소 접근 권한 필요. 전체 영상 시청·자막 대조 아님. Stanford 구간은 정본의 기존 기록을 인용하며 현재 접근은 미확인.

각 항목의 링크는 원 출처를 가리킵니다. 링크 등록이나 제목 확인이 전체 영상 시청, 자막 검수, 모든 링크의 현재 접근 가능성을 뜻하지는 않습니다. Stanford 영상은 지정한 일부 구간만 선택 항목으로 연결되어 있고 접근이 확인되지 않은 상태입니다. Glorious Purpose의 내부 문서 링크는 저장소 접근 권한이 필요할 수 있습니다. 링크가 열리지 않으면 해당 저장소의 같은 경로에 있는 원문을 사용하세요.

수정할 때는 앱의 `src/learning-roadmap.mjs`와 Glorious Purpose 정본을 함께 대조하고, 확인하지 않은 자료를 검증 완료로 표시하지 마세요.
