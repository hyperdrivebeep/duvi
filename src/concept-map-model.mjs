// Pure helpers for the 개념 지도 screen. Input: src/concept-map-data.json and the learner's local state.
// Evidence that was not supplied is null ("아직 증거 없음"), never 0: 0 means "looked and found none".
import {isOpenQuestion, resourceCompleted} from './learning-model.mjs';

const cleanName = text => text.replace(/\([^)]*\)/g, '').trim();
// "우도·최대우도(MLE)" -> ['우도', '최대우도', 'MLE']
const parts = name => name.split(/[·,]/).flatMap(part => [cleanName(part), ...[...part.matchAll(/\(([^)]*)\)/g)].map(match => match[1].trim())]).filter(Boolean);

const indexes = new WeakMap();
export function conceptIndex(data) {
  if (!indexes.has(data)) indexes.set(data, {
    byId: new Map(data.concepts.map(concept => [concept.id, concept])),
    resources: new Map(data.resources.map(resource => [resource.id, resource])),
    roadmap: {phases: [{resources: data.resources}]},
  });
  return indexes.get(data);
}

/** Fields in data order with their concepts; gap fields keep `gap` and `source`. */
export function conceptGroups(data) {
  return data.fields.map(field => ({...field, concepts: data.concepts.filter(concept => concept.field === field.name)}));
}

/**
 * Resolve a prerequisite label from R-019 ("도함수", "변수", "적분(개념)") to a concept:
 * exact name, then a `·`-separated part or bracketed alias of a name (MLE), then a compound word starting with the
 * label (함수 -> 함수와 그래프, 지수 -> 지수법칙), then a last word (분포 -> 가우스 분포), then a first word
 * (베이즈 -> 베이즈 정리, 선형 사상 -> 선형 사상 vs 아핀). A concept never resolves to itself. Same-field concepts are searched first; a compound
 * label ("지수·로그") falls back to its first part. Anything else is external (고교 과목, 합성함수, 표준오차).
 */
export function resolvePrerequisite(data, label, field, selfId) {
  const find = wanted => {
    const tiers = [
      concept => cleanName(concept.name) === wanted,
      concept => parts(concept.name).includes(wanted),
      concept => parts(concept.name).some(part => part.length > wanted.length && part.startsWith(wanted) && part[wanted.length] !== ' '),
      concept => parts(concept.name).some(part => part.endsWith(` ${wanted}`)),
      concept => parts(concept.name).some(part => part.startsWith(`${wanted} `)),
    ];
    const others = data.concepts.filter(concept => concept.id !== selfId);
    for (const pool of [others.filter(concept => concept.field === field), others.filter(concept => concept.field !== field)])
      for (const test of tiers) { const match = pool.find(test); if (match) return match; }
    return null;
  };
  const wanted = cleanName(label);
  const match = data.concepts.find(concept => concept.name === label && concept.id !== selfId) || find(wanted) || (wanted.includes('·') && find(wanted.split('·')[0]));
  return match ? {label, id: match.id, name: match.name} : {label, external: true};
}

export function prerequisites(data, concept) {
  return concept.prerequisites.map(label => resolvePrerequisite(data, label, concept.field, concept.id));
}

/** First-prerequisite chain down to a concept with no known prerequisite: 연쇄법칙 → 도함수 → 일차함수·기울기 → … */
export function prerequisiteChain(data, concept) {
  const {byId} = conceptIndex(data), chain = [], seen = new Set([concept.id]);
  for (let current = concept; ;) {
    const next = prerequisites(data, current).find(item => item.id && !seen.has(item.id));
    if (!next) break;
    seen.add(next.id); current = byId.get(next.id); chain.push(current);
  }
  return chain;
}

export function conceptResources(data, concept) {
  const {resources} = conceptIndex(data);
  return concept.resources.map(id => resources.get(id)).filter(Boolean);
}
export const conceptLectures = (data, concept) => conceptResources(data, concept).filter(resource => resource.lectureId);

/** '자료 있음' when an app-playable lecture is linked, '일부' for reading/exercise links only, '자료 없음' otherwise. */
export function materialLabel(data, concept) {
  const linked = conceptResources(data, concept);
  return !linked.length ? '자료 없음' : linked.some(resource => resource.lectureId) ? '자료 있음' : '일부';
}

/**
 * Per-concept counts.
 * - marked: self-marked completion of linked resources {done,total} (one per lecture); null without linked resources or progress.
 * - questions: records anchored on the concept's lectures {total,open}; null without lectures or records.
 * - checks: attempts [{conceptId, correct}] {total,correct}; null when attempts were not supplied.
 * - work: evidence {[conceptId]: {commits, testsPassed, testsFailed}}; null when the concept has no entry.
 */
export function conceptCounts(data, concept, {progress, records, attempts} = {}, evidence) {
  const {roadmap} = conceptIndex(data), linked = conceptResources(data, concept);
  const seen = new Set(), unique = linked.filter(resource => { const key = resource.lectureId ? `lecture:${resource.lectureId}` : resource.id; return !seen.has(key) && seen.add(key); });
  const marked = progress && unique.length ? {done: unique.filter(resource => resourceCompleted(roadmap, progress, resource)).length, total: unique.length} : null;
  const lectureIds = new Set(linked.filter(resource => resource.lectureId).map(resource => resource.lectureId));
  const anchored = records && lectureIds.size ? records.filter(record => lectureIds.has(String(record.anchor?.lectureId))) : null;
  const questions = anchored && {total: anchored.length, open: anchored.filter(isOpenQuestion).length};
  const tried = attempts ? attempts.filter(attempt => attempt.conceptId === concept.id) : null;
  const checks = tried && {total: tried.length, correct: tried.filter(attempt => attempt.correct === true).length};
  const work = evidence?.[concept.id] ?? null;
  return {marked, questions, checks, work};
}

/** Concept ids whose name, definition, reason or field contains every word of the query. */
export function searchConcepts(data, query) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return data.concepts.map(concept => concept.id);
  return data.concepts.filter(concept => {
    const text = [concept.name, concept.definition, concept.why, concept.field].join(' ').toLowerCase();
    return words.every(word => text.includes(word));
  }).map(concept => concept.id);
}

/** Concepts linked to a lecture (app lecture id, e.g. "1" or "yt_…"), in map order. */
export function lectureConcepts(data, lectureId) {
  const ids = new Set(data.resources.filter(resource => resource.lectureId === String(lectureId)).map(resource => resource.id));
  return data.concepts.filter(concept => concept.resources.some(id => ids.has(id)));
}

// minReadableScale: below 0.8 the 14px node text renders under ~11px, so fit falls back to one field.
export const GRAPH = Object.freeze({maxRows: 5, nodeWidth: 256, nodeHeight: 84, columnGap: 72, rowGap: 14, bandGap: 40, bandHeader: 40, minReadableScale: 0.8});

/**
 * Deterministic layout for the graph view. Edges run from a prerequisite to the concept that needs it and exist only
 * when the prerequisite resolves to a concept id; dashed when the target concept has no material ('자료 없음').
 * Column = longest resolved prerequisite path; each field is a horizontal band labelled with its material count, its
 * depth columns left to right (a column taller than maxRows wraps into sub-columns).
 */
export function graphLayout(data) {
  const {byId} = conceptIndex(data), {maxRows, nodeWidth, nodeHeight, columnGap, rowGap, bandGap, bandHeader} = GRAPH;
  const incoming = new Map(data.concepts.map(concept => [concept.id, [...new Set(prerequisites(data, concept).filter(item => item.id).map(item => item.id))]]));
  const depth = new Map();
  const columnOf = (id, path = new Set()) => {
    if (depth.has(id)) return depth.get(id);
    if (path.has(id)) return 0;
    path.add(id);
    const column = Math.max(-1, ...incoming.get(id).map(from => columnOf(from, path))) + 1;
    path.delete(id); depth.set(id, column); return column;
  };
  data.concepts.forEach(concept => columnOf(concept.id));
  const nodes = [], bands = [];
  let top = 0;
  for (const group of conceptGroups(data)) {
    const stacks = new Map();
    for (const concept of group.concepts) { const column = depth.get(concept.id); stacks.set(column, [...(stacks.get(column) || []), concept]); }
    // A tall depth column wraps into side-by-side sub-columns of at most maxRows nodes; columns keep depth order.
    const columns = [...stacks.keys()].sort((x, y) => x - y), lanes = column => Math.ceil(stacks.get(column).length / maxRows);
    const rows = Math.max(1, ...columns.map(column => Math.ceil(stacks.get(column).length / lanes(column))));
    let left = 0;
    for (const column of columns) {
      const stack = stacks.get(column), perLane = Math.ceil(stack.length / lanes(column));
      stack.forEach((concept, index) => nodes.push({
        id: concept.id, field: group.name, column, x: left + Math.floor(index / perLane) * (nodeWidth + rowGap),
        y: top + bandHeader + (index % perLane) * (nodeHeight + rowGap), width: nodeWidth, height: nodeHeight,
      }));
      left += lanes(column) * (nodeWidth + rowGap) - rowGap + columnGap;
    }
    const height = bandHeader + rows * (nodeHeight + rowGap) - rowGap;
    const withMaterial = group.concepts.filter(concept => materialLabel(data, concept) !== '자료 없음').length;
    bands.push({field: group.name, gap: !!group.gap, x: 0, y: top, width: left - columnGap, height, total: group.concepts.length, withMaterial});
    top += height + bandGap;
  }
  const edges = [...incoming].flatMap(([to, froms]) => froms.map(from => ({from, to, dashed: materialLabel(data, byId.get(to)) === '자료 없음'})));
  const width = Math.max(...nodes.map(node => node.x + node.width));
  return {nodes, edges, bands, width, height: top - bandGap};
}

/** Scale (at most maxScale) and offset that fit a box ({x,y,width,height}) into the viewport with padding, centred. */
export function fitTransform(box, viewport, padding = 24, maxScale = 1.5) {
  const scale = Math.min((viewport.width - padding * 2) / box.width, (viewport.height - padding * 2) / box.height, maxScale);
  return {scale, x: (viewport.width - box.width * scale) / 2 - box.x * scale, y: (viewport.height - box.height * scale) / 2 - box.y * scale};
}

/** Zoom by a factor while the screen point stays over the same graph point. */
export function zoomAt(transform, factor, point, limits = {min: 0.2, max: 2.5}) {
  const scale = Math.min(limits.max, Math.max(limits.min, transform.scale * factor)), ratio = scale / transform.scale;
  return {scale, x: point.x - (point.x - transform.x) * ratio, y: point.y - (point.y - transform.y) * ratio};
}

/** Bounding box of some nodes (e.g. one field, or the current lecture's concepts). */
export function nodesBox(nodes) {
  const left = Math.min(...nodes.map(node => node.x)), top = Math.min(...nodes.map(node => node.y));
  return {x: left, y: top, width: Math.max(...nodes.map(node => node.x + node.width)) - left, height: Math.max(...nodes.map(node => node.y + node.height)) - top};
}

/**
 * Quiz attempts (learning state `attempts`) as the map counts them: [{conceptId, correct}]. An attempt counts for the
 * concepts its question names (a concept id or full name); when it names none on the map, for every concept of its
 * lecture, the same rule the map uses for questions.
 */
export function attemptsByConcept(data, attempts = []) {
  const byName = new Map(data.concepts.flatMap(concept => [[concept.id.toLowerCase(), concept.id], [concept.name.toLowerCase(), concept.id]]));
  return attempts.flatMap(attempt => {
    const named = [...new Set((attempt.item?.concepts || []).map(name => byName.get(String(name).trim().toLowerCase())).filter(Boolean))];
    const ids = named.length ? named : lectureConcepts(data, attempt.lectureId).map(concept => concept.id);
    return ids.map(conceptId => ({conceptId, correct: attempt.result === 'right'}));
  });
}

/**
 * Repository evidence (GET /api/learning/evidence) per concept: {[conceptId]: {commits, testsPassed, testsFailed}}. A commit
 * subject or test-case name counts for a concept only when it contains the concept's id or full name; nothing is inferred
 * beyond that. Concepts no commit or test names get no entry ('아직 증거 없음'); without a configured repository, none do.
 */
export function evidenceByConcept(data, evidence) {
  if (!evidence?.configured) return undefined;
  const commits = evidence.repos.flatMap(repo => repo.commits || []).map(row => String(row.subject).toLowerCase());
  const cases = evidence.repos.flatMap(repo => (repo.tests || []).flatMap(file => file.cases || [])).map(row => ({name: String(row.name).toLowerCase(), status: row.status}));
  const result = {};
  for (const concept of data.concepts) {
    const keys = [concept.id, concept.name].map(key => key.toLowerCase()), hit = text => keys.some(key => text.includes(key));
    const commitCount = commits.filter(hit).length, named = cases.filter(row => hit(row.name));
    if (commitCount || named.length) result[concept.id] = {commits: commitCount, testsPassed: named.filter(row => row.status === 'passed').length, testsFailed: named.filter(row => row.status === 'failed').length};
  }
  return result;
}
