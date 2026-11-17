import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildStudyGuide, conceptRows, GUIDE} from '../scripts/study-guide.mjs';
import {ROADMAP} from '../src/learning-roadmap.mjs';

const conceptMap = await readFile(new URL('../docs/CONCEPT_MAP.md', import.meta.url), 'utf8');
const data = JSON.parse(await readFile(new URL('../scripts/study-guide-data.json', import.meta.url), 'utf8'));
const guide = (await readFile(GUIDE, 'utf8')).replace(/\r\n/g, '\n');
const concepts = conceptRows(conceptMap);
const names = new Set(concepts.map(row => row.name));

test('committed study guide matches the generator output', () => {
  assert.equal(guide, buildStudyGuide({conceptMap, data}));
});

test('every guide concept is an R-019 concept and every R-019 concept is listed once', () => {
  const listed = [...guide.matchAll(/^- \[ \] \*\*(.+?)\*\* · /gm)].map(match => match[1]);
  assert.equal(concepts.length, 160);
  assert.equal(listed.length, concepts.length);
  assert.deepEqual(new Set(listed), names);
  for (const name of listed) assert.ok(names.has(name), name);
});

test('every lecture link in the guide comes from the roadmap', () => {
  const urls = new Set(ROADMAP.phases.flatMap(phase => phase.resources.map(resource => resource.url)));
  const links = [...guide.matchAll(/\]\((https:[^)\s]+)\)/g)].map(match => match[1]);
  assert.ok(links.length > 200);
  for (const url of links) assert.ok(urls.has(url), url);
});

test('version 3 explainer videos name existing concepts and are marked new in the guide', () => {
  const added = ROADMAP.phases.flatMap(phase => phase.resources).filter(resource => resource.concepts);
  assert.equal(added.length, 58);
  for (const resource of added) {
    assert.equal(resource.kind, 'video');
    assert.ok(resource.lectureId.startsWith('yt_'));
    for (const name of resource.concepts) assert.ok(names.has(name), name);
    assert.match(guide, new RegExp(`\\(${resource.url.replace(/[.?]/g, '\\$&')}\\) \\(앱에서 재생[^)]*\\) · [^\\n]* · \\*\\*신규\\*\\*`));
  }
});
