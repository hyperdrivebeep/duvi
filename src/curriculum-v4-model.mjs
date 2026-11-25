import {resourceCompleted} from './learning-model.mjs';

export const stageCheck = phase => ({id: `v4-check-${phase.id}`, title: `${phase.title} · 직접 수행 확인`});
export const studyCards = roadmap => Object.values(roadmap.curriculumV4?.phases || {}).flat();

export function missingPrerequisites(roadmap, card, progress) {
  const checks = (card.prerequisite || []).map(id => stageCheck(roadmap.phases.find(phase => phase.id === id)));
  const all = studyCards(roadmap);
  checks.push(...(card.cardPrerequisites || []).map(id => all.find(item => item.id === id)));
  return checks.filter(item => !resourceCompleted(roadmap, progress, item));
}

export function requiredStudy(roadmap, progress) {
  const required = studyCards(roadmap).filter(card => card.level === 'required');
  const remaining = required.filter(card => !resourceCompleted(roadmap, progress, card));
  return {
    done: required.length - remaining.length,
    total: required.length,
    next: remaining.find(card => !missingPrerequisites(roadmap, card, progress).length),
    waiting: remaining[0],
  };
}
