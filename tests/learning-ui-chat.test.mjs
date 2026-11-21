import test from 'node:test';
import assert from 'node:assert/strict';
import {parseEvents,textSegments,parseClock,composerAction,lectureThreads,withThread,chatAutoPause,CHAT_AUTOPAUSE_KEY} from '../src/learning-chat-model.mjs';
import {recordInput} from '../src/learning-ui.mjs';
import {recordMarkdown} from '../src/learning-model.mjs';
import {ChatPanel} from '../src/learning-chat.mjs';

test('switching lectures isolates the draft and typing time, including a failure arriving after the switch',async()=>{
  let lectureId='1',reject;
  const panel=Object.assign(Object.create(ChatPanel.prototype),{questions:new Map(),input:{value:''},capture:()=>({lectureId}),getState:()=>({chats:[]}),time:()=>300,editing:new Set(),notice:{},fit(){},render(){},reveal(){},hideCite(){},liveNode(){},autoPause:{checked:false},modelSelect:{value:'m'},sendTranscript:{input:{checked:true}},sendNotes:{input:{checked:false}},stream:()=>new Promise((_resolve,no)=>{reject=no;})});
  panel.sync();panel.input.value='첫 강의';panel.anchor=72;
  lectureId='2';panel.sync();assert.deepEqual([panel.input.value,panel.anchor],['',null]);panel.input.value='둘째 강의';panel.anchor='detached';
  lectureId='1';panel.sync();assert.deepEqual([panel.input.value,panel.anchor],['첫 강의',72]);
  const pending=panel.send();lectureId='2';panel.sync();reject(new Error('연결 실패'));await pending;
  assert.deepEqual([panel.input.value,panel.anchor,panel.notice.textContent],['둘째 강의','detached','']);
  lectureId='1';panel.sync();assert.deepEqual([panel.input.value,panel.anchor],['첫 강의',72]);
});

test('server-sent events split across network chunks are delivered once complete',()=>{
  const first=parseEvents('event: start\ndata: {"a":1}\n\nevent: delta\ndata: {"text":"반');
  assert.deepEqual(first.events,[{event:'start',data:{a:1}}]);
  const second=parseEvents(first.rest+'쯤"}\n\n');
  assert.deepEqual(second.events,[{event:'delta',data:{text:'반쯤'}}]);assert.equal(second.rest,'');
});
test('[mm:ss] and [h:mm:ss] references become seek targets; other brackets stay text',()=>{
  assert.deepEqual(textSegments('먼저 [01:40] 장면, 그다음 [1:02:03]. [참고]'),[{text:'먼저 '},{label:'01:40',seconds:100},{text:' 장면, 그다음 '},{label:'1:02:03',seconds:3723},{text:'. [참고]'}]);
  assert.deepEqual(textSegments('시각 없음'),[{text:'시각 없음'}]);assert.equal(parseClock('10:05'),605);
});
test('Enter sends, Shift+Enter adds a line, and Enter while composing Korean does neither',()=>{
  assert.equal(composerAction({key:'Enter'}),'send');
  assert.equal(composerAction({key:'Enter',shiftKey:true}),'newline');
  assert.equal(composerAction({key:'Enter',isComposing:true}),null);
  assert.equal(composerAction({key:'Enter',keyCode:229}),null);
  assert.equal(composerAction({key:'a'}),null);
});
test('threads list per lecture with the latest first; one server change patches state, more forces a reload',()=>{
  const chats=[{id:'a',lectureId:'1',updatedAt:'2026-11-18T10:00:00Z'},{id:'b',lectureId:'2',updatedAt:'2026-11-18T11:00:00Z'},{id:'c',lectureId:'1',updatedAt:'2026-11-18T12:00:00Z'}];
  assert.deepEqual(lectureThreads(chats,1).map(row=>row.id),['c','a']);
  const state={revision:4,records:[],chats},updated={id:'a',lectureId:'1',updatedAt:'2026-11-18T13:00:00Z'};
  const next=withThread(state,updated,5);assert.equal(next.revision,5);assert.deepEqual(lectureThreads(next.chats,'1').map(row=>row.id),['a','c']);assert.equal(state.chats[0].updatedAt,'2026-11-18T10:00:00Z');
  assert.equal(withThread(state,updated,7),null);
});
test('auto-pause on send defaults on and remembers off',()=>{
  const storage=new Map();const harness={getItem:key=>storage.get(key)??null};
  assert.equal(chatAutoPause(harness),true);storage.set(CHAT_AUTOPAUSE_KEY,'off');assert.equal(chatAutoPause(harness),false);
  assert.equal(chatAutoPause({getItem(){throw new Error('blocked');}}),true);
});
test('a record saved from chat keeps its AI answer when edited and in Markdown, labelled as a suggestion',()=>{
  const record={id:'r1',resourceId:'mit-1',lectureId:'1',title:'',question:'왜?',explanation:'',observation:'',assumptions:'',alternative:'',prediction:'',result:'',revisionNote:'',aiAnswer:'냄비 비유',help:'none',anchor:null,reviewDueAt:null};
  assert.equal(recordInput(record).aiAnswer,'냄비 비유');
  assert.match(recordMarkdown(record),/## AI 튜터 답변 \(제안 · 질문하기에서 저장\)\n\n냄비 비유/);
  assert.doesNotMatch(recordMarkdown({...record,aiAnswer:undefined}),/AI 튜터 답변/);
});
