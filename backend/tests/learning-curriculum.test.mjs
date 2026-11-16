import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, readdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {LectureLibrary} from '../library.mjs';
import {prepareRoadmap} from '../learning-curriculum.mjs';
import {ROADMAP, VIDEO_METADATA} from '../../src/learning-roadmap.mjs';

const execute = promisify(execFile);
const project = fileURLToPath(new URL('../../', import.meta.url));
const videoKeys = Object.keys(VIDEO_METADATA);
const mitKeys = Array.from({length: 26}, (_, i) => String(i + 1));
const writeJSON = (file, value) => writeFile(file, JSON.stringify(value));
async function fixture(t) {
  const root = await mkdtemp(path.join(project, '.learning-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(project));
    await rm(root, {recursive: true, force: true});
  });
  await mkdir(path.join(root, 'data'));
  await mkdir(path.join(root, 'library'));
  await writeJSON(path.join(root, 'data/catalog.json'), mitKeys.map(number => ({number: Number(number)})));
  await Promise.all(mitKeys.map(number => writeJSON(path.join(root, `data/${number}.json`), {
    number: Number(number), title: `Existing MIT ${number}`, youtubeId: number === '1' ? 'xAcTmDO6NTI' : undefined,
    cues: [{start: 0, end: 2, en: `Existing caption ${number}`}], custom: {keep: true},
  })));
  const denyNetwork = () => { throw new Error('Preparation must not request metadata/captions/videos'); };
  return {root, library: new LectureLibrary({root, fetcher: denyNetwork, metadata: denyNetwork, playlistMetadata: denyNetwork})};
}

test('roadmap has eight ordered phases, numeric MIT entry point and prerequisite bridge', () => {
  assert.deepEqual(ROADMAP.phases.map(p => p.id), Array.from({length: 8}, (_, i) => `learning-phase-${i + 1}`));
  assert.deepEqual(ROADMAP.phases.map(p => p.weeks), ['1–5주', '6–9주', '10–13주', '14–17주', '18–21주', '22–25주', '26–29주', '30–33주']);
  assert.deepEqual(ROADMAP.phases[0].resources.filter(r => r.lectureId).map(r => r.lectureId), mitKeys.slice(0, 14));
  assert.deepEqual(ROADMAP.phases[4].resources.slice(0, 4).map(r => r.id), ['mit-17', 'mit-18', 'pytorch-tensors', 'video-VMj-3S1tku0']);
  assert.deepEqual(ROADMAP.firstTwoWeeks.sessions.map(item => item.session), Array.from({length: 10}, (_, i) => i + 1));
  const resources = ROADMAP.phases.flatMap(p => p.resources);
  assert.equal(new Set(resources.map(r => r.id)).size, resources.length);
  for (const resource of resources) {
    assert.ok(['video', 'reading', 'exercise'].includes(resource.kind));
    assert.equal(new URL(resource.url).protocol, 'https:');
    if (resource.kind !== 'video') assert.equal(resource.lectureId, undefined);
    if (resource.lectureId?.startsWith('yt_')) assert.equal(new URL(resource.url).searchParams.get('v'), VIDEO_METADATA[resource.lectureId].youtubeId);
    if (resource.end !== undefined) assert.ok(resource.end > resource.start);
  }
});

test('preparation attaches ordered lessons without network and retains all 26 MIT lectures', async t => {
  const {root, library} = await fixture(t);
  const before = await Promise.all(mitKeys.map(key => readFile(path.join(root, `data/${key}.json`), 'utf8')));
  const result = await prepareRoadmap(library);
  assert.equal(result.firstLectureId, '1');
  assert.equal(result.added, videoKeys.length);
  assert.equal(result.reused, 16);
  assert.equal(result.folders.length, 8);
  assert.deepEqual(result.folders[0].lectureIds, mitKeys.slice(0, 14));
  assert.deepEqual(result.folders[4].lectureIds, ['17', '18', 'yt_VMj-3S1tku0', 'yt_PaCmpygFfXo']);
  assert.deepEqual((await library.folders.list()).folders[0].lectureIds, mitKeys);
  assert.deepEqual(await Promise.all(mitKeys.map(key => readFile(path.join(root, `data/${key}.json`), 'utf8'))), before);
  assert.equal((await library.list()).length, 26 + videoKeys.length);
  for (const key of videoKeys) {
    const item = await library.get(key);
    assert.equal(item.title, VIDEO_METADATA[key].title);
    assert.equal(item.course, VIDEO_METADATA[key].channel);
    assert.equal(item.captionStatus, 'pending');
    assert.deepEqual(item.cues, []);
  }
});

test('repeat preparation after restart is idempotent and leaves lecture bytes unchanged', async t => {
  const {root, library} = await fixture(t);
  await prepareRoadmap(library);
  const beforeFolders = await readFile(library.folders.file, 'utf8');
  const before = await Promise.all(videoKeys.map(key => readFile(path.join(root, `library/${key}.json`), 'utf8')));
  const result = await prepareRoadmap(new LectureLibrary({root}));
  assert.equal(result.added, 0);
  assert.equal(result.reused, result.total);
  assert.equal(await readFile(library.folders.file, 'utf8'), beforeFolders);
  assert.deepEqual(await Promise.all(videoKeys.map(key => readFile(path.join(root, `library/${key}.json`), 'utf8'))), before);
});

test('user folders, renamed phases and user additions survive with curriculum first', async t => {
  const {library} = await fixture(t);
  const user = {id: 'personal', name: '내 자료', lectureIds: ['26', '1'], custom: {color: 'blue'}};
  const phase = {id: 'learning-phase-1', name: '사용자가 바꾼 제목', lectureIds: ['26', '3', '2', '1', '25'], custom: 'keep'};
  await writeJSON(library.folders.file, {version: 1, custom: 'root-property', folders: [user, phase]});
  await prepareRoadmap(library);
  const state = await library.folders.list();
  assert.deepEqual(state.folders[0], user);
  assert.equal(state.custom, 'root-property');
  assert.deepEqual(state.folders[1], {...phase, lectureIds: [...mitKeys.slice(0, 14), '26', '25']});
  assert.equal(state.folders.filter(f => f.id === phase.id).length, 1);
});

test('existing captions, translations, credentials and learning progress are untouched', async t => {
  const {root, library} = await fixture(t);
  const item = {number: videoKeys[0], title: 'User title', youtubeId: VIDEO_METADATA[videoKeys[0]].youtubeId,
    course: 'User course', player: 'youtube', cues: [{start: 1, end: 3, en: 'Original sentence.'}],
    captionStatus: 'ready', createdAt: '2025-01-01', alignmentRevision: 'original'};
  await writeJSON(path.join(library.directory, `${item.number}.json`), item);
  const files = ['translations.json', 'accounts.dpapi', 'learning.json', 'positions.json'];
  for (const file of files) await writeFile(path.join(root, file), `fixture-private-${file}`);
  await prepareRoadmap(library);
  assert.deepEqual(await library.get(item.number), item);
  for (const file of files) assert.equal(await readFile(path.join(root, file), 'utf8'), `fixture-private-${file}`);
});

test('simultaneous preparations and folder edits share serialization without duplicates', async t => {
  const {library} = await fixture(t);
  const [a, b, user] = await Promise.all([prepareRoadmap(library), prepareRoadmap(library), library.folders.create('Concurrent user folder')]);
  assert.equal(a.added + b.added, videoKeys.length);
  const state = await library.folders.list();
  assert.equal(state.folders.filter(f => f.id.startsWith('learning-phase-')).length, 8);
  assert.ok(state.folders.some(f => f.id === user.id));
  for (const phase of state.folders) assert.equal(new Set(phase.lectureIds).size, phase.lectureIds.length);
  assert.equal((await library.list()).length, 26 + videoKeys.length);
});

test('pending caption update serialized with preparation is preserved', async t => {
  const {library} = await fixture(t);
  const key = 'yt_VMj-3S1tku0';
  await library.mutateLecture(key, async () => writeJSON(path.join(library.directory, `${key}.json`), {
    number: key, youtubeId: key.slice(3), title: 'Existing import', cues: [], captionStatus: 'pending', createdAt: '2025-01-01',
  }));
  await Promise.all([prepareRoadmap(library), library.mutateLecture(key, async () => {
    const item = await library.get(key);
    await writeJSON(path.join(library.directory, `${key}.json`), {...item, cues: [{start: 0, end: 2, en: 'Now ready.'}], captionStatus: 'ready'});
  })]);
  assert.equal((await library.get(key)).captionStatus, 'ready');
  assert.equal((await library.get(key)).cues[0].en, 'Now ready.');
});

test('missing MIT data fails before any library writes', async t => {
  const {root, library} = await fixture(t);
  await rm(path.join(root, 'data/1.json'));
  await assert.rejects(prepareRoadmap(library), {code: 'learning_missing_mit', status: 409});
  assert.deepEqual(await readdir(library.directory), []);
});

test('corrupt existing lecture is not overwritten', async t => {
  const {library} = await fixture(t);
  const file = path.join(library.directory, `${videoKeys[0]}.json`);
  await writeFile(file, '{broken-original');
  await assert.rejects(prepareRoadmap(library), SyntaxError);
  assert.equal(await readFile(file, 'utf8'), '{broken-original');
  assert.deepEqual(await readdir(library.directory), [`${videoKeys[0]}.json`]);
});

test('retry after interrupted folder save reuses completed shells and preserves original folder', async t => {
  const {root, library} = await fixture(t);
  const user = await library.folders.create('Keep this folder');
  const original = await readFile(library.folders.file, 'utf8');
  library.folders.change = async () => { throw new Error('Simulated folder write failure'); };
  await assert.rejects(prepareRoadmap(library), /Simulated folder write failure/);
  assert.equal(await readFile(library.folders.file, 'utf8'), original);
  const result = await prepareRoadmap(new LectureLibrary({root}));
  assert.equal(result.added, 0);
  assert.equal(result.reused, result.total);
  assert.ok((await new LectureLibrary({root}).folders.list()).folders.some(folder => folder.id === user.id));
});

test('CLI --root prepares a real temporary library, repeats cleanly and emits counts only', async t => {
  const {root} = await fixture(t);
  const script = path.join(project, 'scripts/prepare-learning.mjs');
  const options = {cwd: project, windowsHide: true};
  const first = await execute(process.execPath, [script, '--root', root], options);
  const second = await execute(process.execPath, [script, '--root', root], options);
  assert.deepEqual(Object.keys(JSON.parse(first.stdout)).sort(), ['version', 'added', 'reused', 'total', 'phases', 'firstLectureId', 'externalResources', 'captions'].sort());
  assert.equal(JSON.parse(first.stdout).added, videoKeys.length);
  assert.equal(JSON.parse(second.stdout).added, 0);
  assert.equal(JSON.parse(second.stdout).firstLectureId, '1');
  assert.equal(first.stderr + second.stderr, '');
  assert.ok(!first.stdout.includes(root));
  await assert.rejects(execute(process.execPath, [script, '--unexpected'], options), error => error.code === 1 && /Usage:/.test(error.stderr));
});

test('CLI missing-data error returns nonzero with no writes or path disclosure', async t => {
  const {root, library} = await fixture(t);
  await rm(path.join(root, 'data/1.json'));
  await assert.rejects(execute(process.execPath, [path.join(project, 'scripts/prepare-learning.mjs'), '--root', root], {
    cwd: project, windowsHide: true,
  }), error => error.code === 1 && error.stdout === '' && !error.stderr.includes(root));
  assert.deepEqual(await readdir(library.directory), []);
});
