import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {ROADMAP} from '../src/learning-roadmap.mjs';
import {studyCards, stageCheck} from '../src/curriculum-v4-model.mjs';
import {orderedResources, progressStatus, resourceCompleted, resourceProgressId, completionSummary, nextResource} from '../src/learning-model.mjs';
import fixture from '../tests/fixtures/curriculum-v3-progress.json' with {type: 'json'};
import mit from './mit-sources.json' with {type: 'json'};

export function checkCompatibility(roadmap) {
  assert.deepEqual(roadmap.phases.map(phase => ({
    id: phase.id,
    resources: phase.resources.map(resource => {
      const progressId = resourceProgressId(roadmap, resource);
      return {
        id: resource.id, ...(resource.lectureId !== undefined && {lectureId: resource.lectureId}), url: resource.url,
        progressId, activity: progressStatus(fixture.progress[progressId]),
        completed: resourceCompleted(roadmap, fixture.progress, resource),
      };
    }),
  })), fixture.phases);
  assert.deepEqual(roadmap.firstTwoWeeks, fixture.firstTwoWeeks);
  assert.deepEqual(completionSummary(roadmap, fixture.progress), fixture.summary);
  assert.equal(nextResource(roadmap, fixture.progress)?.id, fixture.next);
  return orderedResources(roadmap).length;
}

export function validateCurriculum(roadmap) {
  const existing = orderedResources(roadmap), cards = studyCards(roadmap);
  const phases = new Map(roadmap.phases.map((phase, index) => [phase.id, index]));
  const allIds = [...existing, ...cards, ...roadmap.phases.map(stageCheck)].map(item => item.id);
  assert.equal(new Set(allIds).size, allIds.length, 'unique progress keys');
  assert.deepEqual(roadmap.curriculumV4.phases['learning-phase-1'], undefined);
  assert.deepEqual(Object.values(roadmap.curriculumV4.hours).reduce(([lo, hi], [a, b]) => [lo + a, hi + b], [0, 0]), [530, 714]);
  const assessable = cards.filter(card => ['study-card', 'exercise'].includes(card.kind));
  assert.equal(assessable.length, 31);
  assert.equal(assessable.filter(card => card.kind === 'exercise').length, 8);
  assert.equal(cards.find(card => card.id === 'v4-e01').level, 'required');
  const byId = new Map(cards.map(card => [card.id, card]));
  const placements = new Map(Object.entries(roadmap.curriculumV4.phases).flatMap(([phase, items]) => items.map(item => [item.id, phases.get(phase)])));
  const verifyChain = (card, previous = []) => {
    assert.ok(!previous.includes(card.id), `cycle at ${card.id}`);
    for (const id of card.cardPrerequisites || []) {
      const parent = byId.get(id);
      assert.ok(parent && placements.get(id) <= placements.get(card.id), `${card.id} -> ${id}`);
      if (card.level === 'required') assert.equal(parent.level, 'required', `${card.id} requires optional ${id}`);
      verifyChain(parent, [...previous, card.id]);
    }
  };
  for (const card of cards) {
    assert.match(card.id, /^v4-/);
    assert.ok(['required', 'recommended', 'optional'].includes(card.level) && card.reason);
    assert.ok(card.prerequisite?.length);
    assert.ok(card.prerequisite.every(id => phases.has(id) && phases.get(id) <= placements.get(card.id)), card.id);
    for (const id of card.resourceIds || []) assert.ok(byId.has(id), `${card.id} -> ${id}`);
    verifyChain(card);
  }
  const legacyVideos = new Set([...mit.map(item => item.youtubeId),
    ...existing.flatMap(item => [item.lectureId?.match(/^yt_([\w-]{11})$/)?.[1], item.url?.match(/[?&]v=([\w-]{11})/)?.[1]])]);
  const {videos, topics} = roadmap.curriculumV4;
  const used = new Set();
  assert.ok(!topics['learning-phase-1'], 'first-stage videos unchanged');
  for (const [topic, links] of Object.entries(topics)) {
    assert.ok(phases.has(topic) || byId.has(topic), topic);
    assert.ok(links.length >= 1 && links.length <= 3, topic);
    assert.equal(new Set(links.map(link => link.videoId)).size, links.length, topic);
    for (const {videoId, minutes, range, prerequisite} of links) {
      assert.match(videoId, /^[\w-]{11}$/);
      assert.ok(!legacyVideos.has(videoId), `duplicate video: ${videoId}`);
      assert.ok(Number.isFinite(minutes) && minutes > 0 && range);
      assert.ok(prerequisite.every(id => phases.has(id)));
      const video = videos[videoId], url = new URL(video.url);
      assert.equal(video.oembed.status, 200);
      assert.equal(url.origin, 'https://www.youtube.com');
      assert.equal(url.searchParams.get('v'), videoId);
      used.add(videoId);
    }
  }
  assert.deepEqual(used, new Set(Object.keys(videos)));
  return {cards: cards.length, required: cards.filter(card => card.level === 'required').length, videos: used.size};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  console.log(`Curriculum v4: ${checkCompatibility(ROADMAP)} legacy resource statuses preserved`, validateCurriculum(ROADMAP));
}
