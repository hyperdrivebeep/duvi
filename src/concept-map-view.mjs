// 개념 지도 screen: graph view (default) and the outline progress table (design alternative C), sharing one inspector.
// Mount: renderConceptMap(root, {data, state, evidence, onOpenLecture, focusConceptIds, view}).
// Data comes from src/concept-map-data.json; state is the local learning state {progress, records, attempts?};
// evidence is optional {[conceptId]: {commits, testsPassed, testsFailed}}. Missing evidence shows '아직 증거 없음'.
import {
  GRAPH, conceptCounts, conceptGroups, conceptIndex, conceptLectures, conceptResources, fitTransform, graphLayout,
  lectureConcepts, materialLabel, nodesBox, prerequisiteChain, prerequisites, searchConcepts, zoomAt,
} from './concept-map-model.mjs';

export const NO_EVIDENCE = '아직 증거 없음';
export const EVIDENCE_NOTE = '내가 표시는 자기 표시이고, 오른쪽 세 칸은 기록에서 나온 증거입니다';
const MATERIAL_GLYPH = {'자료 있음': '●', 일부: '◐', '자료 없음': '○'};
const SVG = 'http://www.w3.org/2000/svg';

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'className') el.setAttribute('class', value);
    // Through the CSSOM: the app's Content-Security-Policy (style-src 'self') refuses inline style attributes.
    else if (key === 'style') el.style.cssText = value;
    else if (key === 'text') el.textContent = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null && child !== false) el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  return el;
}
const svg = (tag, attrs = {}) => { const el = document.createElementNS(SVG, tag); for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value)); return el; };
// Through the class attribute so it also works on SVG elements (their className is not a string).
const setClass = (el, name, on) => { const names = new Set((el.getAttribute('class') || '').split(' ').filter(Boolean)); if (on) names.add(name); else names.delete(name); el.setAttribute('class', [...names].join(' ')); };

const formatMarked = marked => marked ? `${marked.done} / ${marked.total}` : '-';
const formatQuestions = questions => !questions ? NO_EVIDENCE : questions.total ? `${questions.total} (열린 ${questions.open})` : '없음';
const formatChecks = checks => !checks ? NO_EVIDENCE : checks.total ? `${checks.correct} / ${checks.total} 맞음` : '없음';
const formatWork = work => !work ? NO_EVIDENCE : `커밋 ${work.commits ?? 0} · 테스트 ✓ ${work.testsPassed ?? 0} · ✕ ${work.testsFailed ?? 0}`;
/** Node phrases from the records (questions, checks), or '아직 증거 없음' when neither was supplied. */
function evidenceParts({questions, checks}) {
  const parts = [questions && `질문 ${questions.total}`, checks && `확인 문제 ${checks.total}`].filter(Boolean);
  return parts.length ? parts : [NO_EVIDENCE];
}
const prerequisiteText = (data, concept) => prerequisites(data, concept).map(item => item.name ?? item.label).join(', ') || '-';

function lectureButton(resource, onOpenLecture) {
  return h('button', {type: 'button', className: 'cmap-link', title: resource.title, onClick: () => onOpenLecture?.(resource)}, resource.title);
}

/** Inspector for the selected concept: definition, reason, prerequisite chain, lectures and evidence. */
function renderInspector(root, {data, state, evidence, onOpenLecture, onSelect}, concept) {
  if (!concept) { root.replaceChildren(h('p', {className: 'cmap-muted', text: '개념을 고르면 정의와 먼저 알아야 할 것이 여기에 보입니다.'})); return; }
  const direct = prerequisites(data, concept), chain = prerequisiteChain(data, concept), external = direct.filter(item => item.external);
  const lectures = conceptLectures(data, concept), readings = conceptResources(data, concept).filter(resource => !resource.lectureId);
  const counts = conceptCounts(data, concept, state, evidence);
  const meta = [concept.field, concept.level && `수준 ${concept.level}`, concept.gap ? '커리큘럼에 없음' : `로드맵 v1 판정 ${concept.status}`].filter(Boolean).join(' · ');
  const row = (label, ...value) => [h('dt', {text: label}), h('dd', {}, ...value)];
  root.replaceChildren(
    h('h2', {id: 'cmap-inspector-title', text: concept.name}),
    h('p', {className: 'cmap-muted', text: meta}),
    h('p', {className: 'cmap-definition', text: concept.definition || '정의 없음'}),
    h('dl', {className: 'cmap-facts'},
      concept.why ? row('왜 필요한가', concept.why) : null,
      row('먼저 알아야 할 것', chain.length ? `${concept.name} → ${chain.map(item => item.name).join(' → ')}` : '없음'),
      direct.some(item => item.id) ? row('바로 앞 개념', ...direct.filter(item => item.id).map(item => h('button', {type: 'button', className: 'cmap-link', onClick: () => onSelect(item.id)}, item.name))) : null,
      external.length ? row('지도 밖 선수', external.map(item => item.label).join(', ')) : null,
      row('다루는 강의', ...(lectures.length ? lectures.map(resource => lectureButton(resource, onOpenLecture)) : [concept.gap ? '자료 없음' : '앱에서 재생되는 강의 없음'])),
      readings.length ? row('읽기·실습', ...readings.map(resource => h('a', {href: resource.url, target: '_blank', rel: 'noreferrer', className: 'cmap-link'}, resource.title))) : null,
      row('내가 표시', counts.marked ? `${counts.marked.done} / ${counts.marked.total} 완료로 표시 (자기 표시)` : '-'),
      row('질문', formatQuestions(counts.questions)),
      row('확인 문제', formatChecks(counts.checks)),
      row('커밋·테스트', formatWork(counts.work)),
      concept.gap ? row('출처', `${concept.source}${concept.prerequisiteSource ? ` · 선수 연결: ${concept.prerequisiteSource}` : ''}`) : null,
    ),
  );
}

/** The outline progress table (alternative C). Returns {filter(ids), select(id)}. */
function renderTable(root, {data, state, evidence, onOpenLecture, onSelect}) {
  const rows = new Map(), groups = [];
  const header = h('tr', {}, ...['개념', '먼저 알아야 할 것', '다루는 강의', '자료', '내가 표시', '질문', '확인 문제', '커밋·테스트'].map(text => h('th', {scope: 'col', text})));
  const body = h('tbody');
  for (const group of conceptGroups(data)) {
    const toggle = h('button', {type: 'button', className: 'cmap-disclosure', 'aria-expanded': 'true'},
      `${group.name} · ${group.concepts.length}개${group.gap ? ' · 커리큘럼에 없음' : ''}`);
    const groupRow = h('tr', {className: 'cmap-group'}, h('th', {colspan: 8, scope: 'colgroup'}, toggle));
    const members = group.concepts.map(concept => {
      const counts = conceptCounts(data, concept, state, evidence), lectures = conceptLectures(data, concept);
      const lectureCell = lectures.length
        ? [lectureButton(lectures[0], onOpenLecture), lectures.length > 1 ? h('span', {className: 'cmap-muted', text: ` 외 ${lectures.length - 1}`}) : null]
        : [conceptResources(data, concept).length ? '읽기 자료만' : '-'];
      const tr = h('tr', {'data-id': concept.id, 'aria-selected': 'false'},
        h('th', {scope: 'row'}, h('button', {type: 'button', className: 'cmap-concept', onClick: () => onSelect(concept.id)}, concept.name)),
        h('td', {text: prerequisiteText(data, concept)}),
        h('td', {}, ...lectureCell),
        h('td', {text: materialLabel(data, concept)}),
        h('td', {className: 'cmap-num', text: formatMarked(counts.marked)}),
        h('td', {className: 'cmap-num', text: formatQuestions(counts.questions)}),
        h('td', {className: 'cmap-num', text: formatChecks(counts.checks)}),
        h('td', {text: formatWork(counts.work)}));
      rows.set(concept.id, tr); return tr;
    });
    const entry = {toggle, groupRow, members, ids: group.concepts.map(concept => concept.id), open: true, visible: new Set(group.concepts.map(concept => concept.id))};
    toggle.addEventListener('click', () => { entry.open = !entry.open; sync(entry); });
    groups.push(entry); body.append(groupRow, ...members);
  }
  function sync(entry) {
    entry.toggle.setAttribute('aria-expanded', String(entry.open));
    entry.groupRow.hidden = entry.visible.size === 0;
    entry.members.forEach((tr, index) => { tr.hidden = !entry.open || !entry.visible.has(entry.ids[index]); });
  }
  root.replaceChildren(h('table', {className: 'cmap-table'},
    h('caption', {className: 'cmap-sr', text: '개념별 선수 개념, 다루는 강의, 자료와 진척'}),
    h('colgroup', {}, ...['22%', '15%', '17%', '8%', '8%', '9%', '10%', '11%'].map(width => h('col', {style: `width:${width}`}))),
    h('thead', {}, header), body));
  let selected = null;
  return {
    filter(ids, searching) {
      for (const entry of groups) { entry.visible = new Set(entry.ids.filter(id => ids.has(id))); if (searching) entry.open = true; sync(entry); }
    },
    select(id) {
      if (selected) rows.get(selected)?.setAttribute('aria-selected', 'false');
      selected = id; rows.get(id)?.setAttribute('aria-selected', 'true');
    },
  };
}

/** Graph view: SVG edges + positioned node buttons in one transformed layer. Returns {filter, select, fit, focusCurrent}. */
export function renderConceptGraph(root, {data, state, evidence, onSelect, focusConceptIds} = {}) {
  const layout = graphLayout(data), {byId} = conceptIndex(data), nodeOf = new Map(layout.nodes.map(node => [node.id, node]));
  const edgesLayer = svg('svg', {class: 'cmap-edges', width: layout.width, height: layout.height, 'aria-hidden': 'true'});
  const edgeEls = layout.edges.map(edge => {
    const from = nodeOf.get(edge.from), to = nodeOf.get(edge.to);
    const x1 = from.x + from.width, y1 = from.y + from.height / 2, x2 = to.x, y2 = to.y + to.height / 2, bend = Math.max(48, Math.abs(x2 - x1) / 2);
    // An edge between two fields runs across the bands; it stays faint until one of its ends is selected.
    const cross = from.field !== to.field, names = ['cmap-edge', edge.dashed && 'cmap-dashed', cross && 'cmap-cross'].filter(Boolean).join(' ');
    const path = svg('path', {d: `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`, class: names, 'data-from': edge.from, 'data-to': edge.to});
    edgesLayer.append(path); return {edge, path};
  });
  const bandLabels = layout.bands.map(band => h('h3', {className: 'cmap-band', style: `top:${band.y}px`},
    `${band.field} · ${band.gap ? '커리큘럼에 없음 · 자료 없음' : `자료 있음 ${band.withMaterial}/${band.total}`}`));
  // A name cut off by the ellipsis is shown in full by a tooltip on hover or keyboard focus. Escape hides it from anywhere
  // without moving focus or the pointer (WCAG 1.4.13); the next hover or focus measures and shows it again.
  let tipNode = null;
  const hideTip = event => {
    if (event.key !== 'Escape') return;
    if (tipNode) setClass(tipNode, 'cmap-cut', false);
    tipNode = null; document.removeEventListener('keydown', hideTip);
  };
  const showTip = (button, name) => {
    const cut = name.scrollWidth > name.clientWidth;
    setClass(button, 'cmap-cut', cut);
    if (cut) { tipNode = button; document.addEventListener('keydown', hideTip); }
  };
  const nodeEls = new Map(layout.nodes.map(node => {
    const concept = byId.get(node.id), material = materialLabel(data, concept), counts = conceptCounts(data, concept, state, evidence);
    const materialParts = [material, counts.marked && `내가 표시 ${counts.marked.done}/${counts.marked.total}`].filter(Boolean), records = evidenceParts(counts);
    // The visible lines give the name no break between them and the glyph is decoration, so the node is named by its phrases.
    // No title: next to the aria-label a screen reader reads it again as the description. The tooltip is aria-hidden
    // for the same reason: the aria-label already carries the full name.
    const name = h('span', {className: 'cmap-node-name', text: concept.name});
    const button = h('button', {type: 'button', className: 'cmap-node', 'data-id': node.id, 'aria-pressed': 'false',
      'aria-label': [concept.name, ...materialParts, ...records].join(', '),
      style: `left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px`, onClick: () => onSelect?.(node.id),
      onMouseenter: () => showTip(button, name), onFocus: () => showTip(button, name)},
    name,
    h('span', {className: 'cmap-node-line', text: `${MATERIAL_GLYPH[material]} ${materialParts.join(' · ')}`}),
    h('span', {className: 'cmap-node-line cmap-muted', text: records.join(' · ')}),
    h('span', {className: 'cmap-node-tip', 'aria-hidden': 'true', text: concept.name}));
    return [node.id, button];
  }));
  const layer = h('div', {className: 'cmap-layer', style: `width:${layout.width}px;height:${layout.height}px`}, edgesLayer, ...bandLabels, ...nodeEls.values());
  const note = h('p', {className: 'cmap-fit-note', role: 'status'});
  const focusIds = (focusConceptIds || []).filter(id => nodeOf.has(id));
  const control = (label, glyph, action, extra = {}) => h('button', {type: 'button', className: 'cmap-control', 'aria-label': label, title: label, onClick: action, ...extra}, h('span', {'aria-hidden': 'true', text: glyph}), extra.showText ? h('span', {text: label}) : null);
  const controls = h('div', {className: 'cmap-controls', role: 'group', 'aria-label': '그래프 보기 조절'},
    control('화면 맞춤', '⛶', () => fit(), {showText: true}),
    focusConceptIds ? control('지금 강의 개념으로', '◎', () => focusCurrent(), {showText: true, disabled: focusIds.length ? null : true}) : null,
    control('확대', '+', () => zoomBy(1.25)), control('축소', '−', () => zoomBy(0.8)));
  const legend = h('div', {className: 'cmap-legend'},
    h('span', {}, h('span', {className: 'cmap-legend-line', 'aria-hidden': 'true'}), '실선: 자료가 있는 개념으로 이어짐'),
    h('span', {}, h('span', {className: 'cmap-legend-line cmap-dashed', 'aria-hidden': 'true'}), '점선: 자료가 없는 개념으로 이어짐'),
    h('span', {}, h('span', {className: 'cmap-legend-line cmap-cross', 'aria-hidden': 'true'}), '흐린 선: 다른 분야로 이어짐 · 개념을 고르면 진해짐'),
    h('span', {className: 'cmap-muted', text: '선은 선수 개념에서 그 개념이 필요한 개념으로 갑니다'}));
  const viewport = h('section', {className: 'cmap-graph', tabindex: '0', 'aria-label': '개념 그래프. 더하기·빼기로 확대·축소, 0으로 화면 맞춤, 화살표로 이동, Tab으로 개념 이동'}, layer, legend, controls, note);
  root.replaceChildren(viewport);

  let transform = {scale: 1, x: 0, y: 0}, selected = null;
  const size = () => ({width: viewport.clientWidth || 1100, height: viewport.clientHeight || 700});
  const apply = () => { layer.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`; };
  const centre = () => { const {width, height} = size(); return {x: width / 2, y: height / 2}; };
  // A fit note describes the last fit; moving the view by hand clears it.
  function zoomBy(factor, point = centre()) { transform = zoomAt(transform, factor, point); note.textContent = ''; apply(); }
  function panBy(dx, dy) { transform = {...transform, x: transform.x + dx, y: transform.y + dy}; note.textContent = ''; apply(); }
  /** Fit a box; below the readable scale keep GRAPH.minReadableScale and align its top-left instead. */
  function fitBox(box, maxScale = 1.5) {
    // 64px padding keeps the fit note above the fitted box.
    const next = fitTransform(box, size(), 64, maxScale), readable = next.scale >= GRAPH.minReadableScale, scale = GRAPH.minReadableScale;
    transform = readable ? next : {scale, x: 24 - box.x * scale, y: 64 - box.y * scale};
    apply(); return readable;
  }
  function fit() {
    const whole = {x: 0, y: 0, width: layout.width, height: layout.height};
    if (fitTransform(whole, size()).scale >= GRAPH.minReadableScale) { fitBox(whole); note.textContent = ''; return; }
    const field = (selected && nodeOf.get(selected).field) || (focusIds[0] && nodeOf.get(focusIds[0]).field) || layout.bands[0].field;
    const fits = fitBox(layout.bands.find(band => band.field === field));
    note.textContent = `전체를 맞추면 글자가 너무 작아져 '${field}' 분야${fits ? '에 맞췄습니다' : '의 왼쪽부터 보여 줍니다'}. 축소(−)로 더 넓게 볼 수 있습니다.`;
  }
  function focusCurrent() {
    if (!focusIds.length) return;
    // Include the band heading row above the concepts so it is not left under the note line.
    const box = nodesBox(focusIds.map(id => nodeOf.get(id))), ok = fitBox({...box, y: box.y - GRAPH.bandHeader, height: box.height + GRAPH.bandHeader}, 1);
    note.textContent = ok ? `지금 강의의 개념 ${focusIds.length}개로 옮겼습니다.` : `지금 강의의 개념 ${focusIds.length}개가 화면보다 넓게 퍼져 있어 첫 개념부터 보입니다.`;
  }
  function reveal(id) {
    const node = nodeOf.get(id), {width, height} = size(), left = transform.x + node.x * transform.scale, top = transform.y + node.y * transform.scale;
    if (left < 0 || top < 0 || left + node.width * transform.scale > width || top + node.height * transform.scale > height)
      panBy(width / 2 - (left + node.width * transform.scale / 2), height / 2 - (top + node.height * transform.scale / 2));
  }

  viewport.addEventListener('keydown', event => {
    const step = 80, keys = {ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step]};
    if (event.key === '+' || event.key === '=') zoomBy(1.25);
    else if (event.key === '-' || event.key === '_') zoomBy(0.8);
    else if (event.key === '0') fit();
    else if (keys[event.key]) panBy(...keys[event.key]);
    else return;
    event.preventDefault();
  });
  viewport.addEventListener('focusin', event => { const id = event.target?.getAttribute?.('data-id'); if (id) reveal(id); });
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect(), point = {x: event.clientX - rect.left, y: event.clientY - rect.top};
    if (event.ctrlKey || event.metaKey) zoomBy(Math.exp(-event.deltaY / 300), point); else panBy(-event.deltaX, -event.deltaY);
  }, {passive: false});
  let drag = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest?.('.cmap-node, .cmap-controls, .cmap-legend')) return;
    drag = {x: event.clientX, y: event.clientY}; viewport.setPointerCapture?.(event.pointerId); setClass(viewport, 'cmap-dragging', true);
  });
  viewport.addEventListener('pointermove', event => { if (!drag) return; panBy(event.clientX - drag.x, event.clientY - drag.y); drag = {x: event.clientX, y: event.clientY}; });
  const endDrag = () => { drag = null; setClass(viewport, 'cmap-dragging', false); };
  viewport.addEventListener('pointerup', endDrag); viewport.addEventListener('pointercancel', endDrag);

  apply();
  // Fit once the viewport has a size; without ResizeObserver (tests) fit to the default size right away.
  if (viewport.clientWidth || !globalThis.ResizeObserver) fit();
  else { const observer = new ResizeObserver(() => { if (viewport.clientWidth) { observer.disconnect(); fit(); } }); observer.observe(viewport); }
  return {
    fit, focusCurrent, zoomBy, get transform() { return transform; }, viewport,
    filter(ids, searching) { for (const [id, el] of nodeEls) setClass(el, 'cmap-dim', searching && !ids.has(id)); },
    select(id, {reveal: show = true} = {}) {
      if (selected) nodeEls.get(selected)?.setAttribute('aria-pressed', 'false');
      selected = id; nodeEls.get(id)?.setAttribute('aria-pressed', 'true');
      for (const {edge, path} of edgeEls) {
        const on = edge.from === id || edge.to === id;
        setClass(path, 'cmap-on', on); setClass(path, 'cmap-faint', !!id && !on);
      }
      if (id && show) reveal(id);
    },
  };
}

/**
 * Full 개념 지도 page: header (search, 그래프/표 toggle, evidence note), graph or table, and the inspector.
 * Returns {select(id), setView('graph'|'table'), search(query), view, selected}; the shell re-mounts with view and selected.
 */
export function renderConceptMap(root, {data, state = {}, evidence, onOpenLecture, focusConceptIds, view = 'graph', selected: initial = null} = {}) {
  const total = data.concepts.length, gaps = data.concepts.filter(concept => concept.gap).length;
  const search = h('input', {type: 'search', className: 'cmap-search', placeholder: '개념 찾기', 'aria-label': '개념 찾기'});
  const status = h('p', {className: 'cmap-status', role: 'status'});
  const viewButtons = Object.fromEntries([['graph', '그래프'], ['table', '표']].map(([key, label]) => [key, h('button', {type: 'button', className: 'cmap-view', 'aria-pressed': 'false', onClick: () => setView(key)}, label)]));
  const main = h('div', {className: 'cmap-main'}), inspector = h('aside', {className: 'cmap-inspector', 'aria-labelledby': 'cmap-inspector-title', 'aria-live': 'polite'});
  root.replaceChildren(h('div', {className: 'cmap'},
    h('header', {className: 'cmap-head'},
      h('div', {className: 'cmap-title'}, h('h1', {text: '개념 지도'}), h('p', {className: 'cmap-muted', text: `개념 ${total}개 · 그중 ${gaps}개는 커리큘럼에 자료가 없습니다`})),
      h('div', {className: 'cmap-toolbar'}, h('div', {className: 'cmap-switch', role: 'group', 'aria-label': '보기'}, viewButtons.graph, viewButtons.table), search),
      h('p', {className: 'cmap-note', text: EVIDENCE_NOTE}), status),
    main, inspector));
  let current = null, selected = null, query = '';
  const select = id => {
    selected = id; current?.select(id);
    renderInspector(inspector, {data, state, evidence, onOpenLecture, onSelect: select}, id ? conceptIndex(data).byId.get(id) : null);
  };
  function applySearch() {
    const ids = new Set(searchConcepts(data, query)), searching = !!query.trim();
    current?.filter(ids, searching);
    status.textContent = !searching ? '' : ids.size ? `'${query.trim()}' 개념 ${ids.size}개` : `'${query.trim()}'에 맞는 개념이 없습니다. 이름 일부나 영어 약어(TOST, NLL)로 찾아 보세요.`;
    return ids;
  }
  function setView(next) {
    view = next;
    for (const [key, button] of Object.entries(viewButtons)) button.setAttribute('aria-pressed', String(key === view));
    const options = {data, state, evidence, onOpenLecture, onSelect: select, focusConceptIds};
    current = view === 'table' ? renderTable(main, options) : renderConceptGraph(main, options);
    setClass(main, 'cmap-main-table', view === 'table');
    applySearch(); if (selected) current.select(selected);
  }
  search.addEventListener('input', () => { query = search.value; applySearch(); });
  search.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const [first] = applySearch(); if (first && query.trim()) select(first);
  });
  setView(view); select(initial);
  return {select, setView, search(text) { search.value = text; query = text; return applySearch(); }, get view() { return view; }, get selected() { return selected; }};
}

/** Lecture panel tab: the concepts this lecture is linked to, each opening its place in the map. */
export function renderLectureConcepts(root, {data, state = {}, lectureId, onOpenConcept} = {}) {
  const concepts = lectureConcepts(data, lectureId);
  if (!concepts.length) { root.replaceChildren(h('p', {className: 'cmap-muted', text: '이 강의에 연결된 개념이 아직 없습니다.'})); return; }
  root.replaceChildren(h('div', {className: 'cmap-lecture'},
    h('h2', {text: `이 강의의 개념 ${concepts.length}개`}),
    h('ul', {}, ...concepts.map(concept => {
      const {questions} = conceptCounts(data, concept, state);
      return h('li', {}, h('button', {type: 'button', className: 'cmap-link', onClick: () => onOpenConcept?.(concept.id)}, concept.name),
        h('span', {className: 'cmap-muted', text: `${concept.field} · ${questions ? `질문 ${questions.total}` : `질문 ${NO_EVIDENCE}`}`}));
    }))));
}
