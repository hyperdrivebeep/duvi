import {nextResource, resourceCompleted} from './learning-model.mjs';

export const stageCheck = phase => ({id: `v4-check-${phase.id}`, title: `${phase.title} · 직접 수행 확인`});
export const studyCards = roadmap => Object.values(roadmap.curriculumV4?.phases || {}).flat();

export function requiredPhaseCards(roadmap, phase) {
  const pending = (roadmap.curriculumV4?.phases[phase.id] || []).filter(card => card.level === 'required');
  const ordered = [];
  while (pending.length) {
    // Keep editorial order where possible, but teach I-CAP before its dependent E07.
    const index = pending.findIndex(card => !card.cardPrerequisites?.some(id => pending.some(item => item.id === id)));
    if (index < 0) throw new Error(`Required-card cycle in ${phase.id}`);
    ordered.push(...pending.splice(index, 1));
  }
  return ordered;
}

export function missingPrerequisites(roadmap, card, progress) {
  const checks = (card.prerequisite || []).map(id => stageCheck(roadmap.phases.find(phase => phase.id === id)));
  const all = studyCards(roadmap);
  checks.push(...(card.cardPrerequisites || []).map(id => all.find(item => item.id === id)));
  return checks.filter(item => !resourceCompleted(roadmap, progress, item));
}

export function requiredStudy(roadmap, progress, phase) {
  const required = phase ? requiredPhaseCards(roadmap, phase) : studyCards(roadmap).filter(card => card.level === 'required');
  return {done: required.filter(card => resourceCompleted(roadmap, progress, card)).length, total: required.length};
}

export function nextStudyStep(roadmap, progress) {
  const phases = roadmap.phases || [];
  const done = item => resourceCompleted(roadmap, progress, item);
  const stages = phases.map(phase => ({
    phase, complete: phase.resources.every(done),
    pending: requiredPhaseCards(roadmap, phase).filter(card => !done(card)),
  }));
  const firstIncomplete = stages.findIndex(stage => !stage.complete);
  const frontier = stages[(firstIncomplete < 0 ? stages.length : firstIncomplete) - 1];
  const checkStep = (phase, forCard) => ({phase, item: stageCheck(phase), kind: 'check', forCard});

  // A learner upgrading mid-course first sees the exit check at the last completed
  // stage. Confirming it never waives older unmarked checks or required cards.
  if (frontier?.pending[0]?.prerequisite.includes(frontier.phase.id) && !done(stageCheck(frontier.phase))) {
    return checkStep(frontier.phase, frontier.pending[0]);
  }

  const resourceStep = candidates => {
    const item = nextResource({...roadmap, phases: candidates}, progress);
    return item ? {phase: candidates.find(phase => phase.resources.includes(item)), item, kind: 'resource'} : null;
  };
  const preceding = [];
  for (const {phase, pending} of stages) {
    preceding.push(phase);
    const card = pending[0];
    if (!card) continue;
    const resource = resourceStep(preceding);
    if (resource) return resource;
    const checks = (card.prerequisite || []).map(id => phases.find(item => item.id === id));
    const unchecked = checks.find(stage => !done(stageCheck(stage)));
    if (unchecked) return checkStep(unchecked, card);
    return {phase, item: card, kind: 'card'};
  }
  return resourceStep(preceding);
}
