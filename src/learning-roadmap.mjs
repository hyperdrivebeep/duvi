// Curated snapshot of the canonical plan, not a learner's completion record.
const commit = '15e84dd2a58aebb67f0f2f0de4d648806525c805';
const wiki = `https://github.com/hyperdrivebeep/glorious-purpose/blob/${commit}/PROJECT_WIKI`;
const mit = 'https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/';
const ml = 'https://developers.google.com/machine-learning/crash-course/';
const bayes = 'https://allendowney.github.io/ThinkBayes2/';

const mitLessons = [
  [1, 'Introduction to CS and Programming Using Python', '1-version-2', '값·변수·연산을 실행하고 입력을 바꾸기 전에 출력을 예상한다.'],
  [2, 'Strings, Input/Output, and Branching', '2-multi-version-4_1', '조건문으로 측정값 5 이상만 기록한다.'],
  [3, 'Iteration', '3-multi', '반복으로 합·개수를 계산하고 전체/선택 평균을 비교한다.'],
  [4, 'Loops over Strings, Guess-and-Check, and Binary', '4-multi', '반복의 종료와 탐색 범위를 작은 입력으로 확인한다.'],
  [5, 'Floats and Approximation Methods', '5-multi', '부동소수점 오차와 허용 오차를 구분한다.'],
  [6, 'Bisection Search', '6-multi-version-3', '구간과 종료 조건을 설명하고 다른 입력에서 시험한다.'],
  [7, 'Decomposition, Abstraction, and Functions', '7-multi', '선택 규칙과 평균 계산을 함수로 나눈다.'],
  [8, 'Functions as Objects', '8-version-2', '다른 선택 함수를 같은 자료에 적용한다.'],
  [9, 'Lambda Functions, Tuples, and Lists', '9-version-2', '순서·자료 구조와 계산 결과의 관계를 설명한다.'],
  [10, 'Lists and Mutability', '10-version-3_1', '원본 목록을 보존하며 선택된 목록을 만든다.'],
  [11, 'Aliasing and Cloning', '11-version-2', '복사와 공유 참조의 차이를 실제 출력으로 확인한다.'],
  [12, 'List Comprehension, Functions as Objects, Testing, and Debugging', '12-multi-version-4', '빈 목록·경계값·반례 입력으로 선택 함수를 검사한다.'],
  [13, 'Exceptions and Assertions', '13-version-2', '잘못된 입력과 계산할 수 없는 평균을 명시한다.'],
  [14, 'Dictionaries', '14-multi', '원본·선택 규칙·결과를 구분해 저장한다.'],
  [17, 'Python Classes', '17-version-2', 'micrograd 선수: 값과 기울기를 가진 작은 객체를 만든다.'],
  [18, 'More Python Class Methods', '18-multi-version-2', 'micrograd 선수: 메서드를 수정하고 결과를 독립적으로 예상한다.'],
];
const mitResources = mitLessons.map(([number, title, slug, description]) => ({
  id: `mit-${number}`, title: `MIT ${number}. ${title}`, lectureId: String(number),
  url: `${mit}resources/6100l-lecture-${slug}_mp4/`, kind: 'video', description,
}));

// Titles/channels checked through YouTube oEmbed on 2026-11-16; no captions fetched.
const videoGroups = [
  ['3Blue1Brown', [
    ['fNk_zzaMoSs', 'Vectors | Chapter 1, Essence of linear algebra', '벡터를 좌표와 방향 두 방식으로 설명한다.'],
    ['k7RM-ot2NWY', 'Linear combinations, span, and basis vectors | Chapter 2, Essence of linear algebra', '작은 벡터의 선형 결합을 직접 계산한다.'],
    ['kYB8IZa5AuE', 'Linear transformations and matrices | Chapter 3, Essence of linear algebra', '행렬을 변환으로 읽고 입력/출력 shape를 확인한다.'],
    ['LyGKycYT2v0', 'Dot products and duality | Chapter 9, Essence of linear algebra', '내적을 손계산하고 표현의 의미를 설명한다.'],
    ['WUvTyaaNkzM', 'The essence of calculus', '함수 그래프의 작은 변화와 기울기를 연결한다.'],
    ['YG15m2VwSjA', 'Visualizing the chain rule and product rule | Chapter 4, Essence of calculus', '연쇄법칙 결과를 수치 미분과 비교한다.'],
  ]],
  ['Brady Neal - Causal Inference', [
    ['CfzO4IEMVUk', '1.1 - Intro and Outline of A Brief Introduction to Causal Inference', '동기 도입. 아래 공식 교재 1장 및 강의 목록의 후속 절을 함께 읽는다.'],
    ['q8x9aetyok0', '2.1 - What are Potential Outcomes?', '잠재 결과 표에서 관측하지 못한 값을 구분한다. 교재 2장과 연결한다.'],
    ['Go4EkHN_PcA', '3.1 - Graphical Models (Intro and Outline)', '그래프 단원 도입. 교재 3장에서 chain/fork/collider를 비교한다.'],
    ['dQeRqb0N6gs', '4.7 - Structural Causal Models SCMs', '구조 방정식과 관측/개입을 구분한다. 교재 4장과 함께 본다.'],
    ['z91LnTDyhtI', '5.1 - Randomized Experiments and Identification (Intro and Outline)', '무작위 실험 단원 도입. 교재 5~6장에서 식별 가정을 확인한다.'],
  ]],
  ['Andrej Karpathy', [
    ['VMj-3S1tku0', 'The spelled-out intro to neural networks and backpropagation: building micrograd', '선수 확인 후 스칼라 역전파를 수정한다. 전체 재귀 엔진 구현은 별도 보충이다.'],
    ['PaCmpygFfXo', 'The spelled-out intro to language modeling: building makemore', '작은 bigram의 일부를 수정하고 손실·표본·분할을 설명한다. 전체 GPT 구현은 선택 심화다.'],
  ]],
  ['Google DeepMind', [
    ['2pWv7GOvuf0', 'RL Course by David Silver - Lecture 1: Introduction to Reinforcement Learning', '상태·행동·보상과 관측을 구분한다.'],
    ['lfHX2hHRMVQ', 'RL Course by David Silver - Lecture 2: Markov Decision Process', '작은 전이표와 반환을 손계산한다.'],
    ['Nd1-UUMVfz4', 'RL Course by David Silver - Lecture 3: Planning by Dynamic Programming', '표 기반 환경에서 가치 갱신을 계산한다.'],
    ['PnHCvfgC_ZA', 'RL Course by David Silver - Lecture 4: Model-Free Prediction', '실제 경험으로 예측을 갱신한다.'],
    ['0g4j2k_Ggc4', 'RL Course by David Silver - Lecture 5: Model Free Control', '탐색과 정책 개선을 비교한다.'],
    ['ItMutbeOHtc', 'RL Course by David Silver - Lecture 8: Integrating Learning and Planning', '학습한 전이 모델로 계획하고 실제 경험과 구분한다.'],
    ['sGuiWX07sKw', 'RL Course by David Silver - Lecture 9: Exploration and Exploitation', '무작위·정보 선택·강제 탐색을 같은 예산으로 비교한다.'],
  ]],
  ['MIT OpenCourseWare', [
    ['5ucfHd8FWKw', '0.1 Vectors vs. Scalars', '물리량의 단위·크기·방향을 구분한다.'],
    ['89SjJv30kGU', "4.1 Newton's First and Second Laws", '관측한 운동과 힘에 대한 가정을 분리한다.'],
    ['RBaBEjzMr4E', '7.1 Pushing Pulling and Tension', '힘의 전달을 그린 뒤 공식 역학 자료에서 스프링·진동으로 이어간다.'],
  ]],
];
export const VIDEO_METADATA = Object.fromEntries(videoGroups.flatMap(([channel, rows]) =>
  rows.map(([youtubeId, title]) => [`yt_${youtubeId}`, {youtubeId, title, channel}])));
const videos = channel => videoGroups.find(([name]) => name === channel)[1].map(([id, title, description]) => ({
  id: `video-${id}`, lectureId: `yt_${id}`, title, url: `https://www.youtube.com/watch?v=${id}`, kind: 'video', description,
}));
const reading = (id, title, url, description) => ({id, title, url, kind: 'reading', description});
const stanford = {
  title: 'Stanford CS229 — Building LLMs (Yann Dubois)', url: 'https://www.youtube.com/watch?v=9vM4p9NN0Ts', kind: 'video',
};

export const ROADMAP = {
  version: 1,
  source: {
    url: `${wiki}/10_RESEARCH/DISCOVERY_LEARNING_ROADMAP.md`, commit,
    document: 'PROJECT_WIKI/10_RESEARCH/DISCOVERY_LEARNING_ROADMAP.md', checkedAt: '2026-11-16',
    verification: '제공된 로컬 정본과 공식 강의 목록/YouTube 제목·채널 확인. Glorious 공개 URL은 HTTP 404로 로컬 사본 또는 저장소 접근 권한 필요. 전체 영상 시청·자막 대조 아님. Stanford 구간은 정본의 기존 기록을 인용하며 현재 접근은 미확인.',
  },
  firstTwoWeeks: {
    sessions: [
      {session: 1, title: '실행 환경 준비 + MIT 1강 앞부분', output: 'IDLE에 print(2 + 3)을 저장·실행하고 입력을 바꾸기 전 결과를 예상한다. Stanford 도입8분은 선택이다.'},
      {session: 2, title: 'MIT 1강 나머지 + Finger Exercise', output: '입력 변경 전 예상과 실제 출력, 차이가 생긴 이유를 남긴다.'},
      {session: 3, title: 'MIT 2강과 조건문', output: '4·5·6을 각각 입력해 5 이상일 때만 출력하는 코드를 쓴다.'},
      {session: 4, title: 'MIT 2강 복습 + 새 입력', output: '어떤 측정이 기록에서 빠졌는지 선택 규칙으로 설명한다.'},
      {session: 5, title: '화면을 닫고 조건문 다시 작성', output: '경계값5와 반례4를 확인하고 AI 도움 여부를 적는다.'},
      {session: 6, title: 'MIT 3강 반복문', output: '1~10의 합55와 개수10을 반복문으로 계산한다.'},
      {session: 7, title: 'MIT 3강 연습 + 전체/선택 평균', output: '모의 측정값 [1..10]에서 전체5.5와 5 이상 선택7.5를 비교한다.'},
      {session: 8, title: '선택 규칙 바꾸기', output: '임계값5·7·11을 비교하고 선택값이 없을 때 평균을 만들지 않는다.'},
      {session: 9, title: '새 목록 + 고정 오프셋', output: '[2,4,6,8]에서 반복한다. 포함 여부를 먼저 고정한 +2 오프셋과 재선택을 구분한다.'},
      {session: 10, title: '도움 없이 설명 + 원 목록 숨기기', output: '누락값과 개수를 모르면 전체 평균을 확정할 수 없는 이유를 설명하고 필요한 정보를 적는다.'},
    ],
  },
  phases: [
    {
      id: 'learning-phase-1', title: '1. Python과 자료 생성', weeks: '1–5주',
      goal: '첫 본강의는 MIT 1 → 2 → 3. 이후 14강까지 순서대로 배우며 자료가 선택되는 과정을 코드로 설명한다.',
      resources: [
        ...mitResources.slice(0, 14),
        {id: 'mit-finger-exercises', title: 'MIT Finger Exercises', url: `${mit}pages/finger-exercises/`, kind: 'exercise', description: '본 강의 번호에 해당하는 연습을 풀고 원래 답·도움·수정 이유를 남긴다.'},
        {...stanford, id: 'stanford-orientation', start: 0, end: 480, description: '선택 오리엔테이션 최대 8분. 현재 URL 접근 미확인으로 외부 링크만 제공. 어려우면 생략하고 MIT 1부터 시작한다.'},
      ],
      exercise: '첫 2주: 모의 측정값 [1..10]의 전체 평균 5.5와 5 이상만 보관한 평균 7.5를 계산한다. 선택 규칙을 바꾸고 +2 센서 오프셋과 비교한다. 3~5주는 함수·목록·딕셔너리로 원본과 결과를 분리한다.',
      check: '새 목록에서 조건/반복/함수를 도움 없이 작성하고, 선택된 값만으로 원래 평균을 확정할 수 없는 이유를 설명한다. 실패하면 2주 단위로 보충. 시청률이나 AI 칭찬은 통과가 아니다.',
    },
    {
      id: 'learning-phase-2', title: '2. 수학·표본·베이즈', weeks: '6–9주',
      goal: 'Python 독립 수행 이후 벡터·미분·조건부확률로 증거와 불확실성을 계산한다.',
      resources: [
        ...videos('3Blue1Brown'),
        ...['Probability', 'Bayes’s Theorem', 'Distributions', 'Estimating Proportions'].map((title, i) =>
          reading(`bayes-${i + 1}`, `Think Bayes ${i + 1}. ${title}`, `${bayes}chap0${i + 1}.html`, '외부 교재. 작은 수로 계산한 뒤 코드로 확인하고 가정과 선택 규칙을 적는다.')),
      ],
      exercise: '두 가설의 prior×likelihood를 정규화해 posterior를 손계산한다. 반복 표본·결측·선택 규칙을 바꾸고 변동을 비교한다. 기존 Bayesian lesson001은 여기서 재사용한다.',
      check: '분수·지수·로그·그래프·조건부확률·벡터를 작은 수로 설명하고 새 증거에 따른 업데이트를 독립 계산한다. 막히면 수학 보충 4~8주를 추가한다.',
    },
    {
      id: 'learning-phase-3', title: '3. ML과 검증', weeks: '10–13주',
      goal: '손실을 줄이는 예측과 새로운 원리를 발견한다는 주장을 구분한다.',
      resources: [
        reading('ml-regression', 'MLCC — Linear regression', `${ml}linear-regression`, '외부 Google 학습 모듈. 회귀와 가중치·절편을 읽는다.'),
        reading('ml-loss', 'MLCC — Loss', `${ml}linear-regression/loss`, '외부 모듈. 같은 예측의 손실을 직접 계산한다.'),
        reading('ml-gradient', 'MLCC — Gradient descent', `${ml}linear-regression/gradient-descent`, '외부 모듈. 작은 선형 모델의 가중치를 한 번 갱신한다.'),
        reading('ml-overfitting', 'MLCC — Datasets, generalization, and overfitting', `${ml}overfitting`, '외부 모듈. 분할·과적합을 배우고 세계/시점 단위 holdout과 연결한다.'),
      ],
      exercise: '행 무작위 분할과 세계 단위 분할의 성능을 비교한다. 전처리와 설정 선택은 훈련/검증 안에서 수행하고 실행 전 예상을 보존한다.',
      check: '새 세계에서의 오차·seed 변동·비용을 보고하고 누수 사례를 찾는다. 오차 허용값 0.015→0.030 변화가 모델 개선이 아닌 이유를 설명한 뒤 다음 단계로 간다.',
    },
    {
      id: 'learning-phase-4', title: '4. 인과·정보·불확실성', weeks: '14–17주',
      goal: '관찰로 식별할 수 있는 것과 추가 개입이 필요한 것을 분리한다.',
      resources: [
        ...videos('Brady Neal - Causal Inference'),
        reading('causal-text', 'Brady Neal — Introduction to Causal Inference, chapters 1–6', 'https://www.bradyneal.com/Introduction_to_Causal_Inference-Dec17_2020-Neal.pdf', '외부 교재. 도입 클립만으로 단원을 마치지 않는다. 잠재 결과→그래프→SCM→무작위 실험 순서로 읽는다.'),
        reading('causal-course', 'Brady Neal — 공식 강의·슬라이드 목록', 'https://www.bradyneal.com/causal-inference-course', '각 도입 다음의 후속 절을 이 목록에서 선택한다.'),
        reading('bayes-decision', 'Think Bayes 9. Decision Analysis', `${bayes}chap09.html`, '외부 교재. 기대 효용과 정보의 가치를 계산한다.'),
      ],
      exercise: '관측은 같고 개입 결과가 다른 두 세계를 만든다. (0.5,0.5)/(0.9,0.1)의 entropy와 기대 사후 entropy, 구간 포함률+폭, Brier와 반복 변동을 함께 계산한다.',
      check: '새 사례에서 가정·식별 가능성·추가 측정을 독립 설명한다. 필요한 정보가 없으면 보류하고, 불확실한 예측과 가설을 구별하는 측정을 혼동하지 않는다.',
    },
    {
      id: 'learning-phase-5', title: '5. 신경망·LLM', weeks: '18–21주',
      goal: 'MIT 17/18 → tensor → micrograd → makemore 순서. 문맥·posterior·후보·가중치·기억 중 무엇이 바뀌는지 구분한다.',
      resources: [
        ...mitResources.slice(14),
        reading('pytorch-tensors', 'PyTorch — Tensors', 'https://docs.pytorch.org/tutorials/beginner/basics/tensorqs_tutorial.html', '선수 연결 4시간. 2×3과 3×2 행렬곱의 shape와 원소를 설명한다.'),
        ...videos('Andrej Karpathy'),
        {...stanford, id: 'stanford-evaluation', start: 1148, end: 2441, description: '정본의 자막 확인 기록: 평가 시작 19:08. 설명란 16:00과 다름. 현재 링크 접근 미확인; 전체 시청 검증 아님.'},
        {...stanford, id: 'stanford-post-training', start: 3594, description: '정본 기록: 59:54 post-training, 1:02:24 SFT, 1:10:05/1:12:28 SFT 한계·RLHF. 시청 가능할 때 해당 절을 선택한다.'},
        reading('mit-recursion', 'MIT 15–16 — 선택 보충: recursion', `${mit}video_galleries/lecture-videos/`, '재귀 그래프 순회를 직접 구현할 때만 15~16강을 별도 보충한다.'),
      ],
      exercise: '최소 40시간: 선수10·영상6·역전파/bigram12·3-token attention 손계산4·평가/설명8. 고정 연산 그래프를 역순으로 미분하고 수치 미분과 비교한다.',
      check: 'micrograd 전에 값/기울기 객체 메서드 수정, 행렬곱, 연쇄법칙을 도움 없이 수행한다. 미충족이면 1~2주 연장. 작은 bigram 수정이 범위이며 full GPT는 별도 선택 4주다.',
    },
    {
      id: 'learning-phase-6', title: '6. RL·탐색', weeks: '22–25주',
      goal: 'David Silver 1→2→3→4→5→8→9의 필요한 절을 보며 자료 수집 정책을 시험한다.',
      resources: [...videos('Google DeepMind'), reading('silver-course', 'David Silver — 강의 슬라이드와 Easy21', 'https://www.davidsilver.uk/teaching/', '외부 공식 자료. 필요한 강의 절과 표 기반 실습을 연결한다.')],
      exercise: '작은 표 기반 환경과 학습한 전이 모델을 만든다. 같은 관측/계산 예산에서 무작위·정보 선택·강제 탐색을 비교한다.',
      check: '평가 oracle과 숨은 생성 규칙을 입력에서 제외한다. 새 seed/세계에서 실패까지 보고하고 특정 합성 세계의 우위를 보편 법칙으로 확대하지 않는다.',
    },
    {
      id: 'learning-phase-7', title: '7. 역학·변수·기호 회귀', weeks: '26–29주',
      goal: '벡터·뉴턴·스프링/진동을 통해 단위, 표현과 판별 가능한 관측 범위를 연결한다.',
      resources: [
        ...videos('MIT OpenCourseWare'),
        reading('mechanics-oscillation', 'MIT 8.01SC — Chapter 23: Simple Harmonic Motion', 'https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter23.pdf', '외부 교재. 질량-스프링의 힘·진동수·단위를 확인한다.'),
        reading('ai-feynman', 'AI Feynman — 방법 부분', 'https://arxiv.org/abs/1905.11481', '외부 저자 논문. 차원 분석·변수 변환·기호 회귀의 가정을 읽는다. 원문 PMC는 접근 확인 중 브라우저 검사를 반환했다.'),
      ],
      exercise: '단위가 맞지 않는 후보를 제외하고 원시 변수와 계산 가능한 새 조합을 비교한다. y=x와 y=x+c·x³가 갈라지는 측정 범위를 제안한다.',
      check: '새 변수가 관측에서 계산 가능한지, 두 식의 예측 차이가 측정 오차보다 큰지 설명한다. 좁은 범위의 적합을 새로운 물리 법칙 발견으로 부르지 않는다.',
    },
    {
      id: 'learning-phase-8', title: '8. 네 조건 비교 실습', weeks: '30–33주',
      goal: '기존 설명 유지·재분석·새 측정·보류가 각각 적절한 상황을 구분한다.',
      resources: [
        reading('discovery-limits', '데이터 한계와 발견 연구 노트', `${wiki}/10_RESEARCH/DATA_AND_DISCOVERY_LIMITS.md`, '공개 URL은 404. 제공된 glorious-purpose-reference/PROJECT_WIKI/10_RESEARCH의 로컬 사본 또는 저장소 접근 권한이 필요하다. 연구 주장·관측·한계를 분리한다.'),
        ...['054', '055', '056'].flatMap(number => ['PLAN', 'RESULT'].map(type =>
          reading(`exp-${number}-${type.toLowerCase()}`, `EXP-${number} ${type}`, `${wiki}/30_EXPERIMENTS/EXP-${number}/${type}.md`, `공개 URL은 404. 로컬 glorious-purpose-reference/PROJECT_WIKI/30_EXPERIMENTS/EXP-${number}/${type}.md 또는 저장소 접근 권한이 필요하다. 계획/결과와 교육용 재구성/재현을 구분한다.`))),
      ],
      exercise: '① 원자료에 단서 있음 ② 관측 범위 밖에서만 후보 차이 ③ 필요한 정보 없음 ④ 기존 이론+잡음/오프셋의 네 조건을 만든다. 고정 trace 해석과 능동 실험 선택 비교를 분리한다.',
      check: '동일 예산·후보·관측 접근, 새 seed/세계군 평가, 실패·유지 사례를 보존한다. SHA/config/seed/의존성/체크포인트/실행 명령·비용이 없으면 원 EXP 재현으로 표시하지 않는다. 도움 없는 새 문제 수행과 수정 근거로만 진전을 판단한다.',
    },
  ],
};
