import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {atomicJSON} from '../vault.mjs';

const now=()=>Date.parse('2026-11-16T23:30:00+09:00');
async function fixture(t,options={}){const root=await mkdtemp(path.join(os.tmpdir(),'duvi-learning-store-'));t.after(()=>rm(root,{recursive:true,force:true}));return new LearningStore({root,now,...options});}
const input={resourceId:'mit-01',lectureId:'1',question:'Why?',explanation:'Initial explanation',prediction:'Before',help:'none',anchor:{lectureId:'1',seconds:1,sourceText:'Hello.',translation:'안녕.',alignmentRevision:null,cueStart:0,cueEnd:3}};

test('empty store and saved record survive reconstruction without caller aliases',async t=>{
  const store=await fixture(t);assert.deepEqual(await store.get(),{schemaVersion:1,revision:0,records:[],progress:{},settings:{}});
  const result=await store.saveRecord({revision:0,record:input});assert.equal(result.records[0].schemaVersion,1);assert.equal(result.revision,1);
  result.records[0].question='mutated caller';assert.equal((await new LearningStore({root:store.root}).get()).records[0].question,'Why?');
});
test('same-revision concurrent writers in separate store instances permit exactly one commit',async t=>{
  const store=await fixture(t),other=new LearningStore({root:store.root});
  const results=await Promise.allSettled([store.saveRecord({revision:0,record:input}),other.setProgress({revision:0,resourceId:'mit-01',status:'watching'})]);
  assert.equal(results.filter(row=>row.status==='fulfilled').length,1);assert.equal(results.find(row=>row.status==='rejected').reason.code,'revision_conflict');assert.equal((await store.get()).revision,1);
});
test('updates retain original explanation, previous prediction and assistance; reviews never promote progress',async t=>{
  const store=await fixture(t);const first=await store.saveRecord({revision:0,record:input}),id=first.records[0].id;
  const revised=await store.saveRecord({revision:1,recordRevision:1,record:{...input,id,explanation:'Revised',prediction:'After',help:'full',revisionNote:'Evidence changed'}});
  const record=revised.records[0];assert.equal(record.originalExplanation,'Initial explanation');assert.equal(record.history[0].record.prediction,'Before');assert.equal(record.history[0].record.help,'none');assert.equal(record.explanation,'Revised');
  const reviewed=await store.review({revision:2,id,reflection:'Uncertain transfer',intervalDays:3,help:'partial'});
  assert.equal(reviewed.records[0].reviews[0].nextDueAt,'2026-11-19T14:30:00.000Z');assert.equal(reviewed.records[0].reviews[0].help,'partial');assert.deepEqual(reviewed.progress,{});
  await assert.rejects(store.review({revision:2,id,reflection:'duplicate',intervalDays:3,help:'none'}),{code:'revision_conflict'});assert.equal((await store.get()).records[0].reviews.length,1);
});
test('refreshing global revision cannot overwrite a stale editor record',async t=>{
  const store=await fixture(t),first=await store.saveRecord({revision:0,record:input}),id=first.records[0].id;
  const changed=await store.saveRecord({revision:1,recordRevision:1,record:{...input,id,explanation:'Concurrent edit'}}),before=await readFile(store.file);
  await assert.rejects(store.saveRecord({revision:changed.revision,recordRevision:first.records[0].revision,record:{...input,id,explanation:'Stale overwrite'}}),{code:'revision_conflict',status:409,details:{recordId:id,recordRevision:2}});
  assert.deepEqual(await readFile(store.file),before);assert.equal((await store.get()).records[0].explanation,'Concurrent edit');
  const resolved=await store.saveRecord({revision:changed.revision,recordRevision:2,record:{...input,id,explanation:'Explicitly reconciled'}});assert.equal(resolved.records[0].revision,3);assert.equal(resolved.records[0].history[1].record.explanation,'Concurrent edit');
});
test('record updates require a positive integer recordRevision',async t=>{
  const store=await fixture(t),saved=await store.saveRecord({revision:0,record:input}),id=saved.records[0].id;
  await assert.rejects(async()=>store.saveRecord({revision:1,record:{...input,id}}),{code:'invalid_learning'});
  for(const recordRevision of [undefined,0,'1',1.5])await assert.rejects(async()=>store.saveRecord({revision:1,recordRevision,record:{...input,id}}),{code:'invalid_learning'});
  assert.deepEqual(await store.get(),saved);
});
test('atomic save failure preserves prior bytes and a later write can succeed',async t=>{
  const store=await fixture(t);await store.saveRecord({revision:0,record:input});const before=await readFile(store.file);
  let failed=false;store.writer=async(file,value)=>{if(!failed){failed=true;await writeFile(file+'.tmp','partial');throw new Error('injected disk failure');}return atomicJSON(file,value);};
  await assert.rejects(store.setProgress({revision:1,resourceId:'mit-01',status:'explained'}),/injected disk failure/);
  assert.deepEqual(await readFile(store.file),before);assert.equal((await store.get()).revision,1);
  assert.equal((await store.setProgress({revision:1,resourceId:'mit-01',status:'practicing'})).progress['mit-01'].status,'practicing');
});
test('invalid bounds, paths, reserved IDs, non-finite anchors and unknown properties do not persist',async t=>{
  const store=await fixture(t);
  for(const record of [{...input,resourceId:'../escape'},{...input,resourceId:'constructor'},{...input,question:'x'.repeat(12001)},{...input,access_token:'secret'},{...input,anchor:{...input.anchor,seconds:NaN}},{...input,anchor:{...input.anchor,cueEnd:-1}},{...input,anchor:{...input.anchor,lectureId:undefined}},{...input,lectureId:['1']},{...input,help:'mastered'}])await assert.rejects(async()=>store.saveRecord({revision:0,record}),{code:'invalid_learning'});
  await assert.rejects(async()=>store.setProgress({revision:0,resourceId:'mit-01',status:'mastered'}),{code:'invalid_learning'});
  assert.equal((await store.get()).revision,0);
});
test('corrupt or unsupported persisted state fails closed without resetting data',async t=>{
  const store=await fixture(t);await mkdir(path.dirname(store.file),{recursive:true});await writeFile(store.file,'{broken');
  await assert.rejects(store.get(),SyntaxError);assert.equal(await readFile(store.file,'utf8'),'{broken');
  await writeFile(store.file,JSON.stringify({schemaVersion:2,revision:0,records:[],progress:{},settings:{}}));await assert.rejects(store.get(),{code:'invalid_learning'});
});
