# 학습 커리큘럼과 강의·자료 목록

**현재 버전은 v4입니다.** 첫 두 주와 기존 13단계·227개 자료는 아래 v3 기준 목록과 같습니다. [v4 적용 설계](CURRICULUM_V4_APPLY.md)에 필수·권장·선택 분류, 선수 및 단계별 추정 시간을 정리했습니다. E01은 1·3B·5단계 뒤 첫 필수 v4 실습이며, 12–18시간은 시작 추정치입니다. 시간을 채우는 것이 아니라 새 로그까지 독립적으로 검증하고 설명하는 것이 통과 기준입니다.

> Duvi 학습 로드맵 버전 3을 읽기 편하게 펼쳐 쓴 문서입니다. 단계 순서·영상·자료의 정본은 [앱의 학습 로드맵 소스](../src/learning-roadmap.mjs)와 [Glorious Purpose 학습 로드맵](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/10_RESEARCH/DISCOVERY_LEARNING_ROADMAP.md)입니다. 앱 정본 버전: `a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4` (확인 기록 2026-11-18). 이 문서는 학습 기록이나 개인 완료 상태를 담지 않습니다.

## 이 순서로 배우는 이유

북극성은 [인간의 삶을 바꿀 과학의 발전을 만드는 에이전트](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/00_DIRECTION/NORTH_STAR.md)입니다. 데이터가 충분해 보여도 어떤 대상을 모았는지, 무엇을 측정했고, 어떤 표현과 가정으로 해석했는지에 따라 결론이 달라질 수 있다는 질문에서 출발합니다. 그래서 먼저 직접 작은 데이터를 만들고 계산하는 힘을 익힌 다음, 증거의 불확실성·예측 검증·인과 식별·모델 구조·탐색 정책을 차례로 배웁니다. 마지막에는 기존 설명을 유지할지, 자료를 재분석할지, 새로 측정할지, 아직 판단을 보류할지를 실제 문제에 적용합니다.

전체 일정은 초안 1–5주 → 6–9주 → 10–13주 → 14–17주 → 18–21주 → 22–25주 → 26–29주 → 30–33주 → 34–37주 → 38–41주 → 42–45주 → 46–49주 → 50–53주입니다. 이는 고정된 졸업 기한이 아닙니다. 선수 지식과 직접 수행 여부에 따라 단계를 연장합니다. 영상 시청률·자기 완료 표시·AI의 칭찬으로 이해나 과학적 발견을 인증하지 않습니다.

버전 2(2026-11-17)는 Glorious Purpose의 [R-020 커리큘럼 대조](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/10_RESEARCH/CURRICULUM_COVERAGE.md)에서 빠진 것으로 확인된 개념(편미분·행렬·우도, 학습 실무, 신경망 부품, Attention·Transformer·Neural Process, 불확실성·모델 비교)을 메우려고 2B·3B·5B·5C·5D 단계를 끼워 넣었습니다. 기존 1~8단계의 내용·순서·폴더는 그대로이고 주차만 뒤로 밀렸습니다.

버전 3(2026-11-18)은 단계와 주차를 바꾸지 않고, 버전 2에서 논문·문서로만 배울 수 있던 개념 58개마다 앱에서 재생할 수 있는 해설 영상을 붙였습니다(새 영상 58개, 약 23시간). 읽기 자료는 그대로이며 영상은 먼저 보거나 막힐 때 보는 해설입니다. 표의 "개념:"이 그 영상이 채우는 개념입니다. 5D에는 해설 영상 트랙과 작은 발견 루프 실습이 생겼습니다.

함께 보는 문서: 개념 하나하나의 뜻과 선수 개념은 [딥러닝 개념 지도](CONCEPT_MAP.md), 로드맵이 R-020의 빈 개념을 얼마나 채웠고 무엇이 남았는지는 [커리큘럼 재평가](CURRICULUM_EVALUATION.md)에 있습니다. 아는 개념을 체크해 건너뛰며 개념별 강의를 찾는 목록은 [공부 가이드](STUDY_GUIDE.md)입니다.

### 연결된 자료 수

- 강의·영상 항목 157개 (같은 Stanford 강의의 서로 다른 구간은 별도 학습 항목으로 셈)
- 읽기 자료 69개
- 연습 과제 1개
- 합계 227개

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
| 영상 | Stanford CS229 — Building LLMs (Yann Dubois) (0:00–8:00) | 선택 오리엔테이션 최대 8분. 현재 URL 접근 미확인으로 외부 링크만 제공. 어려우면 생략하고 MIT 1부터 시작한다. | [열기](https://www.youtube.com/watch?v=9vM4p9NN0Ts&t=0s) |

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

## 2B. 수학 보강: 미분·행렬·분포 · 10–13주

**목표:** 2단계의 벡터·연쇄법칙·베이즈 위에 편미분·기울기 벡터·행렬곱과 역행렬·고윳값·최대우도·엔트로피를 더해, 학습과 모델 비교에 쓰는 계산을 손으로 할 수 있게 한다.

**왜 이 단계인가:** 2단계만으로는 학습 코드와 모델 비교를 읽을 수 없습니다. 편미분·기울기 벡터·행렬곱과 역행렬·고윳값·최대우도·엔트로피는 경사하강법, 최소제곱, BIC, 정보 이득의 바탕입니다. 고교 과정에서 배웠더라도 머신러닝에서 쓰는 뜻으로 다시 확인합니다.

**직접 해 볼 일:** f(x,y)=x²y의 편미분과 기울기 벡터를 손으로 구하고 수치 미분과 비교한다. 2×2 행렬의 역행렬·고윳값을 계산한다. 세 점에 직선을 최소제곱으로 맞추고, 가우스 잡음에서 최대우도가 제곱오차가 되는 이유를 적는다.

**다음 단계 전 확인:** 편미분·기울기 벡터·행렬곱 shape·최소제곱·우도·엔트로피를 작은 수로 설명한다. 막히면 해당 영상만 다시 보고 2주 연장한다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 영상 | The paradox of the derivative \| Chapter 2, Essence of calculus | 도함수를 "아주 작은 변화의 비율"로 다시 설명한다. | [열기](https://www.youtube.com/watch?v=9vKqVkMQHKk) |
| 영상 | Derivative formulas through geometry \| Chapter 3, Essence of calculus | x², xⁿ, 곱의 미분을 그림으로 유도해 본다. | [열기](https://www.youtube.com/watch?v=S0_qX4VJhMQ) |
| 영상 | What's so special about Euler's number e? \| Chapter 5, Essence of calculus | eˣ가 자기 자신의 도함수인 이유를 설명한다. | [열기](https://www.youtube.com/watch?v=m2MIpDrF7Es) |
| 영상 | Logarithms \| Logarithms \| Algebra II \| Khan Academy | 로그가 곱을 합으로 바꾸는 것을 손계산한다. | [열기](https://www.youtube.com/watch?v=Z5myJ8dg_rM) |
| 영상 | Limits, L'Hôpital's rule, and epsilon delta definitions \| Chapter 7, Essence of calculus | 극한은 직관만 잡고 엄밀 정의는 넘어가도 된다. | [열기](https://www.youtube.com/watch?v=kfF40MiS7zA) |
| 영상 | Integration and the fundamental theorem of calculus \| Chapter 8, Essence of calculus | 적분을 넓이·누적으로 읽고 기댓값과 연결한다. | [열기](https://www.youtube.com/watch?v=rfG8ce4nNh0) |
| 영상 | Taylor series \| Chapter 11, Essence of calculus | 한 점 근처를 직선·곡선으로 근사하고 경사하강법과 연결한다. | [열기](https://www.youtube.com/watch?v=3d6DsjIBzJ4) |
| 영상 | Partial derivatives, introduction | 다른 입력을 고정하고 하나만 움직이는 편미분을 계산한다. | [열기](https://www.youtube.com/watch?v=AXqhWeUEtQU) |
| 영상 | Gradient | 편미분을 모은 기울기 벡터를 만들고 고교 "기울기"와 구분한다. | [열기](https://www.youtube.com/watch?v=tIpKfDc295M) |
| 읽기 | d2l 22.4 — Multivariable Calculus | 외부 교재. 기울기·야코비안·헤시안의 정의를 작은 예로 확인한다. | [열기](https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/multivariable-calculus.html) |
| 영상 | Matrix multiplication as composition \| Chapter 4, Essence of linear algebra | 행렬곱을 변환의 합성으로 읽고 shape 규칙을 확인한다. | [열기](https://www.youtube.com/watch?v=XkY2DOUCWMU) |
| 영상 | Inverse matrices, column space and null space \| Chapter 7, Essence of linear algebra | 역행렬과 랭크, 되돌릴 수 없는 변환을 구분한다. | [열기](https://www.youtube.com/watch?v=uQhTuRlWMxw) |
| 영상 | Eigenvectors and eigenvalues \| Chapter 14, Essence of linear algebra | 고유벡터를 방향이 안 바뀌는 벡터로 설명한다. | [열기](https://www.youtube.com/watch?v=PFDu9oVAE-g) |
| 영상 | The determinant \| Chapter 6, Essence of linear algebra | 행렬식을 넓이 배율로 이해한다(알아만 두기). | [열기](https://www.youtube.com/watch?v=Ip3X9LOh2dk) |
| 영상 | 16. Projection Matrices and Least Squares | 최소제곱을 사영으로 보고 공식 상수 맞추기와 연결한다. | [열기](https://www.youtube.com/watch?v=osh80YCg_GM) |
| 영상 | 27. Positive Definite Matrices and Minima | 양정부호와 최솟값, 헤시안의 관계를 본다. | [열기](https://www.youtube.com/watch?v=vF7eyJ2g3kU) |
| 영상 | Bayes theorem, the geometry of changing beliefs | 베이즈 갱신을 넓이 그림으로 다시 계산한다. | [열기](https://www.youtube.com/watch?v=HZGCoVF3YvM) |
| 영상 | Why π is in the normal distribution (beyond integral tricks) | 정규분포의 모양과 분산의 의미를 정리한다. | [열기](https://www.youtube.com/watch?v=cy8r7WSuT1I) |
| 영상 | But what is the Central Limit Theorem? | 평균의 오차가 1/√n로 줄어드는 이유를 설명한다. | [열기](https://www.youtube.com/watch?v=zeJD6dqJ5lo) |
| 영상 | In Statistics, Probability is not Likelihood. | 확률과 우도(가능도)를 구분한다. | [열기](https://www.youtube.com/watch?v=pYxNSUDSFH4) |
| 영상 | Maximum Likelihood, clearly explained!!! | 최대우도로 평균을 추정하고 제곱오차와 연결한다. | [열기](https://www.youtube.com/watch?v=XepXtl9YKwc) |
| 영상 | Covariance, Clearly Explained!!! | 공분산 부호의 뜻을 작은 표로 계산한다. | [열기](https://www.youtube.com/watch?v=qtaqvPAeEJY) |
| 영상 | Entropy (for data science) Clearly Explained!!! | 엔트로피를 평균 놀람으로 계산한다. | [열기](https://www.youtube.com/watch?v=YtebGVx-Fxw) |
| 영상 | Solving Wordle using information theory | 정보량으로 다음 질문(측정)을 고르는 법을 본다. | [열기](https://www.youtube.com/watch?v=v68zYyaEmEA) |
| 읽기 | d2l 22.11 — Information Theory | 외부 교재. 엔트로피·교차 엔트로피·KL을 같은 예로 계산한다. | [열기](https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/information-theory.html) |
| 읽기 | Mathematics for Machine Learning (교재) | 외부 교재. 막히는 개념의 장(선형대수 2–4장, 미적분 5장, 확률 6장)만 찾아 읽는다. | [열기](https://mml-book.github.io/) |
| 영상 | StatQuest: Principal Component Analysis (PCA), Step-by-Step | 선택: 주성분분석을 단계별로 따라간다. | [열기](https://www.youtube.com/watch?v=FgakZw6K1QQ) |
| 영상 | Singular Value Decomposition (SVD): Overview | 선택: 특이값 분해의 그림을 잡는다. | [열기](https://www.youtube.com/watch?v=gXbThCXjZFM) |
| 영상 | Sigma notation for sums \| Sequences, series and induction \| Precalculus \| Khan Academy | 개념: 시그마(Σ). Σ 기호를 풀어 쓰고 1부터 5까지의 합을 손으로 계산한다. | [열기](https://www.youtube.com/watch?v=5jwXThH6fg4) |
| 영상 | Directional derivative | 개념: 방향도함수. 기울기 벡터와 방향 벡터의 내적이 방향도함수임을 작은 예로 확인한다. | [열기](https://www.youtube.com/watch?v=N_ZRcLheNv0) |
| 영상 | The Jacobian matrix | 개념: 야코비안·VJP. 여러 입력·여러 출력 함수의 편미분을 행렬로 모은다. 역전파는 이 행렬과 벡터의 곱(VJP)이다. | [열기](https://www.youtube.com/watch?v=bohL918kXQk) |
| 영상 | Convexity 101 [Optimization Bootcamp] | 개념: 볼록 함수. 볼록 함수에서는 지역 최솟값이 곧 전역 최솟값인 이유를 그림으로 본다. | [열기](https://www.youtube.com/watch?v=9WXVgQFFsDI) |
| 영상 | Vector dot product and vector length \| Vectors and spaces \| Linear Algebra \| Khan Academy | 개념: 노름(길이). 벡터 길이(L2 노름)를 내적으로 계산한다. | [열기](https://www.youtube.com/watch?v=WNuIhXo39_k) |
| 영상 | Cosine Similarity, Clearly Explained!!! | 개념: 코사인 유사도. 두 벡터의 방향이 얼마나 같은지를 코사인으로 계산한다. | [열기](https://www.youtube.com/watch?v=e9U0QAFbfLI) |

## 3. ML과 검증 · 14–17주

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

## 3B. 학습 실무: 최적화·정규화·평가 · 18–21주

**목표:** 모델을 실제로 학습시키고 공정하게 비교하는 도구(미니배치·모멘텀·Adam·학습률 감쇠·정규화·드롭아웃·검정·ROC·절제·누설)를 익힌다.

**왜 이 단계인가:** 손실을 줄이는 법을 안 다음에는, 모델을 실제로 학습시키는 손잡이(미니배치·Adam·학습률·정규화)와 두 결과를 공정하게 비교하는 법(검정·ROC·절제·누설)을 알아야 실험 결과를 믿을지 판단할 수 있습니다.

**직접 해 볼 일:** 작은 회귀 모델을 SGD와 Adam으로 학습해 학습/검증 곡선을 비교한다. L2·드롭아웃을 켜고 끄며 과적합을 진단하고, 한 부품만 바꾸고 시드를 여러 개 쓴 절제 표를 만든다.

**다음 단계 전 확인:** 학습/검증 곡선을 보고 과소·과적합을 판단하고, 두 실행의 차이가 시드 변동보다 큰지 말한다. 누설 사례 하나를 찾는다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 영상 | Train/Dev/Test Sets (C2W1L01) | 학습/검증/시험 분리의 목적을 설명한다. | [열기](https://www.youtube.com/watch?v=1waHlpKiNyY) |
| 영상 | Bias/Variance (C2W1L02) | 학습·검증 오차로 과소/과적합을 진단한다. | [열기](https://www.youtube.com/watch?v=SjQyLhQIXSM) |
| 영상 | Regularization (C2W1L04) | L2 정규화가 가중치를 줄이는 방식을 본다. | [열기](https://www.youtube.com/watch?v=6g0t3Phly2M) |
| 영상 | Dropout Regularization (C2W1L06) | 드롭아웃이 학습과 추론에서 다르게 동작하는 이유를 적는다. | [열기](https://www.youtube.com/watch?v=D8PJAL-MZv8) |
| 영상 | Normalizing Inputs (C2W1L09) | 입력 스케일을 맞추면 학습이 쉬워지는 이유를 본다. | [열기](https://www.youtube.com/watch?v=FDCfw-YqWTE) |
| 영상 | Mini Batch Gradient Descent (C2W2L01) | 미니배치 크기와 기울기 잡음의 관계를 정리한다. | [열기](https://www.youtube.com/watch?v=4qJaSmvhxi8) |
| 영상 | Gradient Descent With Momentum (C2W2L06) | 지수이동평균으로 모멘텀을 손계산한다. | [열기](https://www.youtube.com/watch?v=k8fTYJPd3_I) |
| 영상 | RMSProp (C2W2L07) | 파라미터마다 보폭을 바꾸는 RMSProp을 본다. | [열기](https://www.youtube.com/watch?v=_e-LFe_igno) |
| 영상 | Adam Optimization Algorithm (C2W2L08) | Adam과 편향 보정을 우리 코드의 직접 구현과 비교한다. | [열기](https://www.youtube.com/watch?v=JXQT_vxqwIs) |
| 영상 | Learning Rate Decay (C2W2L09) | 학습률을 줄여 가는 이유와 방법을 본다. | [열기](https://www.youtube.com/watch?v=QzulmoOg2JE) |
| 영상 | Softmax Regression (C2W3L08) | 소프트맥스로 여러 클래스 확률을 만든다. | [열기](https://www.youtube.com/watch?v=LLux1SW--oM) |
| 영상 | Neural Networks Part 6: Cross Entropy | 교차 엔트로피가 분류 손실인 이유를 정리한다. | [열기](https://www.youtube.com/watch?v=6ArSys5qHAU) |
| 영상 | Hypothesis Testing and The Null Hypothesis, Clearly Explained!!! | 귀무가설과 검정의 논리를 설명한다. | [열기](https://www.youtube.com/watch?v=0oc49DyA3hU) |
| 영상 | p-values: What they are and how to interpret them | p값이 말하는 것과 말하지 않는 것을 구분한다. | [열기](https://www.youtube.com/watch?v=vemZtEM63GY) |
| 영상 | ROC and AUC, Clearly Explained! | ROC 곡선과 AUC를 계산하고 낯섦 감지 평가와 연결한다. | [열기](https://www.youtube.com/watch?v=4jRBRDbJemM) |
| 읽기 | Kapoor·Narayanan — Leakage and the reproducibility crisis | 외부 논문. 누설 유형표를 읽고 우리 실험의 세계 단위 분리와 비교한다. | [열기](https://arxiv.org/abs/2207.07048) |
| 읽기 | Lipton·Steinhardt — Troubling Trends in ML Scholarship | 외부 논문. 성능 향상의 원인을 부품이 아닌 튜닝에서 찾는 사례를 읽는다. | [열기](https://arxiv.org/abs/1807.03341) |
| 읽기 | d2l 4.7 — Environment and Distribution Shift | 외부 교재. 공변량·레이블·개념 이동을 구분한다. | [열기](https://d2l.ai/chapter_linear-classification/environment-and-distribution-shift.html) |
| 읽기 | Google Deep Learning Tuning Playbook | 외부 가이드. 하이퍼파라미터를 바꾸는 순서와 공정한 비교 절차를 읽는다. | [열기](https://github.com/google-research/tuning_playbook) |
| 영상 | Bootstrapping Main Ideas!!! | 개념: 평가의 변동: 시드 간 구간·부트스트랩. 표본을 다시 뽑아 평균의 흔들림을 재는 부트스트랩을 seed 간 변동과 연결한다. | [열기](https://www.youtube.com/watch?v=Xz0x-8-cgaQ) |
| 영상 | Machine Learning Lecture 16 "Empirical Risk Minimization" -Cornell CS4780 SP17 | 개념: 경험적 위험 최소화. 손실의 평균을 줄이는 학습이 경험적 위험 최소화임을 정리한다. | [열기](https://www.youtube.com/watch?v=AkmPv2WEsHw) |
| 영상 | Tuning Process (C2W3L01) | 개념: 하이퍼파라미터·무작위 탐색. 격자 대신 무작위로 하이퍼파라미터를 고르는 이유를 본다. | [열기](https://www.youtube.com/watch?v=AXDByU3D1hA) |
| 영상 | Using an Appropriate Scale (C2W3L02) | 개념: 하이퍼파라미터·무작위 탐색. 학습률처럼 범위가 넓은 값은 로그 눈금으로 뽑는다. | [열기](https://www.youtube.com/watch?v=cSoK_6Rkbfg) |
| 영상 | Training and Testing on Different Distributions (C3W2L04) | 개념: 분포 밖(OOD) 탐지, 사후예측 점검, 강건 우도, conformal, 분포 이동·OOD. 학습과 시험의 분포가 다를 때 분할을 어떻게 잡는지 본다. | [열기](https://www.youtube.com/watch?v=sfk5h0yC67o) |
| 영상 | Troubling Trends in ML Scholarship - Zachary Lipton | 개념: 절제 연구(ablation), 공정한 비교. 읽기 자료(Lipton·Steinhardt)의 저자 강연. 절제 없이 이득을 주장하는 문제와 공정한 비교를 정리한다. | [열기](https://www.youtube.com/watch?v=A2Jtqi_oa2Y) |
| 영상 | Lecture 6: Version Control (git) (2020) | 개념: 실험 추적·git·pytest·타입 힌트. 실험 코드를 git으로 기록하고 되돌리는 법을 배운다. | [열기](https://www.youtube.com/watch?v=2sjqTHE0zok) |
| 영상 | Please Learn How To Write Tests in Python… • Pytest Tutorial | 개념: 실험 추적·git·pytest·타입 힌트. pytest로 작은 함수의 경계값 테스트를 쓴다. | [열기](https://www.youtube.com/watch?v=EgpLj86ZHFQ) |
| 영상 | Python Tutorial: Type Hints - From Basic Annotations to Advanced Generics | 개념: 실험 추적·git·pytest·타입 힌트. 선택: 타입 힌트로 함수의 입력·출력을 적는다. | [열기](https://www.youtube.com/watch?v=RwH2UzC2rIo) |

## 4. 인과·정보·불확실성 · 22–25주

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

## 5. 신경망·LLM · 26–29주

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

## 5B. 신경망 설계의 부품 · 30–33주

**목표:** micrograd와 makemore 1 다음으로 MLP·활성화·초기화·정규화 층·잔차·PyTorch 학습 루프를 익혀 우리 에이전트 코드를 줄 단위로 읽는다.

**왜 이 단계인가:** micrograd는 원리를 보여 주지만, 우리 에이전트 코드는 PyTorch와 활성화·초기화·층 정규화·잔차로 이루어져 있습니다. 이 부품들을 알아야 AI가 바꾼 코드를 줄 단위로 읽고 학습이 망가졌을 때 원인을 짚을 수 있습니다.

**직접 해 볼 일:** 작은 MLP를 PyTorch로 학습한다. 초기 손실을 미리 계산해 확인하고, 고정된 한 배치를 거의 0까지 외우게 한 뒤 실제 학습으로 넘어간다. 층 shape만 보고 파라미터 수를 계산하고 코드로 맞는지 본다.

**다음 단계 전 확인:** 가중치·편향·활성화·초기화·잔차·층 정규화가 우리 코드(attentive_experimenter.py)의 몇 번째 줄에 있는지 찾고 각각의 역할을 설명한다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 읽기 | Python Tutorial 12 — Virtual Environments and Packages | 공식 문서. 프로젝트별 가상환경을 만든다. | [열기](https://docs.python.org/3/tutorial/venv.html) |
| 읽기 | PyTorch — Get Started (설치 선택기) | 공식 문서. GPU용(CUDA) 빌드를 고르고 torch.cuda.is_available()을 확인한다. | [열기](https://pytorch.org/get-started/locally/) |
| 읽기 | NumPy — the absolute basics for beginners | 공식 문서. 배열·shape·인덱싱·벡터화를 실행해 본다. | [열기](https://numpy.org/doc/stable/user/absolute_beginners.html) |
| 읽기 | PyTorch — Broadcasting semantics | 공식 문서. (B,N,1)+(B,N)이 어떤 shape이 되는지 예측하고 확인한다. | [열기](https://docs.pytorch.org/docs/stable/notes/broadcasting.html) |
| 읽기 | einops — basics | 외부 문서. reshape·transpose를 축 이름으로 다시 쓴다. | [열기](https://einops.rocks/1-einops-basics/) |
| 영상 | But what is a neural network? \| Deep learning chapter 1 | 가중치·편향·뉴런·층을 그림으로 이해한다. | [열기](https://www.youtube.com/watch?v=aircAruvnKk) |
| 영상 | Gradient descent, how neural networks learn \| Deep Learning Chapter 2 | 손실과 경사하강법으로 가중치가 바뀌는 과정을 본다. | [열기](https://www.youtube.com/watch?v=IHZwWFHWa-w) |
| 영상 | Backpropagation, intuitively \| Deep Learning Chapter 3 | 역전파를 직관으로 이해한다. | [열기](https://www.youtube.com/watch?v=Ilg3gGewQ5U) |
| 영상 | Backpropagation calculus \| Deep Learning Chapter 4 | 역전파를 연쇄법칙으로 손계산한다. | [열기](https://www.youtube.com/watch?v=tIeHLnjs5U8) |
| 읽기 | PyTorch — Automatic Differentiation | 공식 문서. backward·.grad·no_grad를 실행한다. | [열기](https://docs.pytorch.org/tutorials/beginner/basics/autogradqs_tutorial.html) |
| 읽기 | PyTorch — Build the Neural Network | 공식 문서. nn.Module 안에서 가중치가 어디 있는지 확인하고 파라미터 수를 센다. | [열기](https://docs.pytorch.org/tutorials/beginner/basics/buildmodel_tutorial.html) |
| 읽기 | PyTorch — Datasets & DataLoaders | 공식 문서. 배치를 만들고 shape를 찍는다. | [열기](https://docs.pytorch.org/tutorials/beginner/basics/data_tutorial.html) |
| 읽기 | PyTorch — Optimizing Model Parameters | 공식 문서. 순전파→손실→역전파→갱신 다섯 줄을 쓴다. | [열기](https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html) |
| 읽기 | PyTorch — Save and Load the Model | 공식 문서. state_dict를 저장하고 다시 불러온다. | [열기](https://docs.pytorch.org/tutorials/beginner/basics/saveloadrun_tutorial.html) |
| 읽기 | PyTorch — Reproducibility | 공식 문서. 시드가 무엇을 고정하고 무엇은 못 하는지 적는다. | [열기](https://docs.pytorch.org/docs/stable/notes/randomness.html) |
| 영상 | Building makemore Part 2: MLP | MLP, 임베딩, 학습/검증 분리를 코드로 따라 한다. | [열기](https://www.youtube.com/watch?v=TCH_1BHY58I) |
| 영상 | Building makemore Part 3: Activations & Gradients, BatchNorm | 활성화·기울기 통계와 배치 정규화로 학습 건강을 진단한다. | [열기](https://www.youtube.com/watch?v=P6sfmUTpUmc) |
| 영상 | Building makemore Part 4: Becoming a Backprop Ninja | 텐서 단위 역전파를 직접 써 본다. | [열기](https://www.youtube.com/watch?v=q8SA3rM6ckI) |
| 영상 | Weight Initialization in a Deep Network (C2W1L11) | 초기화 크기가 학습을 좌우하는 이유를 본다. | [열기](https://www.youtube.com/watch?v=s2coXdufOzE) |
| 영상 | Vanishing/Exploding Gradients (C2W1L10) | 깊어질수록 기울기가 사라지거나 폭발하는 이유를 본다. | [열기](https://www.youtube.com/watch?v=qhXZsFVxGKo) |
| 영상 | Normalizing Activations in a Network (C2W3L04) | 층 출력을 정규화하는 생각을 배우고 층 정규화와 비교한다. | [열기](https://www.youtube.com/watch?v=tNIpEZLv_eg) |
| 영상 | C4W2L03 Resnets | 잔차 연결 x + F(x)가 깊은 학습을 돕는 이유를 본다. | [열기](https://www.youtube.com/watch?v=ZILIbUvp5lk) |
| 읽기 | d2l 5.1 — Multilayer Perceptrons | 외부 교재. 비선형 없이 층을 쌓으면 한 층과 같아지는 이유를 확인한다. | [열기](https://d2l.ai/chapter_multilayer-perceptrons/mlp.html) |
| 읽기 | Karpathy — A Recipe for Training Neural Networks | 외부 글. 시드 고정→초기 손실 확인→한 배치 외우기 순서를 체크리스트로 만든다. | [열기](https://karpathy.github.io/2019/04/25/recipe/) |
| 영상 | What is Automatic Differentiation? | 개념: 수치·기호·자동 미분. 수치 미분·기호 미분·자동 미분의 차이를 본다. micrograd와 연결한다. | [열기](https://www.youtube.com/watch?v=wG_nF1awSSY) |
| 영상 | Why Non-linear Activation Functions (C1W3L07) | 개념: 비선형 없이 쌓으면 선형. 활성화 없이 층을 쌓으면 한 층의 선형 함수와 같아지는 이유를 본다. | [열기](https://www.youtube.com/watch?v=NkOv_k7r6no) |
| 영상 | The Universal Approximation Theorem for neural networks | 개념: 보편 근사 정리. 충분히 넓은 신경망이 연속 함수를 근사할 수 있다는 정리의 직관만 잡는다. 학습이 쉽다는 뜻은 아니다. | [열기](https://www.youtube.com/watch?v=Ijqkc7OLenI) |
| 영상 | Python Tutorial: VENV (Windows) - How to Use Virtual Environments with the Built-In venv Module | 개념: 가상환경·uv·PyTorch CUDA 설치. Windows에서 venv 가상환경을 만들고 켜고 끈다. | [열기](https://www.youtube.com/watch?v=APOPm01BVrk) |
| 영상 | Python Tutorial: UV - A Faster, All-in-One Package Manager to Replace Pip and Venv | 개념: 가상환경·uv·PyTorch CUDA 설치. 선택: uv로 같은 일을 더 빠르게 한다. | [열기](https://www.youtube.com/watch?v=AMdG7IjgSPM) |
| 영상 | Complete Python NumPy Tutorial (Creating Arrays, Indexing, Math, Statistics, Reshaping) | 개념: NumPy 배열·인덱싱·벡터화·브로드캐스팅·복사 vs 뷰. 배열 만들기·인덱싱·shape 바꾸기를 따라 실행한다. 복사와 뷰의 차이를 확인한다. | [열기](https://www.youtube.com/watch?v=GB9ByFAIAH4) |
| 영상 | Numpy Array Broadcasting In Python Explained | 개념: 브로드캐스팅. 브로드캐스팅 규칙을 배우고 shape 결과를 먼저 예상한다. | [열기](https://www.youtube.com/watch?v=oG1t3qlzq14) |
| 영상 | Einsum Is All You Need: NumPy, PyTorch and TensorFlow | 개념: shape 점검: assert, einops, jaxtyping, einsum, bmm. einsum 표기로 행렬곱·배치 곱(bmm)을 다시 쓴다. assert로 shape를 점검한다. | [열기](https://www.youtube.com/watch?v=pkVwUVEHmfI) |
| 영상 | The Fundamentals of Autograd | 개념: 자동 미분: requires_grad, backward, .grad, `torch.autograd.grad`. PyTorch 공식 영상. requires_grad·backward·.grad가 그래프를 따라 움직이는 모습을 본다. | [열기](https://www.youtube.com/watch?v=M0fX15_-xrY) |
| 영상 | PyTorch Tutorial 03 - Gradient Calculation With Autograd | 개념: detach·no_grad·리프 텐서. detach·no_grad·기울기 누적과 zero_grad를 실행해 본다. | [열기](https://www.youtube.com/watch?v=DbeIqrwb_dE) |
| 영상 | Building Models with PyTorch | 개념: nn.Module·Linear·Parameter·state_dict, module(x) vs module.forward(x). PyTorch 공식 영상. nn.Module·Linear·Parameter와 module(x)가 forward를 부르는 흐름을 본다. | [열기](https://www.youtube.com/watch?v=OSqIP-mOWOI) |
| 영상 | PyTorch Tutorial 09 - Dataset and DataLoader - Batch Training | 개념: Dataset·DataLoader·에포크 vs 스텝. Dataset·DataLoader로 배치를 만들고 에포크와 스텝의 차이를 센다. | [열기](https://www.youtube.com/watch?v=PXOzkkB5eH0) |
| 영상 | Pytorch Quick Tip: Reproducible Results and Deterministic Behavior | 개념: 시드와 재현성. 시드를 고정하는 코드와 그래도 남는 비결정성을 확인한다. | [열기](https://www.youtube.com/watch?v=1SZocGaCAr8) |
| 영상 | PyTorch Tutorial 17 - Saving and Loading Models | 개념: 체크포인트 저장·불러오기. state_dict와 체크포인트를 저장하고 다시 불러온다. | [열기](https://www.youtube.com/watch?v=9L9jEOwRrCg) |
| 영상 | Five Ways To Increase Your Model Performance Using PyTorch Profiler | 개념: GPU 비동기·수치 정밀도·프로파일링. PyTorch 공식 영상. 프로파일러로 느린 곳을 찾는다. | [열기](https://www.youtube.com/watch?v=Dicw8GDuEc8) |
| 영상 | Mixed Precision Training - Explained | 개념: GPU 비동기·수치 정밀도·프로파일링. 혼합 정밀도(FP16·BF16)가 무엇을 얻고 잃는지 본다. | [열기](https://www.youtube.com/watch?v=87GhCIQudEA) |
| 영상 | Lecture 7: Troubleshooting Deep Neural Networks (Full Stack Deep Learning - Spring 2021) | 개념: Karpathy 레시피, 손실이 안 줄 때 사다리, 우리 코드에서 "작은 배치 외우기". 손실이 안 줄 때의 순서(단순하게 시작→한 배치 외우기→하나씩 바꾸기)를 Karpathy 레시피와 같이 본다. | [열기](https://www.youtube.com/watch?v=f1JRFu7X-c8) |

## 5C. Attention·Transformer·집합 모델 · 34–37주

**목표:** 귀납 편향에서 출발해 Deep Sets → Attention → Transformer 블록 → Neural Process → Attentive NP로 이어지는 우리 에이전트의 핵심 구조를 이해한다.

**왜 이 단계인가:** 우리 에이전트의 핵심 모델은 측정 묶음을 Attention으로 읽는 Neural Process입니다. 귀납 편향에서 Deep Sets, Attention, Transformer 블록, NP, ANP로 이어지는 흐름을 알아야 그 구조를 바꾸자는 제안을 평가할 수 있습니다.

**직접 해 볼 일:** 3-token Attention을 손으로 계산한 뒤 마스크를 포함해 코드로 구현한다. 측정 순서를 바꿔도 출력이 같은지 확인하고, 위치 정보를 넣으면 무엇이 깨지는지 본다.

**다음 단계 전 확인:** 우리 모델에서 질의·열쇠·값이 각각 무엇인지, 사전 정규화를 쓰는 이유, 평균 풀링 대신 Attention을 쓴 이유를 설명한다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 읽기 | d2l 7.1 — From Fully Connected Layers to Convolutions | 외부 교재. 귀납 편향과 불변·등변을 구분한다. | [열기](https://d2l.ai/chapter_convolutional-neural-networks/why-conv.html) |
| 읽기 | Zaheer 외 — Deep Sets | 외부 논문. 순서 없는 집합을 읽는 함수의 꼴을 이해한다. | [열기](https://arxiv.org/abs/1703.06114) |
| 영상 | Transformers, the tech behind LLMs \| Deep Learning Chapter 5 | Transformer의 전체 흐름(임베딩→Attention→MLP)을 본다. | [열기](https://www.youtube.com/watch?v=wjZofJX0v4M) |
| 영상 | Attention in transformers, step-by-step \| Deep Learning Chapter 6 | Q·K·V Attention과 √d 스케일을 손계산한다. | [열기](https://www.youtube.com/watch?v=eMlx5fFNoYc) |
| 읽기 | d2l 11.1 — Queries, Keys, and Values | 외부 교재. Attention을 부드러운 사전 조회로 이해한다. | [열기](https://d2l.ai/chapter_attention-mechanisms-and-transformers/queries-keys-values.html) |
| 읽기 | d2l 11.7 — The Transformer Architecture | 외부 교재. 블록의 네 부품(Attention·MLP·잔차·층 정규화)을 그린다. | [열기](https://d2l.ai/chapter_attention-mechanisms-and-transformers/transformer.html) |
| 영상 | Let's build GPT: from scratch, in code, spelled out. | 작은 GPT를 따라 만들며 마스크·잔차·층 정규화를 확인한다. | [열기](https://www.youtube.com/watch?v=kCc8FmEb1nY) |
| 읽기 | Xiong 외 — On Layer Normalization in the Transformer Architecture | 외부 논문. 층 정규화 위치와 워밍업의 관계를 읽는다. | [열기](https://arxiv.org/abs/2002.04745) |
| 읽기 | Garnelo 외 — Neural Processes | 외부 논문. 측정 묶음을 받아 함수 분포를 내는 모델을 이해한다. | [열기](https://arxiv.org/abs/1807.01622) |
| 읽기 | Kim 외 — Attentive Neural Processes | 외부 논문. 평균 병목을 Attention으로 푼 이유를 우리 기록과 비교한다. | [열기](https://arxiv.org/abs/1901.05761) |
| 읽기 | Müller 외 — Transformers Can Do Bayesian Inference (PFN) | 외부 논문. 학습용 세계를 뽑는 방식이 곧 사전이라는 점을 읽는다. | [열기](https://arxiv.org/abs/2112.10510) |
| 읽기 | Lilian Weng — Meta-Learning: Learning to Learn Fast | 외부 글. 시험 때 가중치는 고정이고 맥락만 바뀌는 학습을 정리한다. | [열기](https://lilianweng.github.io/posts/2018-11-30-meta-learning/) |
| 읽기 | Lilian Weng — From Autoencoder to Beta-VAE | 선택. 잠재 변수와 ELBO를 알아만 둔다. | [열기](https://lilianweng.github.io/posts/2018-08-12-vae/) |
| 영상 | Building makemore Part 5: Building a WaveNet | 선택: 계층 구조(합성곱 계열) 설계를 본다. | [열기](https://www.youtube.com/watch?v=t3YJ5hKiMQ0) |
| 읽기 | Kaplan 외 — Scaling Laws for Neural Language Models | 알아만 두기. 언어 모델의 결과이며 우리 규모에 숫자로 옮기지 않는다. | [열기](https://arxiv.org/abs/2001.08361) |
| 읽기 | Hoffmann 외 — Training Compute-Optimal LLMs (Chinchilla) | 알아만 두기. Kaplan과 무엇이 다른지만 적는다. | [열기](https://arxiv.org/abs/2203.15556) |
| 영상 | TabPFN: Deep Learning for Tabular Data is Here! (Prof. Frank Hutter explains) | 개념: 학습 분포 = 사전. PFN을 만든 연구자의 설명. 학습용 세계를 뽑는 방식이 곧 사전이라는 점을 듣는다. | [열기](https://www.youtube.com/watch?v=MKu09syGgEk) |
| 영상 | Marta Garnelo - Meta-Learning and Neural Processes | 개념: 메타학습·상각 추론·PFN·맥락 내 학습, 가우스 과정 → NP → ANP → CNP·TNP·Set Transformer. Neural Process 저자 강연. 메타학습에서 GP→NP→ANP로 이어지는 흐름을 본다. | [열기](https://www.youtube.com/watch?v=q-4lo5luKgc) |
| 영상 | [1hr Talk] Intro to Large Language Models | 개념: 학습은 가중치를 바꾸고 추론은 안 바꿈, 알아만 두기: GNN, MoE, 확산 모델, NAS, 토큰화·사전학습·RLHF, 스케일링 법칙. 학습(가중치 변경)과 추론(가중치 고정)의 차이, 토큰화·사전학습·RLHF의 큰 그림을 본다. | [열기](https://www.youtube.com/watch?v=zjkBMFhNj_g) |
| 영상 | AI can't cross this line and we don't know why. | 개념: 스케일링 법칙. 알아만 두기. 스케일링 법칙 곡선이 무엇을 말하고 무엇을 말하지 않는지 본다. | [열기](https://www.youtube.com/watch?v=5eqRuVp65eY) |
| 영상 | Perceiver: General Perception with Iterative Attention (Google DeepMind Research Paper Explained) | 개념: 학습되는 사전 토큰. 학습되는 잠재 토큰(latent array)이 입력을 읽는 구조를 본다. 우리 모델의 학습되는 사전 토큰과 비교한다. | [열기](https://www.youtube.com/watch?v=P_xeshTnPZg) |
| 영상 | Theoretical Foundations of Graph Neural Networks | 개념: 순열 불변·Deep Sets. 순열 불변·등변과 Deep Sets, 그래프 신경망을 한 틀로 본다. | [열기](https://www.youtube.com/watch?v=uF53xsT7mjc) |
| 영상 | Variational Autoencoders | 개념: VAE·ELBO·재매개변수화. 선택. VAE·ELBO·재매개변수화를 그림으로 본다. | [열기](https://www.youtube.com/watch?v=9zKuYvjFFS8) |
| 영상 | A Visual Guide to Mixture of Experts (MoE) in LLMs | 개념: 알아만 두기: GNN, MoE, 확산 모델, NAS, 토큰화·사전학습·RLHF, 스케일링 법칙. 알아만 두기. MoE의 라우팅을 그림으로 본다. | [열기](https://www.youtube.com/watch?v=sOPDGQjFcuM) |
| 영상 | But how do AI images and videos actually work? \| Guest video by Welch Labs | 개념: 알아만 두기: GNN, MoE, 확산 모델, NAS, 토큰화·사전학습·RLHF, 스케일링 법칙. 알아만 두기. 확산 모델이 잡음을 지우며 이미지를 만드는 원리를 본다. | [열기](https://www.youtube.com/watch?v=iv-5mZ_9CPY) |

## 5D. 불확실성·모델 비교·실험 설계 · 38–41주

**목표:** 먼저 해설 영상(MIT 6.S191 불확실성 강의부터)으로 개념을 잡은 뒤 논문을 읽는다. 무엇을 모르는지 수치로 표시하고(우연적/인식적 불확실성, 보정, 앙상블), 공식 후보를 비교하고(증거·BIC·BMA·가우스 과정), 다음 측정을 고르는(정보 이득) 방법을 익힌다.

**왜 이 단계인가:** 발견 에이전트는 무엇을 모르는지 수치로 말하고, 공식 후보를 비교하고, 다음 측정을 골라야 합니다. 불확실성·보정·앙상블·BIC·BMA·가우스 과정·정보 이득이 그 도구이며, 학습 범위 밖 과신(EXP-063)처럼 그 한계도 함께 배웁니다.

**직접 해 볼 일:** 세 후보 공식의 BIC를 계산해 가중치를 정규화한다. 앙상블 예측을 구성원 분산 평균 + 평균들의 분산으로 나누고, 포함률과 폭을 함께 보고한다. 후보들이 가장 갈리는 측정을 고른다. 이어서 작은 발견 루프(약 100줄): 숨은 규칙 y=2x+잡음(σ=0.5)의 측정 함수를 만들고, x∈[0,1]의 측정 5개로 y=ax·y=ax+b·y=ax² 후보의 BIC 가중치를 구한다. x∈[0,10]에서 후보가 가장 갈리는 x를 하나씩 5번 더 측정하며 가중치 변화를 표로 남기고, 무작위 x 측정과 seed 5개로 비교한다. 후보에 정답이 없는 y=2x+0.3x³에서도 한 번 돌려 본다.

**다음 단계 전 확인:** 우리 앙상블 공식(전분산 법칙)과 BIC 가중치를 손으로 재현하고, 학습 범위 밖에서 구간이 과신하는 이유(EXP-063)를 설명한다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 영상 | MIT 6.S191: Uncertainty in Deep Learning | 개념: 우연적 vs 인식적 불확실성, 딥 앙상블·적정 점수 규칙. 5D 첫 영상. 우연적/인식적 불확실성, 앙상블, 평균+분산 출력을 강의로 먼저 본다. | [열기](https://www.youtube.com/watch?v=veYq6EWZyVc) |
| 영상 | L13.7 Derivation of the Law of Total Variance | 개념: 전분산 법칙. MIT 확률 강의. 전분산 법칙을 유도하고 앙상블 분산 분해에 쓴다. | [열기](https://www.youtube.com/watch?v=mHonq7Gjjqg) |
| 영상 | Understanding Probabilistic Neural Networks: The Gaussian Output Layer (Theory and Implementation) | 개념: 가우스 NLL의 함정, 평균+로그분산 출력층. 평균과 로그분산을 내는 출력층과 가우스 NLL을 구현한다. 분산이 커지며 손실을 낮추는 함정을 확인한다. | [열기](https://www.youtube.com/watch?v=lEcQtnflYDc) |
| 영상 | Probability Calibration : Data Science Concepts | 개념: 보정·포함률과 폭, 평가 지표·적정 점수·보정. 예측 확률이 실제 빈도와 맞는지(보정)를 보정 그래프로 확인한다. | [열기](https://www.youtube.com/watch?v=AunotauS5yI) |
| 영상 | SL - 11 Advanced Risk Minimization - 13 Proper Scoring Rules | 개념: 딥 앙상블·적정 점수 규칙, 평가 지표·적정 점수·보정. 로그 점수·Brier 점수가 왜 적정 점수 규칙인지 본다. | [열기](https://www.youtube.com/watch?v=1nydD0QSnXk) |
| 영상 | A Tutorial on Conformal Prediction | 개념: 보정·포함률과 폭, 분포 밖(OOD) 탐지, 사후예측 점검, 강건 우도, conformal. 읽기 자료 저자의 강의. conformal 구간의 포함 보장과 그 전제를 본다. | [열기](https://www.youtube.com/watch?v=nql000Lu_iE) |
| 영상 | Bayesian Maximum Aposteriori Estimation (MAP): Extending Maximum Likelihood Estimation | 개념: 사전·사후·MAP. 사전·사후와 MAP 추정을 최대우도와 비교한다. | [열기](https://www.youtube.com/watch?v=xgfexqYxrDU) |
| 영상 | 26 - Prior and posterior predictive distributions - an introduction | 개념: 사후예측분포. 사후예측분포(사후로 다음 관측을 예측)를 짧게 정리한다. | [열기](https://www.youtube.com/watch?v=R9NQY2Hyl14) |
| 영상 | Introducing Bayes factors and marginal likelihoods | 개념: 증거·베이즈 요인·오캄 인수. 증거(주변우도)와 베이즈 요인으로 두 모델을 비교한다. | [열기](https://www.youtube.com/watch?v=T-kMpA4z-7k) |
| 영상 | Time Series Model Selection (AIC & BIC) : Time Series Talk | 개념: BIC·AIC. AIC·BIC가 적합도와 복잡도 벌점을 어떻게 더하는지 본다. | [열기](https://www.youtube.com/watch?v=McEN54l3EPU) |
| 영상 | UC Irvine CEE-290: Topic 6 (Model averaging) | 개념: 베이즈 모델 평균(BMA). 여러 모델의 예측을 가중 평균하는 BMA를 짧게 본다. | [열기](https://www.youtube.com/watch?v=zwmi8VksxrQ) |
| 영상 | Model misspecification explained in 3 minutes | 개념: 후보 중 정답이 없을 때(오지정 모델). 후보 모델이 모두 틀렸을 때(오지정) 추정이 무엇을 뜻하는지 본다. | [열기](https://www.youtube.com/watch?v=0KPsTDyf9DY) |
| 영상 | Ruth Baker: What Is Parameter Identifiability, Why Do We Need Identifiable...(October 16, 2025) | 개념: 식별 가능성. 데이터가 매개변수를 하나로 정할 수 없을 때(식별 불가)를 사례로 본다. | [열기](https://www.youtube.com/watch?v=_5is1F9tKTk) |
| 영상 | Gaussian Processes : Data Science Concepts | 개념: 가우스 과정. 가우스 과정을 함수 위의 분포로 이해하고 데이터에서 멀수록 분산이 커지는 것을 본다. | [열기](https://www.youtube.com/watch?v=HA-VHNVbvwQ) |
| 영상 | Design Better Experiments with Expected Information Gain | 개념: 능동 학습·Box-Hill 판별 실험. 기대 정보 이득으로 다음 측정을 고르는 생각을 짧게 본다. | [열기](https://www.youtube.com/watch?v=wm1YSf45KVM) |
| 영상 | Tom Rainforth - Modern Bayesian Experimental Design \| ML in PL 2024 | 개념: 능동 학습·Box-Hill 판별 실험. 읽기 자료(Rainforth) 저자의 강연. 현대 베이즈 실험설계와 능동 학습을 본다. | [열기](https://www.youtube.com/watch?v=pgS0-xK6tIs) |
| 읽기 | Kendall·Gal — What Uncertainties Do We Need? | 외부 논문. 줄지 않는 잡음과 데이터로 줄어드는 무지를 구분한다. | [열기](https://arxiv.org/abs/1703.04977) |
| 읽기 | Lakshminarayanan 외 — Deep Ensembles | 외부 논문. 평균·분산을 내는 앙상블과 적정 점수 규칙을 읽는다. | [열기](https://arxiv.org/abs/1612.01474) |
| 읽기 | Seitzer 외 — On the Pitfalls of Heteroscedastic Uncertainty Estimation | 외부 논문. 가우스 NLL의 함정을 읽고 EXP-063 결과와 비교한다. | [열기](https://arxiv.org/abs/2203.09168) |
| 읽기 | Guo 외 — On Calibration of Modern Neural Networks | 외부 논문. 보정과 온도 스케일링을 읽는다. | [열기](https://arxiv.org/abs/1706.04599) |
| 읽기 | Angelopoulos·Bates — A Gentle Introduction to Conformal Prediction | 외부 논문. 분포 가정 없는 포함 보장과 그 전제(교환 가능성)를 적는다. | [열기](https://arxiv.org/abs/2107.07511) |
| 읽기 | Distill — A Visual Exploration of Gaussian Processes | 외부 글. 데이터에서 멀수록 분산이 커지는 모습을 확인한다. | [열기](https://distill.pub/2019/visual-exploration-gaussian-processes/) |
| 읽기 | Rasmussen·Williams — GPML 2장 Regression | 외부 교재. 예측 평균·분산 공식을 작은 예로 계산한다. | [열기](https://gaussianprocess.org/gpml/chapters/RW2.pdf) |
| 읽기 | MacKay — ITILA 28장 Model Comparison and Occam's Razor | 외부 교재. 유연한 모델이 증거에서 불리한 이유(오캄 인수)를 읽는다. | [열기](https://www.inference.org.uk/mackay/itprnn/ps/343.355.pdf) |
| 읽기 | Hoeting 외 — Bayesian Model Averaging: A Tutorial | 외부 논문. BIC 가중치와 모델 간 분산을 읽는다. | [열기](https://www.stat.colostate.edu/~jah/papers/statsci.pdf) |
| 읽기 | Rainforth 외 — Modern Bayesian Experimental Design | 외부 논문. 기대 정보 이득으로 다음 실험을 고르는 틀을 읽는다. | [열기](https://arxiv.org/abs/2302.14545) |

## 6. RL·탐색 · 42–45주

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
| 영상 | Is human data enough? \| David Silver | 개념: Era of Experience. Era of Experience 저자의 대담. 사람 데이터만으로 부족하다는 주장을 듣고 입장문과 구조 명세를 구분한다. | [열기](https://www.youtube.com/watch?v=zzXyPGEtseI) |
| 읽기 | David Silver — 강의 슬라이드와 Easy21 | 외부 공식 자료. 필요한 강의 절과 표 기반 실습을 연결한다. | [열기](https://www.davidsilver.uk/teaching/) |
| 읽기 | Sutton·Barto — Reinforcement Learning: An Introduction (2판) | 외부 교재(강의용 사본). Silver 강의와 같은 개념을 필요한 장만 찾아 읽는다. | [열기](https://web.stanford.edu/class/psych209/Readings/SuttonBartoIPRLBook2ndEd.pdf) |
| 읽기 | Silver·Sutton — Welcome to the Era of Experience | 외부 글. 프로젝트의 방향을 준 입장문이며 구조 명세가 아님을 구분한다. | [열기](https://storage.googleapis.com/deepmind-media/Era-of-Experience%20/The%20Era%20of%20Experience%20Paper.pdf) |
| 읽기 | Sutton — The Bitter Lesson (PDF 사본) | 외부 글. 원문 사이트는 https 인증서 오류라 사본을 연결했다. 대칭을 넣을지 말지의 쟁점을 적는다. | [열기](https://www.cs.utexas.edu/~eunsol/courses/data/bitter_lesson.pdf) |

## 7. 역학·변수·기호 회귀 · 46–49주

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
| 읽기 | Cranmer — PySR: Interpretable Machine Learning for Science | 외부 논문. 공식 모양 탐색과 복잡도 벌점을 읽는다. | [열기](https://arxiv.org/abs/2305.01582) |
| 영상 | Miles Cranmer - The Next Great Scientific Theory is Hiding Inside a Neural Network (April 3, 2024) | 신경망에서 기호 공식을 뽑아내는 흐름과 한계를 본다. | [열기](https://www.youtube.com/watch?v=fk2r8y5TfNY) |
| 영상 | ICLR 2021 Keynote - "Geometric Deep Learning: The Erlangen Programme of ML" - M Bronstein | 대칭·불변·등변으로 구조를 설계하는 관점을 본다. | [열기](https://www.youtube.com/watch?v=w6Pw4MOzMuo) |

## 8. 네 조건 비교 실습 · 50–53주

**목표:** 기존 설명 유지·재분석·새 측정·보류가 각각 적절한 상황을 구분한다.

**왜 이 단계인가:** 앞 단계의 도구를 Glorious 문제에 연결합니다. 기존 설명 유지·재분석·새 측정·보류가 각각 필요한 조건을 비교하고, 원래 실험의 재현과 교육용 실습을 구별합니다.

**직접 해 볼 일:** ① 원자료에 단서 있음 ② 관측 범위 밖에서만 후보 차이 ③ 필요한 정보 없음 ④ 기존 이론+잡음/오프셋의 네 조건을 만든다. 고정 trace 해석과 능동 실험 선택 비교를 분리한다.

**다음 단계 전 확인:** 동일 예산·후보·관측 접근, 새 seed/세계군 평가, 실패·유지 사례를 보존한다. SHA/config/seed/의존성/체크포인트/실행 명령·비용이 없으면 원 EXP 재현으로 표시하지 않는다. 도움 없는 새 문제 수행과 수정 근거로만 진전을 판단한다.

### 강의와 읽기·실습 자료

| 종류 | 제목 | 이 자료에서 할 일 | 자료 열기 |
|---|---|---|---|
| 읽기 | 데이터 한계와 발견 연구 노트 | 공개 URL은 404. 제공된 glorious-purpose-reference/PROJECT_WIKI/10_RESEARCH의 로컬 사본 또는 저장소 접근 권한이 필요하다. 연구 주장·관측·한계를 분리한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/10_RESEARCH/DATA_AND_DISCOVERY_LIMITS.md) |
| 읽기 | EXP-054 PLAN | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-054/PLAN.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/30_EXPERIMENTS/EXP-054/PLAN.md) |
| 읽기 | EXP-054 RESULT | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-054/RESULT.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/30_EXPERIMENTS/EXP-054/RESULT.md) |
| 읽기 | EXP-055 PLAN | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-055/PLAN.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/30_EXPERIMENTS/EXP-055/PLAN.md) |
| 읽기 | EXP-055 RESULT | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-055/RESULT.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/30_EXPERIMENTS/EXP-055/RESULT.md) |
| 읽기 | EXP-056 PLAN | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-056/PLAN.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/30_EXPERIMENTS/EXP-056/PLAN.md) |
| 읽기 | EXP-056 RESULT | 공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-056/RESULT.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다. | [열기](https://github.com/hyperdrivebeep/glorious-purpose/blob/a42be23ebd99a511e8ddcfd6baac5c592cbe0aa4/PROJECT_WIKI/30_EXPERIMENTS/EXP-056/RESULT.md) |

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

이 목록은 2026-11-18에 기록된 Duvi 로드맵 버전 3 스냅샷을 그대로 정리합니다. 확인 기록: 버전 3(2026-11-18): 읽기로만 배우던 58개 개념에 해설 영상 58개와 5D 작은 발견 루프 실습 추가. 영상은 oEmbed로 존재·삽입 허용·제목·채널 확인(Stanford Online 401 영상 제외). 버전 2(2026-11-17): Glorious R-020 대조에서 빠진 개념을 메우는 2B·3B·5B·5C·5D 단계 추가, 추가 영상 57개는 oEmbed 제목·채널, 읽기 자료는 HTTP 200으로 확인. 버전 1: 제공된 로컬 정본과 공식 강의 목록/YouTube 제목·채널 확인. Glorious 공개 URL은 HTTP 404로 로컬 사본 또는 저장소 접근 권한 필요. 전체 영상 시청·자막 대조 아님. Stanford 구간은 정본의 기존 기록을 인용하며 현재 접근은 미확인.

각 항목의 링크는 원 출처를 가리킵니다. 링크 등록이나 제목 확인이 전체 영상 시청, 자막 검수, 모든 링크의 현재 접근 가능성을 뜻하지는 않습니다. Stanford 영상은 지정한 일부 구간만 선택 항목으로 연결되어 있고 접근이 확인되지 않은 상태입니다. Glorious Purpose의 내부 문서 링크는 저장소 접근 권한이 필요할 수 있습니다. 링크가 열리지 않으면 해당 저장소의 같은 경로에 있는 원문을 사용하세요.

수정할 때는 앱의 `src/learning-roadmap.mjs`와 Glorious Purpose 정본을 함께 대조하고, 확인하지 않은 자료를 검증 완료로 표시하지 마세요.
