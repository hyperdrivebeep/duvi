import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {LearningSync, descends} from '../learning-sync.mjs';

const anchor = {lectureId: 'yt_VMj-3S1tku0', seconds: 7, sourceText: 'Hello.', translation: '', alignmentRevision: null, cueStart: 5, cueEnd: 9};
const question = text => ({resourceId: 'video-VMj-3S1tku0', lectureId: 'yt_VMj-3S1tku0', question: text, anchor});

async function temp(t, prefix) {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
}
/** Two isolated Duvi data roots ("PCs") sharing one cloud-like folder. */
async function pcs(t) {
  const folder = await temp(t, 'duvi-cloud-');
  let clock = Date.parse('2026-11-18T00:00:00.000Z');
  const now = () => clock;
  const make = async name => {
    const root = await temp(t, `duvi-${name}-`), store = new LearningStore({root, now});
    const sync = new LearningSync({store, now, hostname: name});
    await sync.setFolder({folder});
    return {root, store, sync, id: (await sync.get()).deviceId};
  };
  const a = await make('home-pc'), b = await make('office-pc');
  return {folder, a, b, tick: (ms = 60000) => { clock += ms; }};
}
async function pull(target, source) {
  const plan = await target.sync.preview({deviceId: source.id});
  const result = await target.sync.commit({revision: plan.revision, token: plan.token});
  return {plan, ...result};
}

test('a question saved on one PC reaches the other through the folder, without lectures, translations or credentials', async t => {
  const {folder, a, b} = await pcs(t);
  let state = await a.store.saveRecord({revision: 0, record: question('Value의 grad는 왜 처음에 0인가?')});
  await a.store.setProgress({revision: state.revision, resourceId: 'video-VMj-3S1tku0', status: 'watching', completed: true});
  const exported = await a.sync.export();
  assert.equal(exported.records, 1);
  assert.deepEqual(await readdir(folder), [`duvi-sync-${a.id}.json`]);
  const file = JSON.parse(await readFile(path.join(folder, exported.file), 'utf8'));
  assert.deepEqual(Object.keys(file).sort(), ['deviceId', 'deviceName', 'exportedAt', 'format', 'learning', 'schemaVersion']);
  assert.deepEqual(Object.keys(file.learning).sort(), ['progress', 'records', 'revision', 'schemaVersion', 'settings']);

  assert.deepEqual((await b.sync.get()).peers.map(peer => [peer.deviceName, peer.records]), [['home-pc', 1]]);
  const {plan, state: merged, summary} = await pull(b, a);
  assert.equal(plan.summary.added, 1);
  assert.equal(summary.progressAdded, 1);
  assert.equal(merged.records[0].question, 'Value의 grad는 왜 처음에 0인가?');
  assert.equal(merged.progress['video-VMj-3S1tku0'].completed, true);
  assert.equal(JSON.parse(await readFile(path.join(b.root, 'learning/before-sync.json'), 'utf8')).records.length, 0);
});

test('an edit made on only one PC replaces the older copy and keeps the history', async t => {
  const {a, b, tick} = await pcs(t);
  await a.store.saveRecord({revision: 0, record: question('왜 0인가?')});
  await a.sync.export();
  await pull(b, a);
  tick();
  const copy = (await b.store.get()).records[0];
  const edited = await b.store.saveRecord({revision: (await b.store.get()).revision, recordRevision: copy.revision,
    record: {id: copy.id, ...question('왜 0인가?'), explanation: '더하기 전에 기울기를 모으기 때문이다.'}});
  await b.sync.export();
  const {summary, state} = await pull(a, b);
  assert.equal(summary.updated, 1);
  assert.deepEqual(summary.conflicts, []);
  const record = state.records[0];
  assert.equal(record.explanation, '더하기 전에 기울기를 모으기 때문이다.');
  assert.ok(record.revision >= edited.records[0].revision);
  assert.equal(record.history.length, 1);
  // Pulling back again changes nothing: B already has every change.
  await a.sync.export();
  const again = await pull(b, a);
  assert.equal(again.summary.updated + again.summary.added + again.summary.conflicts.length, 0);
});

test('edits on both PCs keep the later edit current and the other edit in labelled history; reviews are combined', async t => {
  const {a, b, tick} = await pcs(t);
  await a.store.saveRecord({revision: 0, record: question('역전파 순서?')});
  await a.sync.export();
  await pull(b, a);
  const base = (await a.store.get()).records[0];
  tick();
  await a.store.review({revision: (await a.store.get()).revision, id: base.id, reflection: '집에서 회상', intervalDays: 3, help: 'none'});
  tick();
  const bState = await b.store.get();
  await b.store.saveRecord({revision: bState.revision, recordRevision: bState.records[0].revision,
    record: {id: base.id, ...question('역전파 순서?'), explanation: '사무실에서 쓴 설명'}});
  await b.sync.export();
  const {summary, state} = await pull(a, b);
  assert.equal(summary.conflicts.length, 1);
  const record = state.records[0];
  assert.equal(record.explanation, '사무실에서 쓴 설명');
  assert.equal(record.reviews.length, 1);
  assert.equal(record.reviews[0].reflection, '집에서 회상');
  const kept = record.history.at(-1);
  assert.equal(kept.device, 'home-pc');
  assert.equal(kept.record.explanation, '');
  assert.ok(record.revision > Math.max(...record.history.map(entry => entry.revision)));
  assert.ok(Date.parse(record.reviewDueAt) > Date.parse(base.updatedAt));
});

test('the newer local copy is kept and later progress wins per resource, including undoing completion', async t => {
  const {a, b, tick} = await pcs(t);
  let state = await a.store.saveRecord({revision: 0, record: question('첫 질문')});
  state = await a.store.setProgress({revision: state.revision, resourceId: 'mit-1', status: 'watching', completed: true});
  await a.sync.export();
  await pull(b, a);
  await b.sync.export();
  tick();
  const local = (await a.store.get()).records[0];
  state = await a.store.saveRecord({revision: state.revision, recordRevision: local.revision, record: {id: local.id, ...question('첫 질문'), explanation: '집에서 더 고침'}});
  tick();
  const bState = await b.store.get();
  await b.store.setProgress({revision: bState.revision, resourceId: 'mit-1', status: 'watching', completed: false});
  await b.sync.export();
  const {summary, state: merged} = await pull(a, b);
  assert.equal(summary.kept, 1);
  assert.equal(merged.records[0].explanation, '집에서 더 고침');
  assert.equal(summary.progressUpdated, 1);
  assert.equal(merged.progress['mit-1'].completed, false);
});

test('folders inside a Git work tree, the Duvi data folder, missing folders and relative paths are refused', async t => {
  const {a} = await pcs(t);
  const repository = await temp(t, 'duvi-git-'), nested = path.join(repository, 'notes', 'sync');
  await mkdir(path.join(repository, '.git'));
  await mkdir(nested, {recursive: true});
  for (const folder of [nested, path.join(a.root, 'learning'), path.join(repository, 'missing'), 'relative/sync'])
    await assert.rejects(a.sync.setFolder({folder}), {code: 'invalid_learning'});
  const cleared = await a.sync.setFolder({folder: ''});
  assert.equal(cleared.folder, null);
  await assert.rejects(a.sync.export(), {code: 'sync_folder_required'});
});

test('preview tokens expire, detect changes after preview and reject tampered or mismatched files', async t => {
  const {folder, a, b, tick} = await pcs(t);
  await a.store.saveRecord({revision: 0, record: question('토큰')});
  await a.sync.export();
  const stale = await b.sync.preview({deviceId: a.id});
  await b.store.saveRecord({revision: 0, record: question('미리보기 뒤 새 기록')});
  await assert.rejects(b.sync.commit({revision: 1, token: stale.token}), {code: 'import_conflict'});
  const expiring = await b.sync.preview({deviceId: a.id});
  tick(600001);
  await assert.rejects(b.sync.commit({revision: 1, token: expiring.token}), {code: 'invalid_preview'});
  await assert.rejects(b.sync.preview({deviceId: b.id}), {code: 'invalid_learning'});

  const file = path.join(folder, `duvi-sync-${a.id}.json`), original = JSON.parse(await readFile(file, 'utf8'));
  for (const edit of [value => { value.deviceId = b.id; }, value => { value.format = 'other'; }, value => { value.credentials = {access_token: 'secret'}; },
    value => { value.learning.records[0].access_token = 'secret'; }]) {
    const candidate = structuredClone(original); edit(candidate);
    await writeFile(file, JSON.stringify(candidate));
    await assert.rejects(b.sync.preview({deviceId: a.id}), {code: 'invalid_learning'});
  }
  assert.equal((await b.store.get()).records.length, 1);
});

test('descends recognises a copied-then-edited record and rejects a sibling edit', () => {
  const record = {resourceId: 'r', lectureId: null, title: '', question: 'q', explanation: '', observation: '', assumptions: '', alternative: '', prediction: '', result: '', revisionNote: '', help: 'none', anchor: null, reviewDueAt: null};
  const older = {...record, revision: 1, history: [], reviews: []};
  const newer = {...record, explanation: 'x', revision: 2, history: [{revision: 1, at: '2026-11-18T00:00:00.000Z', record}], reviews: []};
  const sibling = {...record, explanation: 'y', revision: 2, history: [{revision: 1, at: '2026-11-18T00:00:00.000Z', record}], reviews: []};
  assert.equal(descends(newer, older), true);
  assert.equal(descends(older, newer), false);
  assert.equal(descends(newer, sibling), false);
});
