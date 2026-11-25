import test from 'node:test';
import {readFile} from 'node:fs/promises';
test('settings displays the active subscription instead of a successful callback message',async()=>{
  const {accountStatusText}=await import('../src/app-shell.mjs');
  const active={connected:true,planEnabled:true};
  assert.equal(accountStatusText(active,{authMessage:'ChatGPT 연결이 완료되었습니다.'}),'ChatGPT 구독 사용 중');
  assert.equal(accountStatusText(active,{authConnectFailed:true,authMessage:'다시 연결하세요.'}),'다시 연결하세요.');
  assert.equal(accountStatusText(active,{},'연결 요청 실패'),'연결 요청 실패');
});
import {installDom,createRoot} from './fake-dom.mjs';

test('Escape and confirmation persist the welcome dismissal without reopening on a stale poll',async()=>{
  const {setupWelcome}=await import('../src/app-shell.mjs');
  const undo=installDom();
  try{
    const dialog=createRoot(),confirm=createRoot(),error=createRoot(),acks=[];
    dialog.open=false;dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;};
    const welcome=setupWelcome({dialog,confirm,error,acknowledge:async()=>{acks.push(true);}});
    const a={id:'a',needsWelcome:true};
    welcome.update(a);
    assert.equal(dialog.dispatch('cancel').defaultPrevented,true);
    await Promise.resolve();
    welcome.update(a);assert.equal(dialog.open,false);assert.equal(acks.length,1);
    welcome.update({id:'b',needsWelcome:true});assert.equal(dialog.open,true);
    confirm.click();await Promise.resolve();assert.equal(dialog.open,false);assert.equal(acks.length,2);
  }finally{undo();}
});
test('welcome information is repeated in the ChatGPT settings section',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const copy=html.match(/id="welcome"[^>]*><h2[^>]*>[^<]+<\/h2><p>([^<]+)<\/p>/)?.[1];
  assert.ok(copy);assert.ok(html.split('<h3>ChatGPT 연결</h3>')[1].split('<hr>')[0].includes(copy));
});
import assert from 'node:assert/strict';
import {VIEWS,viewElementId,nextView,installLectureKeys} from '../src/app-shell.mjs';
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
import {setupShell} from '../src/app-shell.mjs';
import {routeTarget,segmentIdAt,ROUTE_KINDS} from '../src/app-routes.mjs';
import {sendSettingsSummary} from '../src/learning-chat-model.mjs';
test('switching rail views only hides sections; the lecture stage keeps the same media element and is shown again',()=>{
  const saved=globalThis.document,node=(id,extra={})=>({id,hidden:false,attributes:{},dataset:{},setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},removeAttribute(k){delete this.attributes[k];},getClientRects:()=>[{}],focus(){},contains:()=>false,addEventListener(){},...extra});
  const video=node('video'),study=node('study',{children:[video]});
  const nodes={study,video,'view-map':node('view-map',{hidden:true}),'view-quiz':node('view-quiz',{hidden:true}),'view-review':node('view-review',{hidden:true}),libraryPanel:node('libraryPanel',{hidden:true}),openLibrary:node('openLibrary'),closeLibrary:node('closeLibrary'),librarySearch:node('librarySearch')};
  const items=['lecture','map','quiz','review'].map(view=>node(`rail-${view}`,{dataset:{view}}));
  globalThis.document={getElementById:id=>nodes[id],querySelectorAll:()=>items,activeElement:null};
  try{
    const shown=[],shell=setupShell({onShow:(view,previous)=>shown.push(`${previous}>${view}`)});
    shell.show('quiz');assert.equal(study.hidden,true);assert.equal(nodes['view-quiz'].hidden,false);assert.equal(items[2].getAttribute('aria-current'),'page');
    items[3].onclick();shell.show('settings');assert.equal(shell.current(),'review');
    shell.show('lecture');assert.equal(study.hidden,false);assert.equal(study.children[0],video);assert.equal(nodes.video,video);
    assert.deepEqual(shown,['lecture>quiz','quiz>review','review>lecture']);
    shell.show('lecture');assert.equal(shown.length,3,'showing the current view again does not re-run onShow');
  }finally{globalThis.document=saved;}
});
test('open(target) from the quiz and review modules reaches one handler per kind; an unknown kind does nothing',async()=>{
  const calls=[],handlers=Object.fromEntries(ROUTE_KINDS.map(kind=>[kind,target=>{calls.push([kind,target]);}]));
  assert.equal(routeTarget({kind:'quiz',lectureId:'1',segmentId:'s600'},handlers),true);
  assert.deepEqual(calls[0],['quiz',{kind:'quiz',lectureId:'1',segmentId:'s600'}]);
  for(const kind of ['lecture','repo','records','review','roadmap','backup','sources','settings','resource','note'])routeTarget({kind},handlers);
  assert.deepEqual(calls.map(([kind])=>kind),['quiz','lecture','repo','records','review','roadmap','backup','sources','settings','resource','note']);
  assert.equal(routeTarget({kind:'delete'},handlers),false);assert.equal(routeTarget(null,handlers),false);assert.equal(routeTarget({kind:'map'},{}),false);
  assert.equal(await routeTarget({kind:'roadmap'},{roadmap:async()=>'opened'}),'opened');
  assert.equal(calls.length,11);
});
test('the rail 확인 문제 opens the ten-minute segment that holds the playback time',()=>{
  assert.deepEqual([0,22,599.9,600,1325,-5,undefined].map(segmentIdAt),['s0','s0','s0','s600','s1200','s0','s0']);
});
test('the composer\'s ⋯ 보낼 설정 summary states what the next question carries',()=>{
  assert.equal(sendSettingsSummary({transcript:true,notes:true}),'대본 ±1분 · 노트 포함');
  assert.equal(sendSettingsSummary({transcript:false,notes:false,autoPause:true,startNew:true}),'대본 안 보냄 · 노트 없음 · 보내면 멈춤 · 새 대화');
  assert.equal(sendSettingsSummary({transcript:true,notes:false,span:30}),'대본 ±30초 · 노트 없음');
});

test('lecture keys run in the capture phase and stop a handled key before the video controls see it',()=>{
  const added=[];const target={addEventListener:(type,fn,capture)=>added.push({type,fn,capture})};const pressed=[];
  installLectureKeys(target,{active:()=>true,press:id=>pressed.push(id)});
  assert.equal(added.length,1);assert.equal(added[0].type,'keydown');assert.equal(added[0].capture,true);
  const key=(k,el={closest:()=>null})=>{const e={key:k,target:el,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};added[0].fn(e);return e;};
  const right=key('ArrowRight');assert.deepEqual(pressed,['next']);assert.ok(right.prevented&&right.stopped);
  const field=key('ArrowRight',{closest:()=>({})});assert.deepEqual(pressed,['next']);assert.ok(!field.prevented&&!field.stopped);
  const other=key('Enter');assert.ok(!other.prevented&&!other.stopped);
});
