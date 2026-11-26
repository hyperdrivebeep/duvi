import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createRoot,settle} from './fake-dom.mjs';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const A='yt_AAAAAAAAAAA',B='yt_BBBBBBBBBBB';
const ready=(number,cues=[{start:0,end:5,en:'First'},{start:10,end:15,en:'Second'}])=>({number,title:number,player:'youtube',captionStatus:'ready',cues});
const pending=number=>({...ready(number,[]),captionStatus:'pending'});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
async function until(check){for(let i=0;i<20;i++){if(check())return;await settle();}assert.ok(check(),'expected app state was not rendered');}

// Load the actual app entry; replace only unrelated views, the media transport and browser globals.
async function app(t,{lecture=ready(A),chrome,fetchOverride}={}){
  const nodes=new Map(),writes=new Map(),storage=new Map(chrome?[['mit6100-provider','chrome']]:[]);
  for(const [,id] of html.matchAll(/\bid="([^"]+)"/g)){
    const node=createRoot(),text=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node),'textContent');
    Object.defineProperty(node,'textContent',{get:()=>text.get.call(node),set:value=>{writes.get(id)?.push(value);text.set.call(node,value);}});
    node.hidden=/^(captionContext|captionNotice|transcriptPanel)$/.test(id);
    node.options=[];
    const replace=node.replaceChildren.bind(node);
    node.replaceChildren=(...children)=>{replace(...children);if(id==='account'||id==='model'){node.options=children;node.value=children[0]?.value||'';}};
    node.click=()=>{if(!node.disabled)return node.onclick?.();};
    nodes.set(id,node);
  }
  const $=id=>nodes.get(id);
  const createElement=()=>{
    const node=createRoot();node.classList.remove=()=>{};
    node.querySelector=selector=>node.children.find(child=>'.'+child.className===selector);
    return node;
  };
  const media=new EventTarget();
  Object.assign(media,{pause(){},currentTime:0,paused:true,load:async()=>{media.currentTime=0;}});
  let poll,job=null,translations={};
  const calls=[],fetch=async(path,init)=>{
    const body=init.body&&JSON.parse(init.body);calls.push({path,body});
    const stub=fetchOverride?.(path,body);if(stub!==undefined){const payload=await stub;return {ok:true,json:async()=>payload};}
    if(path==='/api/session')return Response.json({csrf:'test',activeId:'test',accounts:[{id:'test',planEnabled:true}],job});
    if(path==='/api/models')return Response.json({models:[{id:'model',name:'Model'}]});
    if(path.startsWith('/api/translations/'))return Response.json({translations});
    if(path.startsWith('/api/lectures/'))return Response.json(path.endsWith(lecture.number)?lecture:ready(B));
    throw Error('Unexpected request: '+path);
  };
  const document={getElementById:$,querySelectorAll:()=>[],createElement};
  for(const [name,value] of Object.entries({document,window:new EventTarget(),self:{Translator:chrome},Translator:chrome,fetch,
    Option:class {constructor(text,value){Object.assign(this,createRoot(),{text,value});}},location:{search:`?lecture=${lecture.number}`},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},history:{replaceState(){}},
    setInterval:callback=>{poll=callback;}})){
    const old=Object.getOwnPropertyDescriptor(globalThis,name);
    Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
    t.after(()=>old?Object.defineProperty(globalThis,name,old):delete globalThis[name]);
  }
  const stubModules={
    './media.mjs':{MediaPlayer:class {constructor(){return media;}}},
    './library-ui.mjs':{LibraryUI:class {refresh(id){$('lecture').value=id;}render(){}}},
    './study-view.mjs':{setupStudyView:()=>({openPanel(){},selectedTab:()=> 'chat'})},
    './app-shell.mjs':{setupShell:()=>({}),installLectureKeys(){},setupWelcome:()=>({update(){}}),accountStatusText:()=>''},
    './learning-ui.mjs':{LearningUI:class {chat={setConnectionNotice(){}};tick(){}lectureChanged(){}init(){}}},
    './quiz-api.mjs':{createLearningViewApi:()=>({quizzes:async()=>({sets:[]})})},
    './sources-settings.mjs':{renderSourcesSettings:()=>({})},
    './concept-map-data.json':{default:{}},
    './concept-map-model.mjs':{lectureConcepts:()=>[],attemptsByConcept(){},evidenceByConcept(){}},
    lucide:{createIcons(){},...Object.fromEntries('Search Plus Settings X PanelLeft SkipBack SkipForward RotateCcw Maximize Minimize Languages ChevronRight ChevronDown Play'.split(' ').map(icon=>[icon,null]))}
  };
  const url=new URL(`../src/app.mjs?caption-test=${encodeURIComponent(t.name)}`,import.meta.url);
  globalThis.captionAppStubs=stubModules;t.after(()=>delete globalThis.captionAppStubs);
  const hook=registerHooks({resolve(specifier,context,next){
    if(context.parentURL!==url.href||(!specifier.endsWith('.css')&&!(specifier in stubModules)))return next(specifier,context);
    const key=JSON.stringify(specifier);
    const source=Object.keys(stubModules[specifier]||{}).map(name=>`export ${name==='default'?'default ':`const ${name}=`}globalThis.captionAppStubs[${key}][${JSON.stringify(name)}];`).join('\n');
    return {shortCircuit:true,url:'data:text/javascript,'+encodeURIComponent(`/* ${url.search} ${specifier} */\n${source}`)};
  }});
  try{await import(url.href);}finally{hook.deregister();}
  return {$,calls,media,writes,storage,load:id=>{$('lecture').value=id;return $('lecture').onchange();},
    mode:value=>{$('provider').value=value;$('provider').onchange();},poll:(next,cache)=>{job=next;translations=cache;return poll();}};
}

test('caption POST transport error re-reads the stored lecture and does not turn pending into failed',async t=>{
  const response=deferred();let reads=0;
  const a=await app(t,{lecture:pending(A),fetchOverride:path=>{
    if(path==='/api/lectures/'+A){reads++;return pending(A);}
    if(path==='/api/library/captions')return response.promise;
  }});
  assert.match(a.$('subtitleInfo').textContent,/영어 자막 준비 중/);
  response.reject(Error('transport offline'));
  await until(()=>a.$('subtitleInfo').textContent==='영어 자막 미준비');
  assert.equal(reads,2);
  assert.match(a.$('captionNoticeText').textContent,/서버에 연결할 수 없습니다/);
  assert.doesNotMatch(a.$('subtitleStatus').textContent,/실패/);
});

test('changing lectures immediately clears the caption area and its scoped translation error',async t=>{
  const next=deferred();
  const a=await app(t,{fetchOverride:path=>{
    if(path==='/api/translate')return Promise.reject(Error('offline'));
    if(path==='/api/lectures/'+B)return next.promise;
  }});
  await a.$('translateSection').click();
  assert.match(a.$('subtitleInfo').textContent,/서버에 연결할 수 없습니다/);
  const finished=a.load(B);
  assert.equal(a.$('captionContext').hidden,true);
  assert.equal(a.$('subtitleStatus').textContent,'');
  next.resolve(ready(B));await finished;
  assert.equal(a.$('captionContext').hidden,false);
  assert.equal(a.$('subtitleInfo').textContent,'영어 자막 준비됨 · 한국어 저장 없음');
});

test('section click issues exactly one AI request for the visible cue and alignment revision',async t=>{
  const wait=deferred();
  const a=await app(t,{fetchOverride:path=>{
    if(path==='/api/translations/'+A)return {alignmentRevision:'aligned',cues:ready(A).cues};
    if(path==='/api/translate')return wait.promise;
  }});
  a.media.currentTime=12;a.media.dispatchEvent(new Event('timeupdate'));
  assert.equal(a.$('english').textContent,'Second');
  assert.match(a.$('translateSection').getAttribute('aria-label'),/00:10–00:15/);
  const click=a.$('translateSection').click();a.$('translateSection').click();
  assert.deepEqual(a.calls.filter(r=>r.path==='/api/translate').map(r=>r.body),
    [{lecture:A,model:'model',scope:'section',start:10,sentenceAligned:false,alignmentRevision:'aligned'}]);
  wait.resolve({job:{id:'section',number:A,scope:'section',status:'running'}});await click;
});

test('Chrome section queued before model creation cannot translate a cue from the next lecture',async t=>{
  const model=deferred(),calls=[],cues=ready(A).cues;
  // Shared cues isolate the generation check from the independent cue-array check.
  const a=await app(t,{chrome:{availability:async()=> 'available',create:()=>model.promise},
    fetchOverride:path=>path==='/api/lectures/'+A?ready(A,cues):path==='/api/lectures/'+B?ready(B,cues):undefined});
  await until(()=>!a.$('translateSection').disabled);
  const click=a.$('translateSection').click();
  await a.load(B);
  model.resolve({translate:async en=>{calls.push(en);return '낡은 결과';}});
  await click;
  assert.deepEqual(calls,[]);
  assert.doesNotMatch(a.$('korean').textContent,/낡은 결과/);
});

test('Chrome response from an old lecture is not written into the newly selected lecture',async t=>{
  const result=deferred(),cues=ready(A).cues;let called=false;
  const a=await app(t,{chrome:{availability:async()=> 'available',create:async()=>({translate:()=>{called=true;return result.promise;}})},
    fetchOverride:path=>path==='/api/lectures/'+A?ready(A,cues):path==='/api/lectures/'+B?ready(B,cues):undefined});
  const click=a.$('translateSection').click();
  await until(()=>called);
  await a.load(B);result.resolve('낡은 결과');await click;
  assert.doesNotMatch(a.$('korean').textContent,/낡은 결과/);
  assert.deepEqual(JSON.parse(a.storage.get('mit6100-ko-'+B)),{});
});

test('switching away from Chrome clears its prior error when returning to the same lecture',async t=>{
  const a=await app(t,{chrome:{availability:async()=> 'available',create:async()=>({translate:async()=>{throw Error('fixture failure');}})}});
  await a.$('translateSection').click();
  assert.match(a.$('subtitleInfo').textContent,/fixture failure/);
  a.mode('chatgpt');a.mode('chrome');
  assert.doesNotMatch(a.$('subtitleInfo').textContent,/fixture failure/);
  assert.doesNotMatch(a.$('subtitleStatus').textContent,/오류/);
});

test('the polite region announces translation transitions without updating as cache counts change',async t=>{
  assert.match(html,/<span id="subtitleInfo"><\/span>\s*<span id="subtitleStatus"[^>]+role="status" aria-live="polite"/);
  const a=await app(t),updates=[];
  assert.equal(a.$('subtitleStatus').textContent,'영어 자막 준비됨');
  a.writes.set('subtitleStatus',updates);
  const job={id:'full',number:A,scope:'lecture',total:2,status:'running'};
  await a.poll({...job,done:0},{});
  await a.poll({...job,done:1},{0:{ko:'하나'}});
  assert.match(a.$('subtitleInfo').textContent,/한국어 1 \/ 2문장 저장됨/);
  assert.deepEqual(updates,['한국어 번역 시작']);
  await a.poll({...job,done:2,status:'completed'},{0:{ko:'하나'},1:{ko:'둘'}});
  await a.poll({...job,id:'other',done:1,status:'error',message:'자세한 오류'},{0:{ko:'하나'}});
  assert.deepEqual(updates,['한국어 번역 시작','한국어 번역 완료','한국어 번역 오류']);
});
