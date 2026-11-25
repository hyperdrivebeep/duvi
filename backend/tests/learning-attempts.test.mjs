import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {LearningBackup} from '../learning-backup.mjs';
import {LectureLibrary} from '../library.mjs';
import {mergeLearning,mergeAttempt} from '../learning-sync.mjs';
import * as v from '../learning-validation.mjs';

const at=minute=>`2026-11-24T10:${String(minute).padStart(2,'0')}:00.000Z`;
const item={type:'predict',prompt:'7 // 2 는?',options:['3.5','3'],answer:'3',source:{kind:'transcript',ref:'08:41'},quote:'',concepts:['정수 나눗셈']};
const attempt=(id,extra={})=>({id,lectureId:'1',segmentId:'s0',itemId:'item-1',item:structuredClone(item),evidence:'ai_unverified',prediction:'3.5',confidence:'high',result:'wrong',grading:'option',explanation:'',createdAt:at(1),updatedAt:at(1),revision:1,reviewDueAt:at(1).replace('24T','25T'),...extra});
async function root(t){const dir=await mkdtemp(path.join(os.tmpdir(),'duvi-attempts-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}

test('version 2 state migrates to version 3 with an empty attempt list; invalid attempts fail closed',async t=>{
  const store=new LearningStore({root:await root(t)});await mkdir(path.dirname(store.file),{recursive:true});
  await writeFile(store.file,JSON.stringify({schemaVersion:2,revision:7,records:[],progress:{},settings:{},chats:[]}));
  assert.deepEqual(await store.get(),{schemaVersion:3,revision:7,records:[],progress:{},settings:{},chats:[],attempts:[]});
  await store.write(current=>{current.attempts.push(attempt('a1'));});
  const saved=JSON.parse(await readFile(store.file,'utf8'));assert.equal(saved.schemaVersion,3);assert.equal(saved.attempts[0].id,'a1');
  for(const mutate of [a=>{a.evidence='ai_verified';},a=>{a.confidence='sure';},a=>{a.item.type='execute';},a=>{a.secret='x';},a=>{a.item.source.kind='web';},a=>{a.lectureId='../x';}]){
    const candidate=attempt('bad');mutate(candidate);assert.throws(()=>v.attempt(candidate),{code:'invalid_learning'});
  }
  assert.throws(()=>v.state({...v.emptyState(),attempts:[attempt('a1'),attempt('a1')]}),{code:'invalid_learning'});
});

test('sync merges attempts by id: new ones are added and the later explanation edit wins',()=>{
  const local={...v.emptyState(),attempts:[attempt('a1'),attempt('a2',{explanation:'로컬',updatedAt:at(5),revision:2})]};
  const incoming={...v.emptyState(),attempts:[attempt('a1',{explanation:'다른 PC 설명',updatedAt:at(3),revision:2}),attempt('a2',{explanation:'오래된',updatedAt:at(2),revision:2}),attempt('a3')]};
  const {learning,summary}=mergeLearning(local,incoming,{localDevice:'A',incomingDevice:'B'});
  const byId=Object.fromEntries(learning.attempts.map(row=>[row.id,row]));
  assert.equal(byId.a1.explanation,'다른 PC 설명');assert.equal(byId.a2.explanation,'로컬');assert.ok(byId.a3);
  assert.equal(summary.attemptsAdded,1);assert.equal(summary.attemptsUpdated,1);
  assert.deepEqual(mergeAttempt(attempt('a1'),attempt('a1')),{attempt:attempt('a1'),changed:false});
  assert.doesNotThrow(()=>v.state({...learning,revision:1}));
});

test('backup preview counts attempts and merge restore keeps local copies while adding new ones',async t=>{
  const sourceRoot=await root(t),targetRoot=await root(t);
  const source=new LearningStore({root:sourceRoot}),target=new LearningStore({root:targetRoot});
  await source.write(current=>{current.attempts.push(attempt('a1',{explanation:'백업본'}),attempt('a2'));});
  await target.write(current=>{current.attempts.push(attempt('a1',{explanation:'이 PC'}));});
  const exported=await new LearningBackup({store:source,library:new LectureLibrary({root:sourceRoot})}).export();
  const restore=new LearningBackup({store:target,library:new LectureLibrary({root:targetRoot})}),preview=await restore.preview({backup:exported});
  assert.equal(preview.counts.attempts,2);assert.deepEqual(preview.conflicts.attempts,['a1']);
  const merged=await restore.commit({revision:1,token:preview.token,mode:'merge'});
  assert.deepEqual(merged.attempts.map(row=>[row.id,row.explanation]).sort(),[['a1','이 PC'],['a2','']]);
});

test('attempt copies with the same updatedAt are decided by revision, so both PCs keep the same copy',()=>{
  const first=attempt('a1',{explanation:'첫 설명',updatedAt:at(4),revision:2}),second=attempt('a1',{explanation:'고친 설명',updatedAt:at(4),revision:3});
  assert.deepEqual(mergeAttempt(first,second),{attempt:second,changed:true});
  assert.deepEqual(mergeAttempt(second,first),{attempt:second,changed:false});
  const tie=attempt('a1',{explanation:'다른 PC',updatedAt:at(4),revision:2});
  assert.deepEqual(mergeAttempt(first,tie),{attempt:first,changed:false},'a full tie keeps the local copy');
});
