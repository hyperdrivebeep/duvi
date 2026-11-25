// Builds src/concept-map-data.json for the 개념 지도 screen from docs/CONCEPT_MAP.md (R-019 sections 2-9),
// scripts/study-guide-data.json (concept -> roadmap resources) and the roadmap's own `concepts` links,
// plus concept groups the curriculum has no material for yet (gap groups).
// Usage: node scripts/concept-map-data.mjs          (write the JSON)
//        node scripts/concept-map-data.mjs --check  (exit 1 when the committed JSON is out of date)
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {ROADMAP} from '../src/learning-roadmap.mjs';

const project = new URL('../', import.meta.url);
export const OUTPUT = fileURLToPath(new URL('src/concept-map-data.json', project));
const STATUS = {커버: '있음', 일부: '일부', 없음: '없음'};
const GAP_SOURCE = 'Duvi 커리큘럼-목표 대조 조사 REPORT.md (2026-11-23) 1·2·5절: 로드맵·개념 지도 0건';

// Each gap concept's prerequisites name R-019 concepts; prerequisiteSource cites the REPORT.md line the link rests on
// and says when the link is an editorial judgement rather than a statement of the report.
// Concepts the 2026-11-23 curriculum review found in the project's design sessions but in neither the roadmap nor R-019.
export const GAP_GROUPS = [
  {name: '실험 판정 통계', concepts: [
    ['다중 비교 보정(Holm·BH)', '검정을 여러 번 하면 우연히 "유의"가 나올 확률이 커지므로 기준을 함께 조정한다', '조건·지표가 여럿인 실험 비교에서 거짓 발견을 막는다', ['가설검정·카이제곱·p값'], 'REPORT.md:35 (3·3B 검증: 코드는 Holm·BH·TOST·부호 순열·Wilcoxon·쌍 부트스트랩·검정력, 로드맵은 p값·부트스트랩 입문)'],
    ['동등성 검정(TOST)', '차이가 미리 정한 허용 폭 안에 있음을 양쪽 단측 검정 두 번으로 보인다', '"차이 없음"을 p값이 크다는 것만으로 주장하지 않게 한다', ['가설검정·카이제곱·p값'], 'REPORT.md:35 (3·3B 검증: 코드는 Holm·BH·TOST·부호 순열·Wilcoxon·쌍 부트스트랩·검정력, 로드맵은 p값·부트스트랩 입문)'],
    ['검정력·MDE', '실제 차이가 있을 때 검출할 확률과, 주어진 표본으로 잡을 수 있는 최소 효과 크기', '시드·세계 수를 미리 정하고 "효과 없음"의 한계를 말한다', ['가설검정·카이제곱·p값'], 'REPORT.md:35 (3·3B 검증: 코드는 Holm·BH·TOST·부호 순열·Wilcoxon·쌍 부트스트랩·검정력, 로드맵은 p값·부트스트랩 입문)'],
    ['Wilcoxon·부호 순열', '분포 가정 없이 쌍 차이의 순위나 부호를 뒤집어 보는 검정', '시드가 적고 분포가 치우친 쌍 비교', ['가설검정·카이제곱·p값'], 'REPORT.md:35 (3·3B 검증: 코드는 Holm·BH·TOST·부호 순열·Wilcoxon·쌍 부트스트랩·검정력, 로드맵은 p값·부트스트랩 입문)'],
    ['쌍 부트스트랩', '같은 시드·세계로 맞춘 쌍을 통째로 다시 뽑아 차이의 구간을 구한다', '두 구조를 같은 조건에서 비교할 때 차이의 불확실성', ['평가의 변동: 시드 간 구간·부트스트랩'], 'REPORT.md:35 (3·3B 검증: 코드는 Holm·BH·TOST·부호 순열·Wilcoxon·쌍 부트스트랩·검정력, 로드맵은 p값·부트스트랩 입문)'],
    ['확증 vs 탐색', '미리 정한 가설을 확인하는 분석과 결과를 보고 찾은 분석을 나눠 보고한다', '실험 결과를 과장하지 않고 편차를 기록한다', ['가설검정·카이제곱·p값'], 'REPORT.md:35 (3·3B 검증: 코드는 Holm·BH·TOST·부호 순열·Wilcoxon·쌍 부트스트랩·검정력, 로드맵은 p값·부트스트랩 입문) · 편집 판단'],
    ['사전등록', '실행 전에 가설·지표·판정 규칙을 고정해 기록한다', '결과를 보고 기준을 바꾸는 일을 막는다', ['확증 vs 탐색'], 'REPORT.md:43 (확증 vs 탐색 구분과 편차 기록 · 사전등록) · 편집 판단'],
  ]},
  {name: '인과 구조 학습', concepts: [
    ['구조적 인과 모형(SCM)', '변수마다 원인들의 함수와 잡음으로 값이 정해지는 모형과 그 그래프', '개입 실험이 무엇을 바꾸는지 식으로 적는다', ['조건부확률·독립'], 'REPORT.md:36 (4 인과: 코드는 GIES, 로드맵은 SCM 입문까지) · SCM은 조건부 독립으로 정의되므로 편집 판단'],
    ['개입과 관찰의 구분', '값을 지켜본 것과 값을 직접 정한 것(do)은 다른 분포를 준다', '실험 선택이 관찰 데이터만으로 알 수 없는 것을 알려 주는 이유', ['구조적 인과 모형(SCM)'], 'REPORT.md:36 (4 인과: 코드는 GIES, 로드맵은 SCM 입문까지) · 편집 판단'],
    ['GIES', '관찰·개입 데이터를 함께 써서 인과 그래프(동치류)를 탐욕적으로 찾는 알고리즘', '진행 중 실험의 인과 구조 학습 기준선', ['구조적 인과 모형(SCM)', '개입과 관찰의 구분'], 'REPORT.md:36 (4 인과: 코드는 GIES, 로드맵은 SCM 입문까지)'],
  ]},
];

/** Concept rows of R-019 sections 2-9 with definition, reason, prerequisites and level. */
export function parseConceptMap(markdown) {
  const fields = [], concepts = [];
  let field = null, header = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^## (\d+)\. (.+)$/);
    if (heading) {
      const number = Number(heading[1]);
      field = number >= 2 && number <= 9 ? {id: `s${number}`, name: heading[2].replace(/ \(.*\)$/, '')} : null;
      if (field) fields.push(field);
      header = null; continue;
    }
    if (!field || !line.startsWith('| ')) continue;
    const cells = line.replace(/^\|\s|\s\|$/g, '').split(' | ').map(cell => cell.trim().replace(/\*\*/g, ''));
    if (cells[0] === '개념') { header = cells; continue; }
    if (!header || line.startsWith('|---')) continue;
    const cell = (...names) => { for (const name of names) { const at = header.indexOf(name); if (at >= 0) return cells[at]; } return ''; };
    const prerequisites = cell('선수');
    const index = concepts.filter(concept => concept.field === field.name).length + 1;
    concepts.push({
      id: `${field.id}-${String(index).padStart(2, '0')}`, field: field.name, name: cells[0],
      definition: cell('한 줄 정의', '제1원칙 설명', '내용'), why: cell('설계에서 왜 필요'),
      prerequisites: !prerequisites || prerequisites === '-' ? [] : prerequisites.split(/,\s*/),
      level: cell('수준'),
    });
  }
  return {fields, concepts};
}

export function buildConceptMapData({conceptMap, guideData, roadmap = ROADMAP}) {
  const {fields, concepts} = parseConceptMap(conceptMap);
  const resources = new Map(), byConcept = new Map();
  for (const phase of roadmap.phases) for (const resource of phase.resources) {
    if (!resources.has(resource.id)) resources.set(resource.id, resource);
    for (const name of resource.concepts || []) byConcept.set(name, [...(byConcept.get(name) || []), resource.id]);
  }
  for (const cards of Object.values(roadmap.curriculumV4?.phases || {})) for (const card of cards) {
    resources.set(card.id, {...card, roadmapCard: true});
    for (const name of card.concepts || []) byConcept.set(name, [...(byConcept.get(name) || []), card.id]);
  }
  const used = new Set();
  const rows = concepts.map(concept => {
    const entry = guideData.concepts[concept.name];
    if (!entry) throw new Error(`study-guide-data.json has no entry for: ${concept.name}`);
    const ids = [];
    for (const ref of entry.resources) ids.push(...(typeof ref === 'string' ? [ref] : ref.ids || []));
    ids.push(...(byConcept.get(concept.name) || []));
    const linked = [...new Set(ids)];
    for (const id of linked) { if (!resources.has(id)) throw new Error(`Unknown roadmap resource ${id} for ${concept.name}`); used.add(id); }
    return {...concept, status: STATUS[entry.status] ?? entry.status, resources: linked};
  });
  const gapFields = GAP_GROUPS.map((group, index) => ({id: `g${index + 1}`, name: group.name, gap: true, source: GAP_SOURCE}));
  const gaps = GAP_GROUPS.flatMap((group, groupIndex) => group.concepts.map(([name, definition, why, prerequisites, prerequisiteSource], index) => {
    const linked = byConcept.get(name) || [];
    linked.forEach(id => used.add(id));
    return {
      id: `g${groupIndex + 1}-${String(index + 1).padStart(2, '0')}`, field: group.name, name, definition, why, prerequisites, prerequisiteSource,
      level: '', status: linked.length ? '일부' : '없음', resources: linked, gap: true, source: GAP_SOURCE,
    };
  }));
  return {
    source: {
      concepts: 'docs/CONCEPT_MAP.md (R-019) sections 2-9',
      resources: `scripts/study-guide-data.json + src/learning-roadmap.mjs concepts (roadmap version ${roadmap.version})`,
      gaps: GAP_SOURCE,
      note: 'status is the R-020 judgement against roadmap v1 (커버 -> 있음). Generated by npm run data:concept-map; do not edit by hand.',
    },
    fields: [...fields, ...gapFields],
    concepts: [...rows, ...gaps],
    // Roadmap order, so a lecture shared by two resources keeps the first resource's progress id (learning-model.mjs).
    resources: [...resources.values()].filter(resource => used.has(resource.id))
      .map(({id, title, kind, url, lectureId, roadmapCard}) => ({id, title, kind, url, ...(lectureId && {lectureId: String(lectureId)}), ...(roadmapCard && {roadmapCard})})),
  };
}

async function main() {
  const [conceptMap, guideData] = await Promise.all([
    readFile(new URL('docs/CONCEPT_MAP.md', project), 'utf8'),
    readFile(new URL('scripts/study-guide-data.json', project), 'utf8').then(JSON.parse),
  ]);
  const json = `${JSON.stringify(buildConceptMapData({conceptMap, guideData}), null, 1)}\n`;
  if (process.argv.includes('--check')) {
    const current = (await readFile(OUTPUT, 'utf8').catch(() => '')).replace(/\r\n/g, '\n');
    if (current !== json) { console.error('src/concept-map-data.json is out of date. Run npm run data:concept-map.'); process.exitCode = 1; }
    return;
  }
  await writeFile(OUTPUT, json);
}
if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) await main();
