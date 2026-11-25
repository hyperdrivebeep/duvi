import {el, button, link} from './learning-dom.mjs';
import {resourceCompleted} from './learning-model.mjs';
import {stageCheck, studyCards, missingPrerequisites, requiredStudy} from './curriculum-v4-model.mjs';

const labels = {required: '필수', recommended: '권장', optional: '선택'};
const text = (root, label, value) => { if (value) root.append(el('p', 'learning-preserve', `${label}${value}`)); };

export function focusV4Card(root, id) {
  const card = [...root.querySelectorAll('[data-v4-card]')].find(node => node.dataset.v4Card === id);
  if (!card) return;
  card.closest('[data-phase-id]').open = true;
  card.parentElement.open = true;
  card.open = true;
  card.querySelector('summary').focus();
}

export function renderV4Summary(root, roadmap, updates) {
  if (!roadmap.curriculumV4) return;
  const banner = el('section', 'learning-start');
  const status = el('p', 'learning-eyebrow'), detail = el('p', 'muted');
  banner.append(status, detail);
  root.append(banner);
  updates.push(({progress}) => {
    const {done, total, next, waiting} = requiredStudy(roadmap, progress);
    status.textContent = `v4 추가 필수 · ${done}/${total}개 자기 확인`;
    detail.replaceChildren(next ? '시작할 수 있는 추가 필수: ' : waiting ? '선수 확인 후 열리는 필수: ' : 'v4 추가 필수 카드 확인을 마쳤습니다. 자기 표시는 숙달 인증이 아닙니다.');
    if (next || waiting) detail.append(button((next || waiting).title, () => focusV4Card(root, (next || waiting).id)));
  });
}

export function renderV4Phase(section, roadmap, phase, updates, onComplete) {
  const v4 = roadmap.curriculumV4;
  if (!v4) return;
  const cards = v4.phases[phase.id] || [];
  const referenced = studyCards(roadmap).some(card => card.prerequisite?.includes(phase.id))
    || Object.values(v4.topics || {}).flat().some(video => video.prerequisite?.includes(phase.id));
  if (!cards.length && !referenced && !v4.topics?.[phase.id]?.length) return;
  const group = el('details', 'learning-v4-group');
  group.append(el('summary', '', `v4 학습 · 직접 수행 확인${cards.length ? ` 및 카드 ${cards.length}개` : ''}`));
  if (referenced) {
    const check = stageCheck(phase);
    text(group, '', '위 단계의 직접 과제를 도움 없이 해 보고 설명할 수 있을 때 확인하세요. 영상 이수와 별도로 기록됩니다.');
    group.append(toggle(check, '단계 직접 수행 확인', updates, roadmap, onComplete));
  }
  renderVideos(group, roadmap, phase.id, updates);
  const byId = new Map(studyCards(roadmap).map(card => [card.id, card]));
  for (const card of cards) {
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
      text(item, '', 'Duvi에 실습 입력 파일(fixture), 실행기, 자동 채점기는 없습니다. 앱 밖에서 직접 준비하거나 튜터에게 별도의 입력·비공개 판정 기준을 요청하세요.');
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
      ref.additionalUrls?.forEach((url, index) => source(`관련 절 ${index + 2}`, url));
    };
    if (card.url) displaySource(card);
    for (const path of card.readingPaths || []) {
      const pathBox = el('p', 'muted', path.countsTowardExercise ? '실습 분량에 포함: ' : '별도 선택 참고: ');
      const refs = path.resourceIds.map(id => byId.get(id)).filter(Boolean);
      refs.forEach(ref => {
        pathBox.append(link(`${ref.title} ↗`, ref.url));
        if (ref.section) pathBox.append(document.createTextNode(` (${ref.section}) `));
        ref.additionalUrls?.forEach((url, index) => pathBox.append(link(`관련 절 ${index + 2} ↗`, url)));
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
    renderVideos(item, roadmap, card.id, updates, card);
    item.append(toggle(card, '완료로 표시', updates, roadmap, onComplete));
    group.append(item);
  }
  section.append(group);
}

function renderVideos(root, roadmap, topic, updates, card) {
  const entries = roadmap.curriculumV4.topics?.[topic];
  if (!entries?.length) return;
  const group = el('details', 'learning-v4-card'), list = el('ul');
  group.append(el('summary', '', `선택 YouTube 강의 · ${entries.length}개`), list);
  for (const entry of entries) {
    const video = roadmap.curriculumV4.videos[entry.videoId], li = el('li');
    const url = new URL(video.url);
    const time = entry.range.match(/^(\d+):(\d{2})(?::(\d{2}))?/);
    if (time) {
      const [, a, b, c] = time;
      url.searchParams.set('t', String(c ? 3600 * +a + 60 * +b + +c : 60 * +a + +b));
    }
    const title = el('span');
    text(li, '', `${video.channel} · ${entry.range} · ${entry.minutes}분 · ${entry.reason}`);
    li.prepend(title);
    updates.push(({progress}) => {
      const missing = missingPrerequisites(roadmap, {
        prerequisite: [...new Set([...(card?.prerequisite || []), ...entry.prerequisite])],
        cardPrerequisites: card?.cardPrerequisites,
      }, progress);
      title.replaceChildren(missing.length
        ? el('span', 'muted', `${video.title} · 선수 확인 대기: ${missing.map(check => check.title).join(' / ')}`)
        : link(`${video.title} ↗`, url.href));
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
  control.setAttribute('aria-label', `${card.title} ${label}`);
  updates.push(({progress}) => {
    done = resourceCompleted(roadmap, progress, card);
    ready = !missingPrerequisites(roadmap, card, progress).length;
    control.textContent = done ? '✓ 완료 · 취소' : label;
    control.disabled = busy || (!done && !ready);
    control.setAttribute('aria-pressed', String(done));
  });
  return control;
}
