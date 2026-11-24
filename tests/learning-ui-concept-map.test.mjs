import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildConceptMapData, parseConceptMap} from '../scripts/concept-map-data.mjs';
import {
  conceptCounts, conceptGroups, fitTransform, graphLayout, lectureConcepts, materialLabel, nodesBox,
  prerequisiteChain, prerequisites, resolvePrerequisite, searchConcepts, zoomAt,
} from '../src/concept-map-model.mjs';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const conceptMap = await read('../docs/CONCEPT_MAP.md');
const guideData = JSON.parse(await read('../scripts/study-guide-data.json'));
const data = JSON.parse(await read('../src/concept-map-data.json'));
const named = name => data.concepts.find(concept => concept.name === name);

test('every R-019 concept of sections 2-9 is in the committed data, which is up to date', () => {
  // Counts from the summary table at the top of docs/CONCEPT_MAP.md.
  const expected = {'수학 기초 A': 25, '수학 기초 B': 22, '확률·통계·정보이론': 34, '프로그래밍과 PyTorch': 16, '학습·손실·최적화·일반화': 20, '신경망 핵심': 21, '아키텍처': 17, '실무': 5};
  const mapped = data.concepts.filter(concept => !concept.gap);
  assert.equal(mapped.length, 160);
  for (const [prefix, count] of Object.entries(expected)) assert.equal(mapped.filter(concept => concept.field.startsWith(prefix)).length, count, prefix);
  assert.deepEqual(mapped.map(concept => concept.name), parseConceptMap(conceptMap).concepts.map(concept => concept.name));
  assert.equal(new Set(data.concepts.map(concept => concept.id)).size, data.concepts.length);
  assert.deepEqual(JSON.parse(JSON.stringify(buildConceptMapData({conceptMap, guideData}))), data);
  const chain = named('연쇄법칙(합성함수의 미분)');
  assert.equal(chain.definition, '단계마다 기울기를 곱한다');
  assert.deepEqual(chain.prerequisites, ['도함수', '합성함수']);
  assert.ok(['있음', '일부', '없음'].includes(chain.status));
  assert.ok(data.concepts.every(concept => concept.resources.every(id => data.resources.some(resource => resource.id === id))));
});

test('prerequisites resolve to concepts or are marked external, never guessed across a word', () => {
  const chainRule = named('연쇄법칙(합성함수의 미분)');
  assert.deepEqual(prerequisites(data, chainRule).map(item => item.name ?? `external:${item.label}`), ['미분계수·도함수', 'external:합성함수']);
  assert.equal(resolvePrerequisite(data, 'MLE', named('음의 로그우도(NLL)').field).name, '우도·최대우도(MLE)');
  assert.equal(resolvePrerequisite(data, '분포', named('가설검정·카이제곱·p값').field).name, '베르누이·범주형·가우스 분포');
  assert.equal(resolvePrerequisite(data, '함수', named('극한(직관)').field).name, '함수와 그래프');
  assert.equal(resolvePrerequisite(data, '표준오차', named('평가의 변동: 시드 간 구간·부트스트랩').field).external, true);
  for (const concept of data.concepts) for (const item of prerequisites(data, concept)) assert.ok(item.external || data.concepts.some(other => other.id === item.id), `${concept.name} <- ${item.label}`);
  assert.deepEqual(prerequisiteChain(data, chainRule).map(concept => concept.name), ['미분계수·도함수', '일차함수·기울기', '함수와 그래프', '변수·수직선']);
});

test('gap groups have no material, cite the report, and link only to real concepts', () => {
  const gaps = conceptGroups(data).filter(group => group.gap);
  assert.deepEqual(gaps.map(group => [group.name, group.concepts.length]), [['실험 판정 통계', 7], ['인과 구조 학습', 3]]);
  assert.deepEqual(gaps[0].concepts.map(concept => concept.name), ['다중 비교 보정(Holm·BH)', '동등성 검정(TOST)', '검정력·MDE', 'Wilcoxon·부호 순열', '쌍 부트스트랩', '확증 vs 탐색', '사전등록']);
  assert.deepEqual(gaps[1].concepts.map(concept => concept.name).sort(), ['GIES', '개입과 관찰의 구분', '구조적 인과 모형(SCM)'].sort());
  for (const concept of gaps.flatMap(group => group.concepts)) {
    assert.equal(concept.gap, true); assert.deepEqual(concept.resources, []); assert.equal(materialLabel(data, concept), '자료 없음');
    assert.match(concept.source, /REPORT\.md/); assert.match(concept.prerequisiteSource, /REPORT\.md:\d+/);
    assert.ok(prerequisites(data, concept).every(item => item.id), concept.name);
  }
  assert.deepEqual(conceptCounts(data, named('GIES'), {progress: {}, records: [], attempts: []}), {marked: null, questions: null, checks: {total: 0, correct: 0}, work: null});
});

test('counts come from the learning state; missing evidence is null, not zero', () => {
  const concept = named('연쇄법칙(합성함수의 미분)');
  const [first] = concept.resources.map(id => data.resources.find(resource => resource.id === id)).filter(resource => resource.lectureId);
  const record = (lectureId, extra = {}) => ({anchor: {lectureId, seconds: 1, sourceText: 'x'}, question: '왜?', ...extra});
  const state = {
    progress: {[first.id]: {completed: true}},
    records: [record(first.lectureId), record(first.lectureId, {explanation: '내 설명'}), record('unrelated')],
    attempts: [{conceptId: concept.id, correct: true}, {conceptId: concept.id, correct: false}, {conceptId: 'other', correct: true}],
  };
  const counts = conceptCounts(data, concept, state, {[concept.id]: {commits: 2, testsPassed: 1, testsFailed: 0}});
  assert.deepEqual(counts.marked, {done: 1, total: concept.resources.length});
  assert.deepEqual(counts.questions, {total: 2, open: 1});
  assert.deepEqual(counts.checks, {total: 2, correct: 1});
  assert.deepEqual(counts.work, {commits: 2, testsPassed: 1, testsFailed: 0});
  assert.deepEqual(conceptCounts(data, concept, {}), {marked: null, questions: null, checks: null, work: null});
  assert.deepEqual(conceptCounts(data, concept, {progress: {}, records: []}).questions, {total: 0, open: 0});
  assert.ok(lectureConcepts(data, first.lectureId).some(item => item.id === concept.id));
  assert.deepEqual(lectureConcepts(data, 'no-such-lecture'), []);
});

test('search matches every word and has a no-result case', () => {
  assert.ok(searchConcepts(data, '연쇄법칙').includes(named('연쇄법칙(합성함수의 미분)').id));
  assert.ok(searchConcepts(data, 'tost').includes(named('동등성 검정(TOST)').id));
  assert.deepEqual(searchConcepts(data, '연쇄법칙 존재하지않는말'), []);
  assert.equal(searchConcepts(data, '  ').length, data.concepts.length);
});

test('graph edges come only from resolved prerequisites, columns are longest paths, fit stays in bounds', () => {
  const graph = graphLayout(data), node = new Map(graph.nodes.map(item => [item.id, item]));
  const resolved = new Set(data.concepts.flatMap(concept => prerequisites(data, concept).filter(item => item.id).map(item => `${item.id}>${concept.id}`)));
  assert.deepEqual(new Set(graph.edges.map(edge => `${edge.from}>${edge.to}`)), resolved);
  assert.equal(graph.edges.length, resolved.size);
  assert.equal(graph.nodes.length, data.concepts.length);
  for (const edge of graph.edges) assert.equal(edge.dashed, materialLabel(data, data.concepts.find(concept => concept.id === edge.to)) === '자료 없음');
  assert.ok(graph.edges.some(edge => edge.dashed) && graph.edges.some(edge => !edge.dashed));
  for (const concept of data.concepts) {
    const froms = graph.edges.filter(edge => edge.to === concept.id).map(edge => node.get(edge.from).column);
    assert.equal(node.get(concept.id).column, froms.length ? Math.max(...froms) + 1 : 0, concept.name);
  }
  const chain = ['변수·수직선', '함수와 그래프', '일차함수·기울기', '미분계수·도함수'].map(name => node.get(named(name).id).column);
  assert.deepEqual(chain, [0, 1, 2, 3]);
  const boxes = graph.nodes.map(item => [item.x, item.y, item.x + item.width, item.y + item.height]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, b] = [boxes[i], boxes[j]]; assert.ok(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1], 'nodes overlap');
  }
  const viewport = {width: 1100, height: 700}, box = {x: 0, y: 0, width: graph.width, height: graph.height}, fit = fitTransform(box, viewport);
  assert.ok(fit.x >= 0 && fit.y >= 0 && fit.x + box.width * fit.scale <= viewport.width + 1e-9 && fit.y + box.height * fit.scale <= viewport.height + 1e-9);
  const field = nodesBox(graph.nodes.filter(item => item.field === '신경망 핵심')), fieldFit = fitTransform(field, viewport);
  assert.ok(fieldFit.x + field.x * fieldFit.scale >= 0 && fieldFit.x + (field.x + field.width) * fieldFit.scale <= viewport.width + 1e-9);
  const zoomed = zoomAt({scale: 1, x: 10, y: 20}, 2, {x: 300, y: 200});
  assert.deepEqual([(300 - zoomed.x) / zoomed.scale, (200 - zoomed.y) / zoomed.scale], [290, 180]);
  assert.equal(zoomAt({scale: 2, x: 0, y: 0}, 10, {x: 0, y: 0}).scale, 2.5);
});
