import test from 'node:test';
import assert from 'node:assert/strict';
import {ROADMAP} from '../src/learning-roadmap.mjs';
import {studyCards, stageCheck, missingPrerequisites} from '../src/curriculum-v4-model.mjs';
import {checkCompatibility, validateCurriculum} from '../scripts/validate-curriculum-v4.mjs';
import {resourceProgressId} from '../src/learning-model.mjs';
import {renderRoadmap} from '../src/learning-map-view.mjs';
import {all, byTag, createRoot, installDom} from './fake-dom.mjs';

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
  assert.deepEqual(missingPrerequisites(ROADMAP, e03, progress), [e01]);
  progress[e01.id] = {completed: true};
  assert.deepEqual(missingPrerequisites(ROADMAP, e03, progress), []);
});

function withRoadmap(run, through='5') {
  const restore = installDom();
  const root = createRoot(), progress = {};
  const finish = id => { progress[id] = {completed:true}; };
  for (const phase of ROADMAP.phases) {
    phase.resources.forEach(resource => finish(resourceProgressId(ROADMAP, resource)));
    if (phase.id === `learning-phase-${through}`) break;
  }
  try {
    const update = renderRoadmap(root, {roadmap:ROADMAP, state:{progress}});
    const hero = () => root.children[0];
    const heading = id => all(root, node => node.dataset.phaseId === `learning-phase-${id}`)[0].children[0];
    run({root, progress, finish, hero, heading, update: () => update({progress})});
  } finally { restore(); }
}

test('v4 main flow: completed legacy stage 5 leads to its check, earlier prerequisites, E01, then 5B', () => withRoadmap(({finish, hero, progress, update}) => {
  const title = () => byTag(hero(), 'h3')[0].textContent;
  // A later started lecture cannot jump the stage boundary.
  progress['python-venv'] = {status:'watching'};
  update();
  assert.match(title(), /^5\..*직접 수행 확인/);
  assert.match(hero().textContent, /E01/);
  finish('v4-check-learning-phase-5'); update();
  assert.match(title(), /^3B\..*직접 수행 확인/);
  finish('v4-check-learning-phase-3b');
  const cards = studyCards(ROADMAP);
  for (const id of ['v4-i-stat', 'v4-i-eq', 'v4-i-pair', 'v4-i-reg']) {
    update();
    assert.equal(title(), cards.find(card => card.id === id).title);
    finish(id);
  }
  update(); assert.match(title(), /^1\..*직접 수행 확인/);
  finish('v4-check-learning-phase-1'); update();
  assert.equal(title(), cards.find(card => card.id === 'v4-e01').title);
  finish('v4-e01'); update();
  assert.equal(title(), ROADMAP.phases.find(phase => phase.id === 'learning-phase-5b').resources[0].title);
}));

test('v4 stage headers count only their required cards and update when a card is marked', () => withRoadmap(({finish, heading, update}) => {
  assert.match(heading('3b').textContent, /필수 v4 0\/4/);
  assert.match(heading('5').textContent, /필수 v4 0\/1/);
  assert.doesNotMatch(heading('5b').textContent, /필수 v4/);
  finish('v4-i-stat'); finish('v4-i-mult'); finish('v4-check-learning-phase-5'); finish('v4-e01'); update();
  assert.match(heading('3b').textContent, /필수 v4 1\/4/);
  assert.match(heading('5').textContent, /필수 v4 1\/1/);
}));

test('v4 overall progress adds the required count beside the unchanged 108/227 legacy total', () => withRoadmap(({finish, hero, update}) => {
  const progressText = () => hero().children[0].textContent;
  assert.match(progressText(), /108\/227.*필수 v4 0\/10/);
  finish('v4-e01'); finish('v4-check-learning-phase-5'); finish('v4-i-mult'); update();
  assert.match(progressText(), /108\/227.*필수 v4 1\/10/);
}));
