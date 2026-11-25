import test from 'node:test';
import assert from 'node:assert/strict';
import {ROADMAP} from '../src/learning-roadmap.mjs';
import {studyCards, stageCheck, missingPrerequisites, requiredStudy} from '../src/curriculum-v4-model.mjs';
import {checkCompatibility, validateCurriculum} from '../scripts/validate-curriculum-v4.mjs';

test('all 227 old resource statuses, keys, URLs and onramp are unchanged using synthetic v3 saved state', () => {
  assert.equal(checkCompatibility(ROADMAP), 227);
});

test('v4 exercises have unique IDs and reachable, classified prerequisites', () => {
  assert.equal(validateCurriculum(ROADMAP).required, 10);
});

test('E01 reads explicit stage and card marks; later architecture exercises wait for E01', () => {
  const cards = studyCards(ROADMAP);
  const e01 = cards.find(card => card.id === 'v4-e01');
  const e03 = cards.find(card => card.id === 'v4-e03');
  const progress = {'mit-1': {completed: true}};
  assert.equal(missingPrerequisites(ROADMAP, e01, progress).length, 6);
  for (const phase of ROADMAP.phases) progress[stageCheck(phase).id] = {completed: true};
  for (const id of e01.cardPrerequisites) progress[id] = {completed: true};
  assert.deepEqual(missingPrerequisites(ROADMAP, e01, progress), []);
  // Unticked required stats still precede E01 in the global list.
  progress['v4-i-eq'] = {completed: true};
  assert.equal(requiredStudy(ROADMAP, progress).next, e01);
  assert.deepEqual(missingPrerequisites(ROADMAP, e03, progress), [e01]);
  progress[e01.id] = {completed: true};
  assert.deepEqual(missingPrerequisites(ROADMAP, e03, progress), []);
});
