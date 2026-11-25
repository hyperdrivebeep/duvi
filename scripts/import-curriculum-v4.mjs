// Convert the reviewed research JSON into the app's optional-card data.
// node scripts/import-curriculum-v4.mjs <path-to-curriculum-v4.json>
import {readFile, writeFile} from 'node:fs/promises';

if (!process.argv[2]) throw new Error('Pass the reviewed curriculum-v4.json path');
const research = JSON.parse(await readFile(process.argv[2], 'utf8'));
const design = await readFile(new URL('../docs/CURRICULUM_V4_APPLY.md', import.meta.url), 'utf8');
const levels = {필수: 'required', 권장: 'recommended', 선택: 'optional'};
const decisions = new Map([...design.matchAll(/^\| ((?:E\d\d|I-[A-Z]+)) \| (필수|권장|선택) \| (.+) \|$/gm)]
  .map(([, id, level, reason]) => [id, {level: levels[level], reason}]));
const hours = [...design.matchAll(/^\| [1-8][BCD]? \| (\d+)–(\d+)시간 \|$/gm)].map(match => match.slice(1).map(Number));
if (hours.length !== research.stages.length || decisions.size !== 31) throw new Error('Check the design workload and decisions tables');
const key = id => `v4-${id.toLowerCase()}`;
const conceptLinks = {
  'I-MULT': ['다중 비교 보정(Holm·BH)'],
  'I-EQ': ['동등성 검정(TOST)'],
  'I-POW': ['검정력·MDE'],
  'I-WIL': ['Wilcoxon·부호 순열'],
  'I-PERM': ['Wilcoxon·부호 순열'],
  'I-PAIR': ['쌍 부트스트랩'],
  'I-REG': ['확증 vs 탐색', '사전등록'],
  'I-GIES': ['구조적 인과 모형(SCM)', '개입과 관찰의 구분', 'GIES'],
};
const connections = {
  E01: ['I-STAT', 'I-PAIR', 'I-REG'],
  E02: ['E01'], E03: ['E01'], E04: ['E01'], E06: ['E01'],
  'I-CAP': ['I-STAT', 'I-EQ', 'I-PAIR', 'I-REG', 'I-ID', 'E01', 'E03', 'E04'],
  E07: ['I-CAP'], E08: ['E07'], 'I-DIAG': ['E01'], 'I-EQ': ['I-STAT'],
};
const phaseCards = Object.fromEntries(research.stages.filter(stage => stage.id !== 'learning-phase-1').map(stage => {
  const exercises = research.exercises.filter(exercise => exercise.stageId === stage.id).map(({minutes, weeklyMinutes, weeklyActivities, activation, ...exercise}) => ({
    ...exercise, id: key(exercise.id), label: exercise.id, kind: 'exercise',
    ...decisions.get(exercise.id),
    ...(connections[exercise.id] && {cardPrerequisites: connections[exercise.id].map(key)}),
    ...(exercise.id === 'E08' && {spec: exercise.spec.replace('E07과 같은 네 주에 넣지 않는다.', 'E07 초안을 마친 뒤 별도 수정 단계로 진행한다.')}),
    ...(exercise.id === 'E01' ? {
      estimate: '12–18시간부터 · 통과 기준에 닿을 때까지 연장',
      steps: [
        '발췌 읽기·요청/반환 및 종료 계약 정리 (2–3시간)',
        '결정적 스텁과 로거 구현, 정상·실패 로그 만들기 (3–5시간)',
        '기록 재생과 원본을 바꾸지 않는 재채점 분리 (2–3시간)',
        '첫 이상·수리로 확인한 원인·최종 증상 표 작성, 불명도 남기기 (2–3시간)',
        '조건을 바꿔 재시험하고 처음 보는 로그 독립 설명 (3–4시간)',
      ],
      repetitions: '두 번째 세트는 ID·예산·실패 유형을 바꾼다. 연속 두 세트에서 아래 이진 기준을 통과하고, 처음 보는 로그에서 바뀐 것·고정한 것·결론의 한계를 도움 없이 설명하면 완료한다. 누락된 검사가 있으면 해당 반례를 추가해 다시 시도한다.',
    } : {estimate: `약 ${minutes / 60}시간부터 · 읽기·수정 포함, 필요하면 연장`}),
    resourceIds: exercise.resourceIds.map(key),
    readingPaths: exercise.readingPaths.map(path => ({...path, resourceIds: path.resourceIds.map(key)})),
  }));
  const summaryCards = (stage.integrationCards || []).map(({activation, assignDuringE01, ...card}) => ({
    ...card, id: key(card.id), kind: 'study-card',
    label: card.id, ...decisions.get(card.id),
    cardPrerequisites: [...(card.cardPrerequisites || []), ...(connections[card.id] || [])].map(key),
    ...(conceptLinks[card.id] && {concepts: conceptLinks[card.id]}),
  }));
  const references = stage.attachments.map(({activation, ...item}) => ({
    ...item, id: key(item.id), kind: 'reading', level: 'optional',
    reason: '해당 수행을 돕는 발췌 참고이며 전권 이수는 필요하지 않습니다.',
  }));
  return [stage.id, [...exercises, ...summaryCards, ...references]];
}).filter(([, cards]) => cards.length));
const data = {
  phases: phaseCards,
  hours: Object.fromEntries(research.stages.map((stage, index) => [stage.id, hours[index]])),
  workedExample: research.pr9.fixture,
  diagnosticIndex: research.pr9.diagnosticIndex.map(({id, label, question}) => ({id, label, question})),
};
await writeFile(new URL('../src/curriculum-v4-data.json', import.meta.url), `${JSON.stringify(data, null, 2)}\n`);
