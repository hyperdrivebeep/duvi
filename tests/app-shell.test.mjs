import test from 'node:test';
import assert from 'node:assert/strict';
import {VIEWS,viewElementId,nextView} from '../src/app-shell.mjs';
import {lectureStream,unanswered} from '../src/learning-stream-model.mjs';
import {withThread,lectureNotes} from '../src/learning-chat-model.mjs';
import {curriculumPlace} from '../src/learning-model.mjs';
import {LearningUI} from '../src/learning-ui.mjs';

test('the rail has four destinations; the lecture keeps #study and the others mount at #view-*',()=>{
  assert.deepEqual(VIEWS,['lecture','map','quiz','review']);
  assert.deepEqual(VIEWS.map(viewElementId),['study','view-map','view-quiz','view-review']);
  assert.equal(nextView('lecture','map'),'map');assert.equal(nextView('map','settings'),'map');
});
const message=(id,role,seconds,extra={})=>({id,role,text:`${role} ${id}`,at:`2026-11-24T09:00:${String(seconds%60).padStart(2,'0')}Z`,seconds,model:'m',...extra});
test('a question recorded on sending carries its own record, and an unanswered one can be asked again',()=>{
  const state={chats:[{id:'t1',lectureId:'1',messages:[message('q1','user',22,{recordId:'r1'}),message('a1','assistant',22,{status:'interrupted'}),message('q2','user',40,{recordId:'r2'}),message('a2','assistant',40,{status:'complete'})]}],
    records:[{id:'r1',lectureId:'1',question:'user q1',explanation:'',reviews:[]},{id:'r2',lectureId:'1',question:'user q2',explanation:'내 설명',reviews:[]}]};
  const items=lectureStream(state,'1');
  assert.deepEqual(items.map(item=>[item.key,item.record?.id,item.open,item.explained]),[['t1:q1','r1',true,false],['t1:q2','r2',false,true]]);
  assert.deepEqual(items.map(unanswered),[true,false]);
  assert.equal(unanswered({kind:'record',answers:[]}),false);
});
test('one server write patches the thread and the question record together',()=>{
  const state={revision:3,records:[{id:'old'}],chats:[]},thread={id:'t1',lectureId:'1',messages:[]},record={id:'r1',question:'왜?'};
  const next=withThread(state,thread,4,record);
  assert.deepEqual(next.records.map(row=>row.id),['old','r1']);assert.deepEqual(next.chats,[thread]);
  assert.deepEqual(withThread(next,thread,5,{id:'r1',question:'왜?',aiAnswer:'답'}).records.find(row=>row.id==='r1').aiAnswer,'답');
  assert.equal(withThread(state,thread,4).records,state.records);
});
test('a question recorded from the chat becomes a tutor note only after the learner explains it',()=>{
  const chats=[{messages:[{recordId:'asked'},{recordId:'explained'}]}];
  const records=[{id:'asked',lectureId:'1',question:'열린 질문',explanation:''},{id:'explained',lectureId:'1',question:'설명한 질문',explanation:'내 말'},{id:'note',lectureId:'1',question:'채팅 밖 메모',explanation:''}];
  assert.deepEqual(lectureNotes(records,'1',chats).map(row=>row.question).sort(),['설명한 질문','채팅 밖 메모']);
  assert.equal(lectureNotes(records,'1').length,3);
});
test('the lecture header shows the roadmap phase and position',()=>{
  const roadmap={phases:[{title:'1. Python과 자료 생성',resources:[{lectureId:'1'},{lectureId:'2'}]}]};
  assert.equal(curriculumPlace(roadmap,'2'),'1. Python과 자료 생성 · 2/2');assert.equal(curriculumPlace(roadmap,'9'),'');assert.equal(curriculumPlace(null,'1'),'');
});
test('the first explanation on an open question schedules a review the next day; a scheduled one keeps its date',async()=>{
  const saved=[];const ui=Object.assign(Object.create(LearningUI.prototype),{saveRecord:async record=>{saved.push(record);return record;}});
  const open={id:'r1',revision:1,question:'왜?',explanation:'',reviewDueAt:null};
  const before=Date.now();await ui.saveExplanation({record:open},'내 설명','partial',1);
  const due=Date.parse(saved[0].reviewDueAt);assert.ok(due>=before+86400000-1000&&due<=Date.now()+86400000);
  assert.deepEqual([saved[0].explanation,saved[0].help,saved[0].revision],['내 설명','partial',1]);
  await ui.saveExplanation({record:{...open,reviewDueAt:'2026-12-01T00:00:00.000Z'}},'고침','none',2);
  assert.equal(saved[1].reviewDueAt,'2026-12-01T00:00:00.000Z');
});
