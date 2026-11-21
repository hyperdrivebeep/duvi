import test from 'node:test';
import assert from 'node:assert/strict';
import {lectureStream,filterStream,streamCounts,nowIndex,stripWindow,stripWindows,stripMarkers} from '../src/learning-stream-model.mjs';
import {typingAnchor,questionSeconds,contextRange,chatContextChoice,lectureNoteCount,CHAT_CONTEXT_KEY} from '../src/learning-chat-model.mjs';

const message=(id,role,seconds,extra={})=>({id,role,text:`${role} ${id}`,at:`2026-11-21T09:00:${String(seconds%60).padStart(2,'0')}Z`,seconds,model:'m',...extra});
const record=(id,seconds,extra={})=>({id,lectureId:'1',question:`q ${id}`,explanation:'',anchor:{lectureId:'1',seconds},createdAt:'2026-11-21T08:00:00Z',reviews:[],...extra});
const state={
  chats:[
    {id:'t1',lectureId:'1',messages:[message('u1','user',185),message('a1','assistant',185,{recordId:'r1'}),message('u2','user',72),message('a2','assistant',72)]},
    {id:'t2',lectureId:'2',messages:[message('x','user',10)]},
  ],
  records:[record('r1',185,{explanation:'내 말로 쓴 설명',aiAnswer:'AI 답'}),record('r2',30),record('r3',40,{lectureId:'2',anchor:{lectureId:'2',seconds:40}})],
};

test('one lecture stream orders chat questions and other records by lecture time and keeps my explanation apart from the AI answer',()=>{
  const items=lectureStream(state,1);
  assert.deepEqual(items.map(item=>item.key),['record:r2','t1:u2','t1:u1']);
  const saved=items.find(item=>item.key==='t1:u1');
  assert.deepEqual(saved.answers.map(row=>row.id),['a1']);assert.equal(saved.record.id,'r1');
  assert.equal(saved.explained,true);assert.equal(saved.open,false);assert.equal(saved.record.aiAnswer,'AI 답');
  // A chat question without a saved record and a record without an explanation are both open questions.
  assert.deepEqual(items.map(item=>item.open),[true,true,false]);
  assert.deepEqual(streamCounts(items),{all:3,open:2});
  assert.deepEqual(filterStream(items,'open').map(item=>item.key),['record:r2','t1:u2']);
  assert.deepEqual(lectureStream({chats:[],records:[]},'1'),[]);
});
test('the 지금 line sits before the first question asked later than the playback time',()=>{
  const items=lectureStream(state,'1');
  assert.equal(nowIndex(items,0),0);assert.equal(nowIndex(items,72),2);assert.equal(nowIndex(items,196),3);
});
test('the time strip shows ten-minute spans, the last one ending with the lecture',()=>{
  assert.deepEqual(stripWindow(196,3809),{start:0,end:600});
  assert.deepEqual(stripWindow(3700,3809),{start:3600,end:3809});
  assert.deepEqual(stripWindow(5000,3809),{start:3600,end:3809});
  const windows=stripWindows(3809);assert.equal(windows.length,7);assert.equal(windows[0].label,'00:00–10:00');assert.equal(windows.at(-1).label,'60:00–63:29');
  assert.deepEqual(stripWindows(0),[{start:0,end:600,label:'00:00–10:00'}]);
});
test('markers are filled for my explanation, hollow for an open question, and placed inside their span',()=>{
  const markers=stripMarkers(lectureStream(state,'1'),{start:0,end:600});
  assert.deepEqual(markers.map(row=>[row.seconds,row.filled,Number(row.left.toFixed(3))]),[[30,false,0.05],[72,false,0.12],[185,true,0.308]]);
  assert.match(markers[2].label,/^03:05 · 내 설명 있음 · user u1$/);
  assert.deepEqual(stripMarkers(lectureStream(state,'1'),{start:600,end:1200}),[]);
});
test('a question keeps the time the learner started typing; clearing the text or × lets the send time be used',()=>{
  let anchor=typingAnchor(null,'변',192);assert.equal(anchor,192);
  anchor=typingAnchor(anchor,'변수가',200);assert.equal(anchor,192);
  assert.equal(questionSeconds(anchor,230),192);
  assert.equal(typingAnchor(anchor,'  ',240),null);
  assert.equal(typingAnchor('detached','변수가 뭐',250),'detached');assert.equal(questionSeconds('detached',251),251);
  assert.equal(questionSeconds(null,252),252);
});
test('send-context labels and choices: ±60 s of transcript, this lecture\'s notes, both on by default',()=>{
  assert.equal(contextRange(192),'02:12–04:12');assert.equal(contextRange(20),'00:00–01:20');
  const storage=values=>({getItem:key=>values[key]??null});
  assert.deepEqual(chatContextChoice(storage({})),{transcript:true,notes:true});
  assert.deepEqual(chatContextChoice(storage({[CHAT_CONTEXT_KEY]:'{"notes":false}'})),{transcript:true,notes:false});
  assert.deepEqual(chatContextChoice(storage({[CHAT_CONTEXT_KEY]:'not json'})),{transcript:true,notes:true});
  assert.equal(lectureNoteCount(state.records,1),2);assert.equal(lectureNoteCount(state.records,'2'),1);
  const notes=[record('a',1,{question:'x'.repeat(4000),updatedAt:'2026-11-21'}),record('b',2,{updatedAt:'2026-11-20'})];
  assert.equal(lectureNoteCount(notes,1),1);
});
