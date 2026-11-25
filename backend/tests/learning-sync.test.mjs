import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {LearningSync, descends} from '../learning-sync.mjs';
import {fingerprint, PROMPT_VERSION} from '../chatgpt-translate.mjs';
import {ALIGNMENT_VERSION} from '../sentence-alignment.mjs';

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

const source = {number: 1, cues: [{start: 0, end: 4, en: 'Hello.'}, {start: 4, end: 8, en: 'Goodbye.'}]};
const stamp = '2026-11-01T00:00:00.000Z';
const cache = {version: 1, lecture: 1, sourceHash: fingerprint(source), promptVersion: PROMPT_VERSION,
  alignmentVersion: ALIGNMENT_VERSION, alignmentRevision: '1cd21c62-f50d-429c-b45e-81943c286df8', timing: 'estimated-from-source-cues',
  cues: source.cues, updatedAt: stamp, translations: {0: {ko: '안녕하세요.', model: 'test', updatedAt: stamp}, 1: {ko: '안녕히 가세요.', model: 'test', updatedAt: stamp}}};
async function save(pc, file, value) {
  await mkdir(path.dirname(path.join(pc.root, file)), {recursive: true});
  await writeFile(path.join(pc.root, file), JSON.stringify(value));
}
async function translations(t) {
  const pair = await pcs(t);
  for (const pc of [pair.a, pair.b]) await save(pc, 'data/1.json', source);
  await save(pair.a, 'translations/1.json', cache);
  return pair;
}
test('aligned translations travel as one unit; unchanged files and private checkpoints are not exported again', async t => {
  const {folder, a, b} = await translations(t);
  await save(a, 'translations/1.json.sentences.pending.json', {private: true});
  assert.equal((await a.sync.export()).translationsWritten, 1);
  const dir = path.join(folder, 'translations', a.id);
  assert.deepEqual(await readdir(dir), ['1.json']);
  const modified = (await stat(path.join(dir, '1.json'))).mtimeMs;
  assert.equal((await a.sync.export()).translationsWritten, 0);
  assert.equal((await stat(path.join(dir, '1.json'))).mtimeMs, modified);
  assert.equal((await pull(b, a)).plan.summary.translationsAdded, 1);
  assert.deepEqual(JSON.parse(await readFile(path.join(b.root, 'translations/1.json'))), cache);
});
test('pending caption or library preparation after preview skips translation while importing records',async t=>{
  const {a,b}=await translations(t);await a.store.saveRecord({revision:0,record:question('기록')});await a.sync.export();
  for(const key of ['pending','captionRequests']){
    const plan=await b.sync.preview({deviceId:a.id});b.sync.captions.library[key].set('1',Promise.resolve());
    const result=await b.sync.commit({token:plan.token,revision:plan.revision});
    assert.equal(result.summary.translationsAdded,0);assert.match(result.summary.translationWarnings.join(' '),/작업/);
    assert.equal(result.state.records.length,1);b.sync.captions.library[key].clear();
  }
});
test('more than 526 peer translation files do not trigger an unbounded preview',async t=>{
  const {folder,a,b}=await translations(t);await a.sync.export();
  const dir=path.join(folder,'translations',a.id);
  await Promise.all(Array.from({length:526},(_,i)=>writeFile(path.join(dir,`yt_${String(i).padStart(11,'0')}.json`),'{}')));
  const plan=await b.sync.preview({deviceId:a.id});
  assert.ok(plan.summary.translationWarnings.some(w=>w.includes('526')));
  assert.ok(plan.summary.translationWarnings.length<=527);
});
test('newer local translations and different boundary revisions survive a pull', async t => {
  const {a, b} = await translations(t);
  await a.sync.export();
  for (const edit of [{updatedAt: '2026-11-02T00:00:00Z'}, {alignmentRevision: '4e77777d-9938-4623-ab68-918c0958056d', updatedAt: '2026-10-01T00:00:00Z'}]) {
    const local = {...cache, ...edit};
    await save(b, 'translations/1.json', local);
    assert.equal((await pull(b, a)).summary.translationsKept, 1);
    assert.deepEqual(JSON.parse(await readFile(path.join(b.root, 'translations/1.json'))), local);
  }
});
test('tampered translations are explained and skipped while records merge', async t => {
  const {folder, a, b} = await translations(t);
  await a.store.saveRecord({revision: 0, record: question('테스트 질문')});
  await a.sync.export();
  const file = path.join(folder, 'translations', a.id, '1.json');
  await writeFile(file, (await readFile(file, 'utf8')).replace('안녕하세요.', '바뀐 내용'));
  const {plan, state} = await pull(b, a);
  assert.match(plan.summary.translationWarnings.join(' '), /손상|검증/);
  assert.equal(state.records.length, 1);
  await assert.rejects(stat(path.join(b.root, 'translations/1.json')), {code: 'ENOENT'});
});
test('complete compatible cache replaces partial cache with a recovery copy; source changes after preview skip translation', async t => {
  const {a, b} = await translations(t);
  const partial = {...cache, translations: {0: cache.translations[0]}, updatedAt: '2026-11-12T00:00:00Z'};
  await save(b, 'translations/1.json', partial);
  await a.sync.export();
  const {summary} = await pull(b, a);
  assert.equal(summary.translationsUpdated, 1);
  assert.deepEqual(JSON.parse(await readFile(path.join(b.root, 'learning/before-sync-translations/1.json'))), partial);
  await save(b, 'translations/1.json', partial);
  const plan = await b.sync.preview({deviceId: a.id});
  await save(b, 'data/1.json', {...source, cues: [{start: 0, end: 6, en: 'Different.'}]});
  const result = await b.sync.commit({revision: plan.revision, token: plan.token});
  assert.equal(result.summary.translationsUpdated, 0);
  assert.ok(result.summary.translationWarnings.length);
  assert.deepEqual(JSON.parse(await readFile(path.join(b.root, 'translations/1.json'))), partial);
});
test('translation export refuses a Git tree nested inside the selected cloud folder', async t => {
  const {folder, a} = await translations(t);
  await mkdir(path.join(folder,'translations','.git'), {recursive:true});
  const result = await a.sync.export();
  assert.equal(result.translationsWritten, 0);
  assert.ok(result.translationWarnings.length);
  assert.deepEqual(await readdir(path.join(folder,'translations')), ['.git']);
});

test('a question saved on one PC reaches the other through the folder, without lectures, translations or credentials', async t => {
  const {folder, a, b} = await pcs(t);
  let state = await a.store.saveRecord({revision: 0, record: question('Value의 grad는 왜 처음에 0인가?')});
  await a.store.setProgress({revision: state.revision, resourceId: 'video-VMj-3S1tku0', status: 'watching', completed: true});
  const exported = await a.sync.export();
  assert.equal(exported.records, 1);
  assert.deepEqual(await readdir(folder), [`duvi-sync-${a.id}.json`]);
  const file = JSON.parse(await readFile(path.join(folder, exported.file), 'utf8'));
  assert.deepEqual(Object.keys(file).sort(), ['deviceId', 'deviceName', 'exportedAt', 'format', 'learning', 'schemaVersion']);
  assert.deepEqual(Object.keys(file.learning).sort(), ['attempts', 'chats', 'progress', 'records', 'revision', 'schemaVersion', 'settings']);

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

/** A sent question (automatic record, revision 1) whose AI answer is attached later on the same PC. */
async function asked(pc, text) {
  const message = {id: 'q-' + text.length, role: 'user', text, at: '2026-11-18T00:00:00.000Z', seconds: 7, model: 'gpt-test'};
  const {thread, record} = await pc.store.askQuestion({threadId: null, lectureId: anchor.lectureId, message, record: {...question(text), help: 'none'}});
  return {thread, record, answer: answer => pc.store.appendChat({threadId: thread.id, lectureId: anchor.lectureId,
    messages: [{id: 'a-' + text.length, role: 'assistant', text: answer, at: '2026-11-18T00:01:00.000Z', seconds: 7, model: 'gpt-test', status: 'complete'}],
    answerFor: {recordId: record.id, aiAnswer: answer}})};
}

test('an AI answer attached after a sync is not a conflict, in either direction', async t => {
  const {a, b, tick} = await pcs(t);
  const sent = await asked(a, '왜 0부터 세나요?');
  assert.equal(sent.record.revision, 1);
  await a.sync.export();
  await pull(b, a);
  await b.sync.export();
  tick();
  const {record: answered} = await sent.answer('AI 답변');
  assert.deepEqual([answered.revision, answered.aiAnswer], [1, 'AI 답변'], 'attaching the answer adds no revision');
  // B's file from before the answer arrives at A: A keeps its answered copy.
  const early = await pull(a, b);
  assert.deepEqual([early.summary.conflicts, early.summary.kept], [[], 1]);
  assert.equal(early.state.records[0].aiAnswer, 'AI 답변');
  await a.sync.export();
  const toB = await pull(b, a);
  assert.deepEqual(toB.summary.conflicts, []);
  assert.equal(toB.summary.updated, 1);
  const onB = toB.state.records[0];
  assert.deepEqual([onB.aiAnswer, onB.history.length], ['AI 답변', 0]);
  await b.sync.export();
  const back = await pull(a, b);
  assert.deepEqual(back.summary.conflicts, []);
  assert.deepEqual([back.state.records[0].aiAnswer, back.state.records[0].history.length], ['AI 답변', 0]);
});

test('an explanation written on another PC before the AI answer arrived keeps both, without a conflict', async t => {
  const {a, b, tick} = await pcs(t);
  const sent = await asked(a, '역전파는 왜 거꾸로?');
  await a.sync.export();
  await pull(b, a);
  tick();
  const bState = await b.store.get(), copy = bState.records[0];
  await b.store.saveRecord({revision: bState.revision, recordRevision: copy.revision, record: {id: copy.id, ...question('역전파는 왜 거꾸로?'), explanation: '사무실에서 쓴 내 설명'}});
  tick();
  await sent.answer('AI 답변');
  await a.sync.export();
  const toB = await pull(b, a);
  assert.deepEqual(toB.summary.conflicts, []);
  assert.deepEqual([toB.state.records[0].explanation, toB.state.records[0].aiAnswer], ['사무실에서 쓴 내 설명', 'AI 답변']);
  await b.sync.export();
  const toA = await pull(a, b);
  assert.deepEqual(toA.summary.conflicts, []);
  assert.deepEqual([toA.state.records[0].explanation, toA.state.records[0].aiAnswer], ['사무실에서 쓴 내 설명', 'AI 답변']);
});
