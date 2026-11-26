import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildConceptMapData, parseConceptMap} from '../scripts/concept-map-data.mjs';
import {
  conceptCounts, conceptGroups, directNeighbours, domainOverview, fitTransform, graphLayout, lectureConcepts, materialLabel, nodesBox,
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

test('previous gap groups preserve citations and link to v4 cards and real prerequisites', () => {
  const gaps = conceptGroups(data).filter(group => group.gap);
  assert.deepEqual(gaps.map(group => [group.name, group.concepts.length]), [['실험 판정 통계', 7], ['인과 구조 학습', 3]]);
  assert.deepEqual(gaps[0].concepts.map(concept => concept.name), ['다중 비교 보정(Holm·BH)', '동등성 검정(TOST)', '검정력·MDE', 'Wilcoxon·부호 순열', '쌍 부트스트랩', '확증 vs 탐색', '사전등록']);
  assert.deepEqual(gaps[1].concepts.map(concept => concept.name).sort(), ['GIES', '개입과 관찰의 구분', '구조적 인과 모형(SCM)'].sort());
  for (const concept of gaps.flatMap(group => group.concepts)) {
    assert.equal(concept.gap, true); assert.ok(concept.resources.some(id => id.startsWith('v4-i-')));
    assert.notEqual(materialLabel(data, concept), '자료 없음');
    assert.match(concept.source, /REPORT\.md/); assert.match(concept.prerequisiteSource, /REPORT\.md:\d+/);
    assert.ok(prerequisites(data, concept).every(item => item.id), concept.name);
  }
  const gies = named('GIES');
  assert.deepEqual(conceptCounts(data, gies, {progress: {'v4-i-gies': {completed: true}}, records: [], attempts: []}).marked, {done: 1, total: gies.resources.length});
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
  const withoutGies = {...data, concepts: data.concepts.map(concept => concept.name === 'GIES' ? {...concept, resources: []} : concept)};
  assert.ok(graphLayout(withoutGies).edges.some(edge => edge.dashed));
  assert.ok(graph.edges.some(edge => !edge.dashed));
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
  focus() { document.activeElement = this; this.fire('focus'); }
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
const openFull = root => root.find(node => node.tagName === 'BUTTON' && node.textContent === '전체 그래프').fire('click');
function withDom(run) {
  const original = globalThis.document;
  const listeners = {};
  globalThis.document = {createElement: tag => new FakeNode(tag), createElementNS: (namespace, tag) => new FakeNode(tag), createTextNode: text => ({textContent: String(text)}),
    addEventListener: (type, listener) => (listeners[type] ||= new Set()).add(listener), removeEventListener: (type, listener) => listeners[type]?.delete(listener),
    fire: (type, extra = {}) => { for (const listener of [...(listeners[type] || [])]) listener({type, ...extra}); }};
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
  assert.ok(disclosures.some(node => node.textContent === '실험 판정 통계 · 7개 · 이전 공백'));
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
  assert.deepEqual(gies.slice(2), ['읽기 자료만', materialLabel(data, named('GIES')), `0 / ${named('GIES').resources.length}`, NO_EVIDENCE, NO_EVIDENCE, NO_EVIDENCE]);

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
  openFull(root);
  const nodes = root.all(hasClass('cmap-node')), nodeFor = id => nodes.find(node => node.getAttribute('data-id') === id);
  assert.equal(nodes.length, data.concepts.length);
  const gap = nodeFor(named('GIES').id);
  assert.ok(gap.textContent.includes(materialLabel(data, named('GIES'))) && gap.textContent.includes(NO_EVIDENCE));
  const paths = root.all(node => node.tagName === 'PATH');
  assert.equal(paths.length, graphLayout(data).edges.length);
  assert.equal(paths.filter(hasClass('cmap-dashed')).length, graphLayout(data).edges.filter(edge => edge.dashed).length);
  assert.ok(root.find(node => node.textContent === '점선: 자료가 없는 개념으로 이어짐'));
  for (const label of ['화면 맞춤', '지금 강의 개념으로', '확대', '축소']) assert.ok(root.find(node => node.tagName === 'BUTTON' && node.getAttribute('aria-label') === label), label);
  const fitNote = root.find(hasClass('cmap-fit-note'));
  assert.match(fitNote.textContent, /분야/);

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
  assert.match(fitNote.textContent, new RegExp(`'${concept.field}' 분야`));
}));

test('graph node names read as separate phrases, without the material glyph, keeping every state word', () => withDom(() => {
  const nodeName = (state, name) => {
    const root = new FakeNode('div');
    renderConceptMap(root, {data, state, view: 'graph'});
    openFull(root);
    return root.find(node => hasClass('cmap-node')(node) && node.getAttribute('data-id') === named(name).id).getAttribute('aria-label');
  };
  const empty = {progress: {}, records: [], attempts: []}, line = named('변수·수직선'), marked = conceptCounts(data, line, empty).marked;
  assert.equal(nodeName(empty, 'GIES'), `GIES, ${materialLabel(data, named('GIES'))}, 내가 표시 0/${named('GIES').resources.length}, 확인 문제 0`);
  assert.equal(nodeName(empty, '변수·수직선'), `변수·수직선, 자료 있음${marked ? `, 내가 표시 ${marked.done}/${marked.total}` : ''}, 질문 0, 확인 문제 0`);
  assert.equal(nodeName({}, 'GIES'), `GIES, ${materialLabel(data, named('GIES'))}, ${NO_EVIDENCE}`);
  const root = new FakeNode('div');
  renderConceptMap(root, {data, state: {}, view: 'graph'});
  openFull(root);
  const words = text => text.replace(/[●◐○]/g, '').replace(/ · |, /g, '').replace(/\s+/g, '');
  for (const node of root.all(hasClass('cmap-node'))) {
    const label = node.getAttribute('aria-label');
    assert.ok(label && !/[●◐○]/.test(label), label);
    const shown = node.children.filter(child => child.getAttribute('aria-hidden') !== 'true').map(child => child.textContent).join('');
    assert.equal(words(label), words(shown), 'the name keeps every word shown on the node');
  }
}));

test('graph nodes carry no title (read again as a description); a cut-off name is shown in full on hover or focus', () => withDom(() => {
  const root = new FakeNode('div');
  renderConceptMap(root, {data, state: {}, view: 'graph'});
  openFull(root);
  const nodes = root.all(hasClass('cmap-node'));
  assert.equal(nodes.length, data.concepts.length);
  for (const node of nodes) {
    const concept = data.concepts.find(item => item.id === node.getAttribute('data-id'));
    assert.equal(node.getAttribute('title'), null, concept.name);
  }
  const [cut, whole] = nodes, nameOf = node => node.find(hasClass('cmap-node-name'));
  Object.defineProperties(nameOf(cut), {scrollWidth: {value: 240}, clientWidth: {value: 180}});
  Object.defineProperties(nameOf(whole), {scrollWidth: {value: 120}, clientWidth: {value: 180}});
  cut.fire('mouseenter'); assert.ok(hasClass('cmap-tip-on')(cut), 'a cut-off name gets the tooltip');
  whole.fire('focus'); assert.equal(hasClass('cmap-tip-on')(whole), false, 'a name that fits gets none');
}));

const cutNode = () => {
  const root = new FakeNode('div');
  renderConceptMap(root, {data, state: {}, view: 'graph'});
  openFull(root);
  const [node] = root.all(hasClass('cmap-node'));
  Object.defineProperties(node.find(hasClass('cmap-node-name')), {scrollWidth: {value: 240}, clientWidth: {value: 180}});
  return {node, concept: data.concepts.find(item => item.id === node.getAttribute('data-id'))};
};

test('the full-name tooltip is an aria-hidden element, so it adds no second text to the accessibility tree', () => withDom(() => {
  const {node, concept} = cutNode(), tip = node.find(hasClass('cmap-node-tip'));
  assert.ok(tip, 'the tooltip is an element of its own');
  assert.equal(tip.getAttribute('aria-hidden'), 'true');
  assert.equal(tip.find(hasClass('cmap-node-tip-name')).textContent, concept.name);
}));

test('the full-name tooltip repeats the state lines of its node, so the node it covers loses nothing', () => withDom(() => {
  const {node} = cutNode(), tip = node.find(hasClass('cmap-node-tip'));
  const own = node.children.filter(hasClass('cmap-node-line')).map(line => line.textContent);
  assert.equal(own.length, 2);
  assert.deepEqual(tip.children.filter(hasClass('cmap-node-line')).map(line => line.textContent), own);
}));

test('Escape hides a shown tooltip without moving focus; the next hover or focus shows it again', () => withDom(() => {
  const {node} = cutNode(), cut = () => hasClass('cmap-tip-on')(node);
  node.fire('focus'); assert.ok(cut());
  document.fire('keydown', {key: 'a'}); assert.ok(cut(), 'another key leaves it');
  document.fire('keydown', {key: 'Escape'}); assert.equal(cut(), false, 'Escape hides it');
  node.fire('mouseenter'); assert.ok(cut(), 'the next hover shows it');
  document.fire('keydown', {key: 'Escape'}); assert.equal(cut(), false);
  node.fire('focus'); assert.ok(cut(), 'the next focus shows it');
}));

test('a tooltip shown on one node is taken down when another one shows, so Escape never leaves one behind', () => withDom(() => {
  const root = new FakeNode('div');
  renderConceptMap(root, {data, state: {}, view: 'graph'});
  openFull(root);
  const [first, second] = root.all(hasClass('cmap-node'));
  for (const node of [first, second]) Object.defineProperties(node.find(hasClass('cmap-node-name')), {scrollWidth: {value: 240}, clientWidth: {value: 180}});
  first.fire('focus'); second.fire('mouseenter');
  assert.equal(hasClass('cmap-tip-on')(first), false);
  document.fire('keydown', {key: 'Escape'});
  assert.equal([first, second].some(hasClass('cmap-tip-on')), false);
}));

test('graph controls are named once (no title read again as the description); glyph-only ones show their name in a dismissible tooltip', () => withDom(() => {
  const root = new FakeNode('div');
  renderConceptMap(root, {data, state: {}, view: 'graph', focusConceptIds: [data.concepts[0].id]});
  openFull(root);
  const controls = root.all(hasClass('cmap-control'));
  assert.deepEqual(controls.map(button => button.getAttribute('aria-label')), ['개념 지도로 돌아가기', '화면 맞춤', '지금 강의 개념으로', '확대', '축소']);
  for (const button of controls) {
    const label = button.getAttribute('aria-label');
    assert.equal(button.getAttribute('title'), null, label);
    assert.equal(button.getAttribute('showText'), null, label);
    const visible = button.children.filter(child => child.getAttribute('aria-hidden') !== 'true').map(child => child.textContent).join('');
    const tip = button.find(hasClass('cmap-control-tip'));
    if (visible) { assert.equal(visible, label); assert.equal(tip, undefined, label); continue; }
    assert.equal(tip.getAttribute('aria-hidden'), 'true', label); assert.equal(tip.textContent, label);
    button.fire('mouseenter'); assert.ok(hasClass('cmap-tip-on')(button), label);
    document.fire('keydown', {key: 'Escape'}); assert.equal(hasClass('cmap-tip-on')(button), false, label);
    button.fire('focus'); assert.ok(hasClass('cmap-tip-on')(button), label);
    document.fire('keydown', {key: 'Escape'});
  }
}));

test('lecture panel lists the lecture concepts and opens one', () => withDom(() => {
  const root = new FakeNode('div'), opened = [], concept = named('연쇄법칙(합성함수의 미분)'), [lecture] = lecturesOf(concept);
  renderLectureConcepts(root, {data, state: {records: []}, lectureId: lecture.lectureId, onOpenConcept: id => opened.push(id)});
  root.find(node => node.tagName === 'BUTTON' && node.textContent === concept.name).fire('click');
  assert.deepEqual(opened, [concept.id]);
  renderLectureConcepts(root, {data, lectureId: 'no-such-lecture'});
  assert.equal(root.textContent, '이 강의에 연결된 개념이 아직 없습니다.');
}));

import {attemptsByConcept, evidenceByConcept} from '../src/concept-map-model.mjs';
test('quiz attempts count for the concepts they name, else for their lecture\'s concepts', () => {
  const concept = named('연쇄법칙(합성함수의 미분)'), [lecture] = lecturesOf(concept), lectureIds = lectureConcepts(data, lecture.lectureId).map(item => item.id);
  const rows = attemptsByConcept(data, [
    {lectureId: lecture.lectureId, result: 'right', item: {concepts: [` ${concept.name.toUpperCase()} `]}},
    {lectureId: lecture.lectureId, result: 'wrong', item: {concepts: ['지도에 없는 이름']}},
  ]);
  assert.deepEqual(rows[0], {conceptId: concept.id, correct: true});
  assert.deepEqual(rows.slice(1).map(row => row.conceptId), lectureIds);
  assert.ok(rows.slice(1).every(row => row.correct === false));
  const counts = conceptCounts(data, concept, {attempts: rows});
  assert.deepEqual(counts.checks, {total: 1 + (lectureIds.includes(concept.id) ? 1 : 0), correct: 1});
  assert.deepEqual(attemptsByConcept(data, []), []);
});
test('repository evidence counts only commits and tests that name a concept; no repository means no evidence', () => {
  const concept = named('연쇄법칙(합성함수의 미분)'), other = data.concepts.find(item => item.id !== concept.id && !concept.name.includes(item.name));
  const evidence = {configured: true, repos: [{commits: [{subject: `${concept.id}: 미분 연습 추가`}, {subject: '오타 수정'}],
    tests: [{cases: [{name: `test_${concept.name}`, status: 'passed'}, {name: `test_${concept.name}_edge`, status: 'failed'}, {name: 'test_misc', status: 'passed'}]}]}]};
  const byConcept = evidenceByConcept(data, evidence);
  assert.deepEqual(byConcept[concept.id], {commits: 1, testsPassed: 1, testsFailed: 1});
  assert.equal(byConcept[other.id], undefined);
  assert.equal(conceptCounts(data, other, {}, byConcept).work, null);
  assert.equal(evidenceByConcept(data, {configured: false, repos: []}), undefined);
});
test('edges between fields are faint at rest and full strength when an end is selected; the map keeps view and selection', () => withDom(() => {
  const root = new FakeNode('div'), layout = graphLayout(data), field = new Map(layout.nodes.map(node => [node.id, node.field]));
  const map = renderConceptMap(root, {data, state: {}, view: 'graph'});
  openFull(root);
  const paths = root.all(node => node.tagName === 'PATH'), cross = paths.filter(hasClass('cmap-cross'));
  assert.equal(paths.length, layout.edges.length, 'no edge is dropped');
  assert.equal(cross.length, layout.edges.filter(edge => field.get(edge.from) !== field.get(edge.to)).length);
  assert.ok(cross.length > 0 && cross.every(path => !hasClass('cmap-on')(path)));
  const edge = cross[0], end = edge.getAttribute('data-to');
  map.select(end);
  assert.ok(hasClass('cmap-on')(edge) && hasClass('cmap-cross')(edge));
  assert.equal(map.selected, end);assert.equal(map.view, 'graph');
  map.setView('table');assert.equal(map.view, 'table');
  const again = renderConceptMap(new FakeNode('div'), {data, state: {}, view: map.view, selected: map.selected});
  assert.equal(again.view, 'table');assert.equal(again.selected, end);
}));

test('overview counts each real inter-domain prerequisite once, in its original direction', () => {
  const fields = new Map(data.fields.map(field => [field.name, field.id]));
  const conceptField = new Map(data.concepts.map(concept => [concept.id, fields.get(concept.field)]));
  const expected = {};
  for (const {from, to} of graphLayout(data).edges) {
    const a = conceptField.get(from), b = conceptField.get(to);
    if (a !== b) expected[`${a}:${b}`] = (expected[`${a}:${b}`] || 0) + 1;
  }
  const {domains, edges} = domainOverview(data, {'v4-i-eq': {completed: true}});
  assert.deepEqual(domains.map(d => [d.id, d.concepts.length]), [['s2',25],['s3',22],['s4',34],['s5',16],['s6',20],['s7',21],['s8',17],['s9',5],['g1',7],['g2',3]]);
  assert.deepEqual(expected, {'s3:s2':3,'s2:s3':1,'s4:s3':1,'s2:s4':5,'s6:s4':1,'s4:g1':6,'s4:g2':1});
  assert.deepEqual(Object.fromEntries(edges.map(({from,to,count}) => [`${from}:${to}`,count])), expected);
  assert.deepEqual(domains.find(d => d.id === 'g1').marked, {done: 1, total: new Set(domains.find(d => d.id === 'g1').concepts.flatMap(c => c.resources)).size});
  assert.equal(domainOverview(data).domains[0].marked, null);
});

test('focus neighbour sets match every directed edge; outside labels and indirect relations are excluded', () => {
  const {edges} = graphLayout(data);
  for (const {id} of data.concepts) {
    const {before, after} = directNeighbours(data, id);
    assert.deepEqual(before.map(c => c.id), edges.filter(e => e.to === id).map(e => e.from));
    assert.deepEqual(after.map(c => c.id), edges.filter(e => e.from === id).map(e => e.to));
  }
  const {before, after} = directNeighbours(data, named('가우스 NLL의 함정').id);
  assert.deepEqual(before.map(c => c.name), ['음의 로그우도(NLL)', '미분계수·도함수']);
  assert.deepEqual(after, []);
});

test('overview and direct connection keyboard path preserves origin and announces relative direction', () => withDom(() => {
  const root = new FakeNode('div');
  const map = renderConceptMap(root, {data, state: {progress: {}}});
  const domain = id => root.find(node => node.getAttribute('data-domain') === id);
  assert.equal(root.all(hasClass('cmap-domain-node')).length, 10);
  assert.equal(root.all(hasClass('cmap-diagram-edge')).length, 7);
  assert.match(root.find(hasClass('cmap-status')).textContent, /10개 분야.*18개/);
  domain('s2').fire('keydown', {key: 'ArrowDown'});
  assert.equal(document.activeElement, domain('s3'));
  domain('s4').fire('click');
  assert.equal(domain('s4').getAttribute('aria-expanded'), 'true');
  const gauss = named('가우스 NLL의 함정'), node = id => root.find(n => hasClass('cmap-diagram-node')(n) && n.getAttribute('data-id') === id);
  node(gauss.id).fire('click');
  assert.equal(map.selected, gauss.id);
  const centre = () => root.find(hasClass('cmap-focus-centre'));
  assert.equal(document.activeElement, centre());
  assert.match(root.find(hasClass('cmap-empty-side')).textContent, /직접 후속 개념이 없습니다/);
  assert.match(root.find(hasClass('cmap-status')).textContent, /직접 선수 2개, 직접 후속 0개/);
  centre().fire('keydown', {key: 'ArrowLeft'});
  const neighbour = document.activeElement;
  assert.match(neighbour.getAttribute('aria-label'), /가우스 NLL의 함정의 직접 선수/);
  assert.equal(root.all(hasClass('cmap-edge-label')).length, 2);
  assert.ok(root.all(hasClass('cmap-diagram-edge')).every(edge => edge.getAttribute('data-to') === gauss.id && edge.getAttribute('marker-end')));
  neighbour.fire('click');
  assert.equal(map.selected, neighbour.getAttribute('data-id'));
  centre().fire('keydown', {key: 'ArrowRight'});
  assert.match(document.activeElement.getAttribute('aria-label'), /직접 선수로 쓰는 후속 개념/);
  root.find(n => n.tagName === 'BUTTON' && n.textContent === '← 분야 개요').fire('click');
  assert.equal(document.activeElement, node(gauss.id));
  assert.equal(domain('s4').getAttribute('aria-expanded'), 'true');
  root.find(n => n.tagName === 'BUTTON' && n.textContent === '화면 맞춤').fire('click');
  assert.equal(domain('s4').getAttribute('aria-expanded'), 'false');
}));
