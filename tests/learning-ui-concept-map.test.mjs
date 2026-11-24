import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildConceptMapData, parseConceptMap} from '../scripts/concept-map-data.mjs';
import {
  conceptCounts, conceptGroups, fitTransform, graphLayout, lectureConcepts, materialLabel, nodesBox,
  prerequisiteChain, prerequisites, resolvePrerequisite, searchConcepts, zoomAt,
} from '../src/concept-map-model.mjs';
import {EVIDENCE_NOTE, NO_EVIDENCE, renderConceptMap, renderLectureConcepts} from '../src/concept-map-view.mjs';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const conceptMap = await read('../docs/CONCEPT_MAP.md');
const guideData = JSON.parse(await read('../scripts/study-guide-data.json'));
const data = JSON.parse(await read('../src/concept-map-data.json'));
const named = name => data.concepts.find(concept => concept.name === name);
const lecturesOf = concept => concept.resources.map(id => data.resources.find(resource => resource.id === id)).filter(resource => resource.lectureId);

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
  const concept = named('연쇄법칙(합성함수의 미분)'), [first] = lecturesOf(concept);
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
  assert.deepEqual(['변수·수직선', '함수와 그래프', '일차함수·기울기', '미분계수·도함수'].map(name => node.get(named(name).id).column), [0, 1, 2, 3]);
  const boxes = graph.nodes.map(item => [item.x, item.y, item.x + item.width, item.y + item.height]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, b] = [boxes[i], boxes[j]]; assert.ok(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1], 'nodes overlap');
  }
  const viewport = {width: 1100, height: 700}, box = {x: 0, y: 0, width: graph.width, height: graph.height}, fit = fitTransform(box, viewport);
  assert.ok(fit.x >= 0 && fit.y >= 0 && fit.x + box.width * fit.scale <= viewport.width + 1e-9 && fit.y + box.height * fit.scale <= viewport.height + 1e-9);
  const field = nodesBox(graph.nodes.filter(item => item.field === '신경망 핵심')), fieldFit = fitTransform(field, viewport);
  assert.ok(fieldFit.x + field.x * fieldFit.scale >= 0 && fieldFit.x + (field.x + field.width) * fieldFit.scale <= viewport.width + 1e-9);
  assert.equal(fitTransform({x: 0, y: 0, width: 10, height: 10}, viewport, 24, 1).scale, 1);
  const zoomed = zoomAt({scale: 1, x: 10, y: 20}, 2, {x: 300, y: 200});
  assert.deepEqual([(300 - zoomed.x) / zoomed.scale, (200 - zoomed.y) / zoomed.scale], [290, 180]);
  assert.equal(zoomAt({scale: 2, x: 0, y: 0}, 10, {x: 0, y: 0}).scale, 2.5);
});

// Minimal DOM: enough for the view's createElement/append/attributes/listeners; queries walk the tree.
class FakeNode {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.style = {}; this.ownText = ''; this.hidden = false; }
  append(...nodes) { for (const node of nodes) { node.parentNode = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.ownText = ''; this.append(...nodes); }
  set textContent(value) { this.children = []; this.ownText = String(value); }
  get textContent() { return this.ownText + this.children.map(child => child.textContent).join(''); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  fire(type, extra = {}) { for (const listener of this.listeners[type] || []) listener({type, target: this, preventDefault() {}, ...extra}); }
  get clientWidth() { return 0; }
  get clientHeight() { return 0; }
  getBoundingClientRect() { return {left: 0, top: 0}; }
  *walk() { yield this; for (const child of this.children) if (child instanceof FakeNode) yield* child.walk(); }
  all(test) { return [...this.walk()].filter(test); }
  find(test) { return this.all(test)[0]; }
}
const hasClass = name => node => (node.getAttribute?.('class') || '').split(' ').includes(name);
const shown = node => { for (let at = node; at; at = at.parentNode) if (at.hidden) return false; return true; };
const conceptRows = root => root.all(node => node.tagName === 'TR' && node.getAttribute('data-id') && shown(node));
function withDom(run) {
  const original = globalThis.document;
  globalThis.document = {createElement: tag => new FakeNode(tag), createElementNS: (namespace, tag) => new FakeNode(tag), createTextNode: text => ({textContent: String(text)})};
  try { return run(); } finally { globalThis.document = original; }
}

test('table view: groups disclose, lecture buttons open lectures, null evidence reads 아직 증거 없음', () => withDom(() => {
  const root = new FakeNode('div'), opened = [], concept = named('연쇄법칙(합성함수의 미분)'), [lecture] = lecturesOf(concept);
  const state = {progress: {[lecture.id]: {completed: true}}, records: [{anchor: {lectureId: lecture.lectureId}, question: '왜 곱하지?'}]};
  const map = renderConceptMap(root, {data, state, view: 'table', onOpenLecture: resource => opened.push(resource.id)});
  assert.ok(root.find(node => node.textContent === EVIDENCE_NOTE));
  const search = root.find(node => node.tagName === 'INPUT');
  assert.equal(search.getAttribute('aria-label'), '개념 찾기');
  const headers = root.all(node => node.tagName === 'TH' && node.getAttribute('scope') === 'col').map(node => node.textContent);
  assert.deepEqual(headers, ['개념', '먼저 알아야 할 것', '다루는 강의', '자료', '내가 표시', '질문', '확인 문제', '커밋·테스트']);
  const disclosures = root.all(hasClass('cmap-disclosure'));
  assert.equal(disclosures.length, data.fields.length);
  assert.ok(disclosures.some(node => node.textContent === '실험 판정 통계 · 7개 · 커리큘럼에 없음'));
  const row = root.find(node => node.tagName === 'TR' && node.getAttribute('data-id') === concept.id);
  const cells = row.children.map(cell => cell.textContent);
  assert.equal(cells[1], '미분계수·도함수, 합성함수');
  assert.equal(cells[3], '자료 있음');
  assert.equal(cells[4], `1 / ${concept.resources.length}`);
  assert.equal(cells[5], '1 (열린 1)');
  assert.equal(cells[6], NO_EVIDENCE); assert.equal(cells[7], NO_EVIDENCE);
  row.find(node => node.tagName === 'BUTTON' && hasClass('cmap-link')(node)).fire('click');
  assert.deepEqual(opened, [lecture.id]);
  const gies = root.find(node => node.tagName === 'TR' && node.getAttribute('data-id') === named('GIES').id).children.map(cell => cell.textContent);
  assert.deepEqual(gies.slice(2), ['-', '자료 없음', '-', NO_EVIDENCE, NO_EVIDENCE, NO_EVIDENCE]);

  const [group] = disclosures;
  group.fire('click');
  assert.equal(group.getAttribute('aria-expanded'), 'false');
  assert.equal(conceptRows(root).some(node => node.getAttribute('data-id') === data.concepts[0].id), false);
  group.fire('click');
  assert.equal(group.getAttribute('aria-expanded'), 'true');

  row.children[0].children[0].fire('click');
  assert.equal(row.getAttribute('aria-selected'), 'true');
  const inspector = root.find(hasClass('cmap-inspector'));
  assert.ok(inspector.textContent.includes('단계마다 기울기를 곱한다'));
  assert.ok(inspector.textContent.includes('연쇄법칙(합성함수의 미분) → 미분계수·도함수 → 일차함수·기울기 → 함수와 그래프 → 변수·수직선'));
  assert.ok(inspector.find(node => node.tagName === 'DD' && node.textContent === '합성함수'), '지도 밖 선수 shown as text');

  search.value = '없는개념이름'; search.fire('input');
  assert.ok(root.find(node => node.getAttribute('role') === 'status' && node.textContent.startsWith("'없는개념이름'에 맞는 개념이 없습니다")));
  assert.equal(conceptRows(root).length, 0);
  search.value = 'TOST'; search.fire('input');
  assert.deepEqual(conceptRows(root).map(node => node.getAttribute('data-id')), [named('동등성 검정(TOST)').id]);
  map.search('');
  assert.equal(conceptRows(root).length, data.concepts.length);
}));

test('graph view: nodes and edges from data, selection emphasises edges, controls and keys move the view', () => withDom(() => {
  const root = new FakeNode('div'), concept = named('미분계수·도함수');
  const focus = lectureConcepts(data, lecturesOf(concept)[0].lectureId).map(item => item.id);
  renderConceptMap(root, {data, state: {}, focusConceptIds: focus});
  const nodes = root.all(hasClass('cmap-node')), nodeFor = id => nodes.find(node => node.getAttribute('data-id') === id);
  assert.equal(nodes.length, data.concepts.length);
  const gap = nodeFor(named('GIES').id);
  assert.ok(gap.textContent.includes('○ 자료 없음') && gap.textContent.includes(NO_EVIDENCE));
  const paths = root.all(node => node.tagName === 'PATH');
  assert.equal(paths.length, graphLayout(data).edges.length);
  assert.ok(paths.some(hasClass('cmap-dashed')));
  assert.ok(root.find(node => node.textContent === '점선: 자료가 없는 개념으로 이어짐'));
  for (const label of ['화면 맞춤', '지금 강의 개념으로', '확대', '축소']) assert.ok(root.find(node => node.tagName === 'BUTTON' && node.getAttribute('aria-label') === label), label);
  const fitNote = root.find(hasClass('cmap-fit-note'));
  assert.match(fitNote.textContent, /분야에 맞췄습니다/);

  nodeFor(concept.id).fire('click');
  assert.equal(nodeFor(concept.id).getAttribute('aria-pressed'), 'true');
  const touching = paths.filter(path => path.getAttribute('data-from') === concept.id || path.getAttribute('data-to') === concept.id);
  assert.ok(touching.length > 0 && touching.every(hasClass('cmap-on')));
  assert.ok(paths.filter(path => !touching.includes(path)).every(hasClass('cmap-faint')));
  assert.ok(root.find(hasClass('cmap-inspector')).textContent.includes('먼저 알아야 할 것'));

  const graph = root.find(hasClass('cmap-graph')), layer = root.find(hasClass('cmap-layer'));
  const scaleOf = () => Number(layer.style.transform.split('scale(')[1].split(')')[0]);
  const before = scaleOf();
  graph.fire('keydown', {key: '+'}); assert.ok(scaleOf() > before);
  graph.fire('keydown', {key: '-'}); assert.ok(Math.abs(scaleOf() - before) < 1e-9);
  const moved = layer.style.transform; graph.fire('keydown', {key: 'ArrowLeft'}); assert.notEqual(layer.style.transform, moved);
  root.find(node => node.getAttribute('aria-label') === '지금 강의 개념으로').fire('click');
  assert.match(fitNote.textContent, /지금 강의의 개념/);
  root.find(node => node.getAttribute('aria-label') === '화면 맞춤').fire('click');
  assert.match(fitNote.textContent, /분야에 맞췄습니다/);
}));

test('lecture panel lists the lecture concepts and opens one', () => withDom(() => {
  const root = new FakeNode('div'), opened = [], concept = named('연쇄법칙(합성함수의 미분)'), [lecture] = lecturesOf(concept);
  renderLectureConcepts(root, {data, state: {records: []}, lectureId: lecture.lectureId, onOpenConcept: id => opened.push(id)});
  root.find(node => node.tagName === 'BUTTON' && node.textContent === concept.name).fire('click');
  assert.deepEqual(opened, [concept.id]);
  renderLectureConcepts(root, {data, lectureId: 'no-such-lecture'});
  assert.equal(root.textContent, '이 강의에 연결된 개념이 아직 없습니다.');
}));
