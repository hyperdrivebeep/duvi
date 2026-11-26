import {el, button, link} from './learning-dom.mjs';
import {resourceCompleted} from './learning-model.mjs';
import {stageCheck, studyCards, missingPrerequisites, requiredPhaseCards} from './curriculum-v4-model.mjs';

const labels = {required: '필수', recommended: '권장', optional: '선택'};
const text = (root, label, value) => { if (value) root.append(el('p', 'learning-preserve', `${label}${value}`)); };
const sectionNames = {
  actions: 'Hugging Face · 에이전트의 행동과 도구 호출',
  observations: 'Hugging Face · 도구 반환과 관측',
  'scoring-workflow.html': 'Inspect · 채점 절차와 재채점',
  'setting-limits.html': 'Inspect · 실행 한도 설정',
  'evaluation-protocols-and-metrics': 'ContinualAI · 평가 절차와 지표',
  monitoring: 'Made With ML · 운영 모니터링',
  'ps3.pdf': 'Stanford CS229 · 독립 성분 분석 문제 (13쪽)',
  'journal-article-discussion': 'MIT Comm Lab · 논문 토론 작성',
};

function appendRelatedSections(root, ref) {
  for (const url of ref.additionalUrls || []) {
    const slug = new URL(url).pathname.split('/').filter(Boolean).at(-1);
    root.append(document.createTextNode(' · '), link(`${sectionNames[slug] || `${ref.title} · ${slug}`} ↗`, url));
  }
}

export function focusV4Card(root, id) {
  const card = [...root.querySelectorAll('[data-v4-card],[data-v4-check]')].find(node => (node.dataset.v4Card || node.dataset.v4Check) === id);
  if (!card) return;
  card.closest('[data-phase-id]').open = true;
  if (card.parentElement.tagName === 'DETAILS') card.parentElement.open = true;
  if (card.tagName === 'DETAILS') card.open = true;
  (card.querySelector('summary') || card.querySelector('button'))?.focus();
}

export function renderV4Phase(section, roadmap, phase, updates, onComplete, onOpen) {
  const v4 = roadmap.curriculumV4;
  if (!v4) return;
  const cards = v4.phases[phase.id] || [];
  const referenced = studyCards(roadmap).some(card => card.prerequisite?.includes(phase.id))
    || Object.values(v4.topics || {}).flat().some(video => video.prerequisite?.includes(phase.id));
  if (!cards.length && !referenced && !v4.topics?.[phase.id]?.length) return;
  const required = requiredPhaseCards(roadmap, phase);
  const optional = cards.filter(card => card.level !== 'required');
  const core = el('section', 'learning-v4-group');
  if (required.length) core.append(el('h4', '', '다음 단계 전 · 필수 v4'));
  const group = el('details', 'learning-v4-group');
  group.append(el('summary', '', `권장·선택 자료${optional.length ? ` · 카드 ${optional.length}개` : ''}`));
  if (referenced) {
    const check = stageCheck(phase);
    const checkpoint = el('div');
    checkpoint.dataset.v4Check = check.id;
    text(checkpoint, '', '위 단계의 직접 과제를 도움 없이 해 보고 설명할 수 있을 때 확인하세요. 영상 이수와 별도로 기록됩니다.');
    checkpoint.append(toggle(check, '단계 직접 수행 확인', updates, roadmap, onComplete));
    core.append(checkpoint);
  }
  renderVideos(group, roadmap, phase.id, updates, onOpen);
  const byId = new Map(studyCards(roadmap).map(card => [card.id, card]));
  for (const card of [...required, ...optional]) {
    const item = el('details', 'learning-v4-card');
    item.dataset.v4Card = card.id;
    const heading = el('summary', '', `${labels[card.level]} · ${card.label ? `${card.label} · ` : ''}${card.title}`);
    const gate = el('p', 'muted');
    item.append(heading, gate);
    updates.push(({progress}) => {
      const missing = missingPrerequisites(roadmap, card, progress);
      gate.textContent = missing.length ? `선수 확인 대기 · ${missing.map(check => check.title).join(' / ')}` : '시작 가능';
    });
    text(item, '', card.reason);
    text(item, '예상 분량: ', card.estimate || (card.minutes ? `${card.minutes}분 · 필요하면 연장` : ''));
    text(item, '범위: ', card.section);
    if (card.kind === 'exercise') {
      text(item, '', card.id === 'v4-e01'
        ? 'E01 실습 입력·실행기·자동 채점기는 저장소의 exercises/e01에 있습니다. README를 따라 앱 밖에서 Python으로 실행하고, 새 로그의 독립 설명은 튜터에게 확인받으세요.'
        : 'Duvi에 실습 입력 파일(fixture), 실행기, 자동 채점기는 없습니다. 앱 밖에서 직접 준비하거나 튜터에게 별도의 입력·비공개 판정 기준을 요청하세요.');
      text(item, '비유: ', card.analogy);
    }
    if (card.steps) {
      const steps = el('ol');
      card.steps.forEach(step => steps.append(el('li', '', step)));
      item.append(steps);
    }
    text(item, '할 일: ', card.spec || card.task);
    text(item, '반복: ', card.repetitions);
    text(item, '완료 전 확인: ', card.successCheck);
    text(item, '태그: ', card.tags?.join(' · '));
    text(item, '', card.conclusion);
    if (card.id === 'v4-i-cap') {
      const example = el('details');
      example.append(el('summary', '', '합성 해설 예제 열기 (독립 확인용 아님)'));
      text(example, '', v4.workedExample.basis);
      const list = el('ol');
      v4.workedExample.rows.forEach(row => list.append(el('li', 'learning-preserve', row.join(' · '))));
      example.append(list);
      item.append(example);
    }
    if (card.id === 'v4-i-diag') {
      const index = el('details');
      index.append(el('summary', '', '진단 색인 · 한 사례만 고르기'));
      const list = el('ul');
      v4.diagnosticIndex.forEach(row => list.append(el('li', 'learning-preserve', `${row.label} · ${row.question}`)));
      index.append(list);
      item.append(index);
    }
    const sources = el('div', 'learning-resource-actions');
    const source = (title, url) => { if (url) sources.append(link(`${title} ↗`, url)); };
    const displaySource = ref => {
      source(ref.title, ref.url);
      appendRelatedSections(sources, ref);
    };
    if (card.url) displaySource(card);
    for (const path of card.readingPaths || []) {
      const pathBox = el('p', 'muted', path.countsTowardExercise ? '실습 분량에 포함: ' : '별도 선택 참고: ');
      const refs = path.resourceIds.map(id => byId.get(id)).filter(Boolean);
      refs.forEach((ref, index) => {
        if (index) pathBox.append(document.createTextNode(' / '));
        pathBox.append(link(`${ref.title} ↗`, ref.url));
        if (ref.section) pathBox.append(document.createTextNode(` (${ref.section})`));
        appendRelatedSections(pathBox, ref);
      });
      item.append(pathBox);
    }
    for (const ref of card.resources || []) source(`${ref.role === 'alternative' ? '대체' : '참고'} · ${ref.label}`, ref.url);
    if (card.inheritedResourceIds?.length) {
      const legacy = roadmap.phases.flatMap(p => p.resources);
      for (const id of card.inheritedResourceIds) {
        const ref = legacy.find(r => r.id === id);
        if (ref) source(ref.title, ref.url);
      }
    }
    for (const entry of card.readingPrerequisites || []) text(item, '발췌 선수: ', `${entry.portion} 이전에 ${entry.resourceIds.join(' · ')} 직접 확인`);
    if (sources.childElementCount) item.append(sources);
    renderVideos(item, roadmap, card.id, updates, onOpen, card);
    item.append(toggle(card, '완료로 표시', updates, roadmap, onComplete));
    (card.level === 'required' ? core : group).append(item);
  }
  if (core.childElementCount) section.append(core);
  if (optional.length || v4.topics?.[phase.id]?.length) section.append(group);
}

function renderVideos(root, roadmap, topic, updates, onOpen, card) {
  const entries = roadmap.curriculumV4.topics?.[topic];
  if (!entries?.length) return;
  const group = el('details', 'learning-v4-card'), list = el('ul');
  group.append(el('summary', '', `선택 YouTube 강의 · ${entries.length}개`), list);
  for (const entry of entries) {
    const video = roadmap.curriculumV4.videos[entry.videoId], li = el('li');
    const url = new URL(video.url);
    const time = entry.range.match(/^(\d+):(\d{2})(?::(\d{2}))?/);
    let start;
    if (time) {
      const [, a, b, c] = time;
      start = c ? 3600 * +a + 60 * +b + +c : 60 * +a + +b;
      url.searchParams.set('t', String(start));
    }
    const title = el('span');
    const launch = button(`${video.title} · Duvi에서 열기`, async () => {
      launch.disabled = true;
      try { await onOpen(start === undefined ? {videoId: entry.videoId} : {videoId: entry.videoId, start}); }
      finally { launch.disabled = false; }
    });
    const original = link('YouTube 원본 ↗', url.href);
    original.setAttribute('aria-label', `${video.title} · YouTube 원본 (새 탭)`);
    li.dataset.v4Video = entry.videoId;
    text(li, '', `${video.channel} · ${entry.range} · ${entry.minutes}분 · ${entry.reason}`);
    li.prepend(title);
    updates.push(({progress}) => {
      const missing = missingPrerequisites(roadmap, {
        prerequisite: [...new Set([...(card?.prerequisite || []), ...entry.prerequisite])],
        cardPrerequisites: card?.cardPrerequisites,
      }, progress);
      if (missing.length) title.replaceChildren(el('span', 'muted', `${video.title} · 선수 확인 대기: ${missing.map(check => check.title).join(' / ')}`));
      else if (title.firstChild !== launch) title.replaceChildren(launch, document.createTextNode(' · '), original);
    });
    list.append(li);
  }
  root.append(group);
}

function toggle(card, label, updates, roadmap, onComplete) {
  let busy = false, ready = false, done = false;
  const control = button(label, async () => {
    busy = true;
    control.disabled = true;
    try { await onComplete(card); } catch { /* existing progress notice reports errors */ }
    finally { busy = false; control.disabled = !ready && !done; }
  }, 'learning-complete');
  updates.push(({progress}) => {
    done = resourceCompleted(roadmap, progress, card);
    ready = !missingPrerequisites(roadmap, card, progress).length;
    control.textContent = done ? '✓ 완료 · 취소' : label;
    control.setAttribute('aria-label', `${control.textContent} · ${card.title}`);
    control.disabled = busy || (!done && !ready);
    control.dataset.completed = String(done);
  });
  return control;
}
