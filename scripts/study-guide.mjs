// Builds docs/STUDY_GUIDE.md from the concept map, the roadmap and scripts/study-guide-data.json.
// Usage: node scripts/study-guide.mjs          (write the guide)
//        node scripts/study-guide.mjs --check  (exit 1 when the committed guide is out of date)
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {ROADMAP} from '../src/learning-roadmap.mjs';

const project = new URL('../', import.meta.url);
export const GUIDE = fileURLToPath(new URL('docs/STUDY_GUIDE.md', project));

/** Concept rows of R-019 sections 2-9, with the area heading, reason and level. */
export function conceptRows(markdown) {
  const rows = [];
  let area = null, header = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^## (\d+)\. (.+)$/);
    if (heading) { const number = Number(heading[1]); area = number >= 2 && number <= 9 ? heading[2].replace(/ \(.*\)$/, '') : null; header = null; continue; }
    if (!area || !line.startsWith('| ')) continue;
    const cells = line.replace(/^\|\s|\s\|$/g, '').split(' | ').map(cell => cell.trim());
    if (cells[0] === '개념') { header = cells; continue; }
    if (!header || line.startsWith('|---')) continue;
    const at = name => header.indexOf(name);
    const why = cells[at('설계에서 왜 필요')] ?? cells[at('내용')] ?? '';
    rows.push({area, name: cells[0].replace(/\*\*/g, ''), why: why.replace(/\*\*/g, ''), level: cells[at('수준')] ?? ''});
  }
  return rows;
}

const linkText = text => text.replace(/([\[\]])/g, '\\$1');
const phaseLabel = phase => `${phase.title.split('.')[0]}단계(${phase.weeks})`;

export function buildStudyGuide({conceptMap, roadmap = ROADMAP, data}) {
  const concepts = conceptRows(conceptMap);
  const resources = new Map(), phaseOf = new Map(), byConcept = new Map();
  for (const phase of roadmap.phases) for (const resource of phase.resources) {
    if (!resources.has(resource.id)) { resources.set(resource.id, resource); phaseOf.set(resource.id, phase); }
    for (const name of resource.concepts || []) byConcept.set(name, [...(byConcept.get(name) || []), resource.id]);
  }
  const exercisePhase = id => roadmap.phases.find(phase => phase.id === id);
  const missing = concepts.filter(concept => !data.concepts[concept.name]).map(concept => concept.name);
  if (missing.length) throw new Error(`study-guide-data.json has no entry for: ${missing.join(', ')}`);
  const isNew = resource => Array.isArray(resource.concepts);
  const isVideo = resource => resource.kind === 'video';

  const entries = concepts.map(concept => {
    const items = [], seen = new Set();
    const add = id => {
      if (seen.has(id)) return; const resource = resources.get(id);
      if (!resource) throw new Error(`Unknown roadmap resource ${id} for ${concept.name}`);
      seen.add(id); items.push(resource);
    };
    const groups = [], exercises = [];
    for (const ref of data.concepts[concept.name].resources) {
      if (typeof ref === 'string') add(ref);
      else if (ref.exercise) exercises.push(ref);
      else { groups.push({label: ref.label, items: ref.ids.map(id => resources.get(id))}); ref.ids.forEach(id => seen.add(id)); }
    }
    for (const id of byConcept.get(concept.name) || []) add(id);
    const all = [...items, ...groups.flatMap(group => group.items)];
    const videoBefore = all.some(resource => isVideo(resource) && resource.lectureId && !isNew(resource));
    const videoAfter = all.some(resource => isVideo(resource) && resource.lectureId);
    return {...concept, status: data.concepts[concept.name].status, items, groups, exercises, videoBefore, videoAfter, reading: all.some(resource => !resource.lectureId)};
  });

  const lines = [];
  const resourceLine = resource => {
    const youtube = resource.lectureId?.startsWith('yt_') ? resource.lectureId.slice(3) : null;
    const length = youtube && data.durations[youtube] ? `, ${data.durations[youtube]}` : '';
    const where = resource.lectureId ? '앱에서 재생' : resource.kind === 'video' ? '외부 영상' : resource.kind === 'exercise' ? '실습' : '읽기';
    return `[${linkText(resource.title)}](${resource.url}) (${where}${length}) · ${phaseLabel(phaseOf.get(resource.id))}${isNew(resource) ? ' · **신규**' : ''}`;
  };
  const areas = [...new Set(entries.map(entry => entry.area))];
  const newVideos = [...resources.values()].filter(isNew);
  lines.push('# 공부 가이드: 필요한 개념 체크리스트와 강의 목록', '',
    '> 이 문서는 `npm run docs:study-guide`로 만든다. 직접 고치지 말고 [개념 지도](CONCEPT_MAP.md), 로드맵 소스 [`src/learning-roadmap.mjs`](../src/learning-roadmap.mjs),',
    '> 개념-자료 대응표 [`scripts/study-guide-data.json`](../scripts/study-guide-data.json)을 고친 뒤 다시 만든다. 일정의 정본은 로드맵이다.',
    `> 로드맵 버전 ${roadmap.version} · Glorious 정본 커밋 \`${roadmap.source.commit}\`. 개인 학습 기록은 담지 않는다.`, '',
    '## 이 가이드를 쓰는 법', '',
    '비유하면 이 문서는 **요리책 맨 앞의 재료 체크리스트**다. 이미 집에 있는 재료(아는 개념)는 체크하고 넘어가고, 없는 재료만 사러(공부하러) 간다.', '',
    '1. 큰 분야 → 개념 순서로 읽는다. 개념마다 "왜 필요한가"가 이 프로젝트의 모델 설계와 어떻게 이어지는지 한 줄로 적혀 있다.',
    '2. 이미 아는 개념은 `[ ]`를 `[x]`로 바꿔 건너뛴다. **체크는 개인 사본(내 PC나 클라우드 메모)에서 한다.** 체크한 사본을 공개 Duvi 저장소에 올리지 않는다.',
    '3. 모르는 개념은 "영상"부터 본다. "앱에서 재생"은 Duvi 학습 로드맵의 해당 단계에서 열면 영어·한국어 자막과 시점 질문을 쓸 수 있다.',
    '4. 영상이 어렵거나 더 깊이 알고 싶으면 "읽기·실습"으로 간다. 각 자료 뒤의 "2B단계(10–13주)" 같은 표시가 로드맵에서 그 자료를 만나는 시기다.',
    '5. "직접 해 보기"는 그 단계의 손계산·코드 과제다. 영상만 보고 체크하지 말고 과제를 도움 없이 해 본 뒤 체크한다.', '',
    '"신규"는 로드맵 버전 3에서 읽기로만 배우던 개념을 채우려고 더한 해설 영상이다. 영상 제목과 존재·삽입 허용은 YouTube oEmbed로 확인했지만, 영상 전체를 보고 내용을 검수하지는 않았다.', '',
    '## 한눈에 보기', '',
    `개념 ${entries.length}개(R-019 2~9절), 연결된 로드맵 자료 ${resources.size}개, 그중 신규 해설 영상 ${newVideos.length}개.`,
    '"영상 있음"은 앱에서 재생되는 영상이 하나 이상 연결된 개념, "읽기만"은 외부 읽기·실습 자료로만 연결된 개념이다. 전(v2)은 신규 영상을 빼고 센 값이다.', '',
    '| 분야 | 개념 | 영상 있음 (전 → 후) | 읽기만 (전 → 후) | 과제 문구만 |', '|---|---|---|---|---|');
  const count = (rows, test) => rows.filter(test).length;
  for (const area of [...areas, null]) {
    const rows = area ? entries.filter(entry => entry.area === area) : entries;
    const before = count(rows, entry => entry.videoBefore), after = count(rows, entry => entry.videoAfter);
    const readBefore = count(rows, entry => !entry.videoBefore && entry.reading), readAfter = count(rows, entry => !entry.videoAfter && entry.reading);
    const only = count(rows, entry => !entry.videoAfter && !entry.reading);
    const label = area ?? '**합계**';
    lines.push(`| ${label} | ${rows.length} | ${before} → ${after} | ${readBefore} → ${readAfter} | ${only} |`);
  }
  for (const area of areas) {
    lines.push('', `## ${area}`, '');
    for (const entry of entries.filter(row => row.area === area)) {
      lines.push(`- [ ] **${entry.name}** · 수준 ${entry.level || '-'} · v1 판정 ${entry.status}`);
      lines.push(`  - 왜 필요한가: ${entry.why || '개념 지도 원문 참조'}`);
      const videos = entry.items.filter(resource => resource.kind === 'video'), others = entry.items.filter(resource => resource.kind !== 'video');
      const sorted = [...videos.filter(isNew), ...videos.filter(resource => !isNew(resource))];
      if (sorted.length) { lines.push('  - 영상'); for (const resource of sorted) lines.push(`    - ${resourceLine(resource)}`); }
      for (const group of entry.groups) {
        const phase = phaseOf.get(group.items[0].id);
        lines.push(`  - ${group.label} · ${phaseLabel(phase)}: ${group.items.map((resource, index) => `[${index + 1}](${resource.url})`).join(' ')}`);
      }
      if (others.length) { lines.push('  - 읽기·실습'); for (const resource of others) lines.push(`    - ${resourceLine(resource)}`); }
      for (const exercise of entry.exercises) { const phase = exercisePhase(exercise.exercise); lines.push(`  - 직접 해 보기: ${phaseLabel(phase)}의 과제 — ${exercise.label}`); }
    }
  }
  lines.push('', '## 확인 범위', '',
    '- 개념 이름·"왜 필요한가"·수준은 [개념 지도](CONCEPT_MAP.md)의 R-019 원문 표에서 그대로 가져왔다.',
    '- 개념별 자료는 R-020 3절 표(로드맵 v1 기준 판정과 보충 링크)와 로드맵 버전 3의 신규 영상 `concepts` 표시로 연결했다. 제목·과제 문구 기준의 대응이며 영상 내용 대조가 아니다.',
    '- 길이는 신규 영상만 2026-11-18 YouTube 검색 결과에서 기록했다. 다른 자료의 길이는 앱에서 처음 열 때 확인된다.', '');
  return lines.join('\n');
}

async function main() {
  const [conceptMap, data] = await Promise.all([
    readFile(new URL('docs/CONCEPT_MAP.md', project), 'utf8'),
    readFile(new URL('scripts/study-guide-data.json', project), 'utf8').then(JSON.parse),
  ]);
  const guide = buildStudyGuide({conceptMap, data});
  if (process.argv.includes('--check')) {
    const current = (await readFile(GUIDE, 'utf8').catch(() => '')).replace(/\r\n/g, '\n');
    if (current !== guide) { console.error('docs/STUDY_GUIDE.md is out of date. Run npm run docs:study-guide.'); process.exitCode = 1; }
    return;
  }
  await writeFile(GUIDE, guide);
}
if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) await main();
