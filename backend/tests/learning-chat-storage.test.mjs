import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {LearningBackup} from '../learning-backup.mjs';
import {LectureLibrary} from '../library.mjs';
import {mergeLearning,mergeThread} from '../learning-sync.mjs';
import * as v from '../learning-validation.mjs';
import {atomicJSON} from '../vault.mjs';

const at=minute=>`2026-11-18T10:${String(minute).padStart(2,'0')}:00.000Z`;
const message=(id,role,minute,extra={})=>({id,role,text:`${role} ${id}`,at:at(minute),seconds:minute*10,model:'gpt-test',...extra});
const thread=(id,messages,extra={})=>({id,lectureId:'1',title:'첫 질문',createdAt:at(0),updatedAt:messages.at(-1)?.at||at(0),messages,...extra});
async function root(t){const dir=await mkdtemp(path.join(os.tmpdir(),'duvi-chat-store-'));t.after(()=>rm(dir,{recursive:true,force:true}));return dir;}

test('a version 1 learning file migrates to version 2 with an empty chat list and is written back as version 2',async t=>{
  const store=new LearningStore({root:await root(t)});await mkdir(path.dirname(store.file),{recursive:true});
  await writeFile(store.file,JSON.stringify({schemaVersion:1,revision:4,records:[],progress:{},settings:{}}));
  assert.deepEqual(await store.get(),{schemaVersion:2,revision:4,records:[],progress:{},settings:{},chats:[]});
  await store.appendChat({threadId:null,lectureId:'1',messages:[message('m1','user',1)]});
  const saved=JSON.parse(await readFile(store.file,'utf8'));assert.equal(saved.schemaVersion,2);assert.equal(saved.revision,5);assert.equal(saved.chats[0].messages[0].text,'user m1');
});
test('chat validation rejects unknown roles, keys, oversized text, bad lecture ids and duplicate messages',()=>{
  const valid=thread('t1',[message('m1','user',1),message('m2','assistant',2,{status:'stopped',recordId:'r1'})]);
  assert.deepEqual(v.chatThread(structuredClone(valid)),valid);
  for(const mutate of [t=>{t.messages[0].role='system';},t=>{t.messages[0].token='secret';},t=>{t.messages[0].text='x'.repeat(4001);},t=>{t.lectureId='../accounts';},t=>{t.messages[1].id='m1';},t=>{t.messages[1].status='done';},t=>{t.messages[0].at='yesterday';}]){
    const copy=structuredClone(valid);mutate(copy);assert.throws(()=>v.chatThread(copy),{code:'invalid_learning'});
  }
  assert.throws(()=>v.state({...v.emptyState(),chats:[valid,valid]}),{code:'invalid_learning'});
});
test('appendChat keeps one thread per conversation, refuses other lectures and full threads',async t=>{
  const store=new LearningStore({root:await root(t)});
  const first=await store.appendChat({threadId:null,lectureId:'1',messages:[message('m1','user',1)]});
  const second=await store.appendChat({threadId:first.thread.id,lectureId:'1',messages:[message('m2','assistant',2)]});
  assert.equal(second.thread.id,first.thread.id);assert.deepEqual(second.thread.messages.map(row=>row.id),['m1','m2']);assert.equal(second.revision,first.revision+1);
  await assert.rejects(store.appendChat({threadId:first.thread.id,lectureId:'2',messages:[message('m3','user',3)]}),{code:'invalid_learning'});
  const many=Array.from({length:v.CHAT_LIMITS.messages-2},(_,i)=>message(`f${i}`,'user',5));
  await store.appendChat({threadId:first.thread.id,lectureId:'1',messages:many});
  await assert.rejects(store.appendChat({threadId:first.thread.id,lectureId:'1',messages:[message('over','user',6)]}),{code:'chat_full',status:409});
});
test('a record saved from chat keeps its AI answer through edits and history; other records have none',async t=>{
  const store=new LearningStore({root:await root(t)});
  const base={resourceId:'mit-1',lectureId:'1',question:'왜?',aiAnswer:'AI 답변'};
  const created=await store.saveRecord({revision:0,record:base}),record=created.records[0];assert.equal(record.aiAnswer,'AI 답변');
  const edited=await store.saveRecord({revision:1,recordRevision:1,record:{...base,id:record.id,explanation:'내 설명'}});
  assert.equal(edited.records[0].aiAnswer,'AI 답변');assert.equal(edited.records[0].history[0].record.aiAnswer,'AI 답변');
  const plain=await store.saveRecord({revision:2,record:{resourceId:'mit-1',question:'그냥 질문'}});assert.equal('aiAnswer' in plain.records[1],false);
});
async function backupFixture(t){
  const dir=await root(t);await atomicJSON(path.join(dir,'data/1.json'),{number:1,title:'Lecture',videoUrl:'https://ocw.mit.edu/fixture.mp4',cues:[{start:0,end:3,en:'Hello.'}]});
  const store=new LearningStore({root:dir});return {dir,store,service:new LearningBackup({store,library:new LectureLibrary({root:dir}),translations:{}})};
}
test('backup carries chat threads; merge keeps the local copy, replace takes the backup',async t=>{
  const source=await backupFixture(t);
  const {thread:saved}=await source.store.appendChat({threadId:null,lectureId:'1',messages:[message('m1','user',1),message('m2','assistant',2)]});
  const exported=await source.service.export();assert.deepEqual(exported.learning.chats,[saved]);
  const empty=await backupFixture(t),preview=await empty.service.preview({backup:exported});
  assert.equal(preview.counts.chats,1);assert.deepEqual(preview.conflicts.chats,[]);
  assert.deepEqual((await empty.service.commit({revision:0,token:preview.token,mode:'merge'})).chats,[saved]);
  await source.store.appendChat({threadId:saved.id,lectureId:'1',messages:[message('m3','user',3)]});
  const incoming=structuredClone(exported);incoming.learning.chats[0].title='백업 제목';
  const conflict=await source.service.preview({backup:incoming});assert.deepEqual(conflict.conflicts.chats,[saved.id]);
  const merged=await source.service.commit({revision:conflict.revision,token:conflict.token,mode:'merge'});assert.equal(merged.chats[0].messages.length,3);
  const again=await source.service.preview({backup:incoming});
  const replaced=await source.service.commit({revision:again.revision,token:again.token,mode:'replace'});assert.equal(replaced.chats[0].title,'백업 제목');assert.equal(replaced.chats[0].messages.length,2);
});
test('sync merges threads as the union of both PCs messages and counts what changed',()=>{
  const local=thread('t1',[message('a','user',1),message('b','assistant',2)]);
  const remote=thread('t1',[message('a','user',1),message('b','assistant',2,{recordId:'r1'}),message('c','user',5),message('d','assistant',6)]);
  const {thread:merged,changed}=mergeThread(local,remote);
  assert.equal(changed,true);assert.deepEqual(merged.messages.map(row=>row.id),['a','b','c','d']);assert.equal(merged.messages[1].recordId,'r1');assert.equal(merged.updatedAt,at(6));
  assert.equal(mergeThread(merged,local).changed,false);
  const current={...v.emptyState(),chats:[local]},incoming={...v.emptyState(),chats:[remote,thread('t2',[message('x','user',7)])]};
  const {learning,summary}=mergeLearning(current,incoming,{localDevice:'office',incomingDevice:'home'});
  assert.deepEqual([summary.chatsAdded,summary.chatsUpdated],[1,1]);assert.deepEqual(learning.chats.map(row=>row.id),['t1','t2']);
  assert.doesNotThrow(()=>v.state(learning));
});
test('an explanation written under a chat answer is saved on its record apart from the AI answer and survives a sync merge',async t=>{
  const store=new LearningStore({root:await root(t)});
  const {thread:saved}=await store.appendChat({threadId:null,lectureId:'1',messages:[message('q','user',1),message('a','assistant',2)]});
  const anchor={lectureId:'1',seconds:10,sourceText:'Hello.',translation:'',alignmentRevision:null,cueStart:0,cueEnd:20};
  let {state,recordId}=await store.saveChatRecord({threadId:saved.id,messageId:'a',record:{resourceId:'mit-1',lectureId:'1',question:'user q',aiAnswer:'assistant a',help:'full',anchor}});
  const asked=state.records.find(row=>row.id===recordId);assert.equal(asked.explanation,'');
  const {schemaVersion,revision,createdAt,updatedAt,originalExplanation,history,reviews,...input}=asked;
  state=await store.saveRecord({revision:state.revision,recordRevision:asked.revision,record:{...input,explanation:'내 말로 쓴 설명',help:'partial'}});
  const explained=state.records[0];
  assert.deepEqual([explained.explanation,explained.aiAnswer,explained.help,explained.history.length],['내 말로 쓴 설명','assistant a','partial',1]);
  assert.equal(state.chats[0].messages[1].recordId,recordId);
  // A PC that still holds the question-only copy does not undo the explanation or the chat link.
  const {learning}=mergeLearning(state,{...v.emptyState(),records:[asked],chats:[thread(saved.id,[message('q','user',1),message('a','assistant',2)])]},{localDevice:'office',incomingDevice:'home'});
  assert.equal(learning.records[0].explanation,'내 말로 쓴 설명');assert.equal(learning.chats[0].messages[1].recordId,recordId);
  assert.deepEqual(v.state(structuredClone(state)),state);
});
