import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from '../http-server.mjs';
import {LectureLibrary} from '../library.mjs';
import {LearningStore} from '../learning.mjs';
import {LearningTutor} from '../learning-tutor.mjs';
import {atomicJSON} from '../vault.mjs';
import {AppError} from '../chatgpt-auth.mjs';
import {ROADMAP} from '../../src/learning-roadmap.mjs';

async function fixture(t){
  const root=await mkdtemp(path.join(os.tmpdir(),'duvi-learning-http-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await atomicJSON(path.join(root,'data/catalog.json'),[{number:1}]);await atomicJSON(path.join(root,'data/1.json'),{number:1,title:'Lecture',videoUrl:'https://ocw.mit.edu/fixture.mp4',cues:[{start:0,end:3,en:'Hello.'}]});
  return {root,library:new LectureLibrary({root}),store:new LearningStore({root})};
}
const record={resourceId:'mit-01',lectureId:'1',question:'Explain',explanation:'My answer',anchor:{lectureId:'1',seconds:1,sourceText:'Hello.',translation:'안녕.',alignmentRevision:null,cueStart:0,cueEnd:3}};
test('learning HTTP enforces session, origin, CSRF and JSON; roundtrip remains usable without auth',async t=>{
  const {root,library}=await fixture(t),auth={state:{activeId:null},publicState:()=>({accounts:[]})},translations={publicJob:()=>null};
  const port=6196,base=`http://127.0.0.1:${port}`,server=createServer({root,library,auth,translations,port});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  assert.equal((await fetch(base+'/api/learning')).status,403);
  const session=await fetch(base+'/api/session'),cookie=session.headers.get('set-cookie').split(';')[0],{csrf}=await session.json();
  const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':csrf};
  const post=(route,body,extra={})=>fetch(base+route,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
  for(const route of ['/api/learning/records','/api/learning/progress','/api/learning/review','/api/learning/import/preview','/api/learning/import','/api/learning/tutor','/api/learning/prepare'])assert.equal((await post(route,{}, {'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await post('/api/learning/records',{}, {Origin:'https://evil.invalid'})).status,403);
  assert.equal((await post('/api/learning/records',{}, {'Content-Type':'text/plain'})).status,415);
  assert.equal((await post('/api/learning/records',null)).status,400);
  assert.equal((await post('/api/learning/records',{padding:'x'.repeat(2300001)})).status,413);
  assert.equal((await fetch(base+'/api/learning/records',{method:'POST',headers,body:'{broken'})).status,400);
  const initial=await (await fetch(base+'/api/learning',{headers})).json();assert.deepEqual(initial,{schemaVersion:1,revision:0,records:[],progress:{},settings:{}});
  const create=await post('/api/learning/records',{revision:0,record});assert.equal(create.status,200);const saved=await create.json();
  const race=await Promise.all(['watching','explained'].map(status=>post('/api/learning/progress',{revision:1,resourceId:'mit-01',status})));assert.deepEqual(race.map(row=>row.status).sort(),[200,409]);
  const tutor=await post('/api/learning/tutor',{recordId:saved.records[0].id,recordRevision:saved.records[0].revision,mode:'hint',model:'test'});assert.equal(tutor.status,401);assert.equal((await tutor.json()).error.code,'not_connected');
  const exported=await (await fetch(base+'/api/learning/export',{headers})).json();const previewResponse=await post('/api/learning/import/preview',{backup:exported});assert.equal(previewResponse.status,200);const preview=await previewResponse.json();
  const commit=await post('/api/learning/import',{revision:2,token:preview.token,mode:'merge'});assert.equal(commit.status,200);assert.equal((await commit.json()).revision,3);
  for(const file of ['/learning/state.json','/learning/before-import.json','/learning/import-journal.json'])assert.equal((await fetch(base+file)).status,404);
});
test('HTTP roadmap uses curriculum module and preparation is ordered, repeatable and preserves progress',async t=>{
  const {root,library,store}=await fixture(t);
  const keys=[...new Set(ROADMAP.phases.flatMap(phase=>phase.resources).map(row=>row.lectureId).filter(key=>key&&!key.startsWith('yt_')))];
  for(const key of keys)await atomicJSON(path.join(root,`data/${key}.json`),{number:Number(key),title:`Fixture ${key}`,videoUrl:`https://ocw.mit.edu/fixture-${key}.mp4`,cues:[]});
  await atomicJSON(path.join(root,'data/catalog.json'),keys.map(key=>({number:Number(key)})));
  await store.setProgress({revision:0,resourceId:'mit-1',status:'practicing'});
  const port=6195,base=`http://127.0.0.1:${port}`,server=createServer({root,library,auth:{publicState:()=>({accounts:[]})},translations:{publicJob:()=>null},port});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const session=await fetch(base+'/api/session'),cookie=session.headers.get('set-cookie').split(';')[0],{csrf}=await session.json();
  const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':csrf};
  const roadmap=await(await fetch(base+'/api/learning/roadmap',{headers})).json();assert.deepEqual(roadmap,ROADMAP);
  const prepare=()=>fetch(base+'/api/learning/prepare',{method:'POST',headers,body:'{}'});
  const firstResponse=await prepare();assert.equal(firstResponse.status,200);const first=await firstResponse.json();assert.equal(first.firstLectureId,'1');
  const second=await(await prepare()).json();assert.equal(second.added,0);assert.deepEqual(second.folders,first.folders);
  assert.deepEqual(first.folders[0].lectureIds,keys.filter(key=>ROADMAP.phases[0].resources.some(row=>row.lectureId===key)));
  assert.equal((await store.get()).progress['mit-1'].status,'practicing');
  const exported=await fetch(base+'/api/learning/export',{headers});assert.equal(exported.status,200);assert.ok((await exported.json()).library.length>=keys.length);
});
test('grounded tutor sends only the selected source and learner fields and never modifies learning state',async t=>{
  const {store,library}=await fixture(t);const state=await store.saveRecord({revision:0,record}),id=state.records[0].id;await store.saveRecord({revision:1,record:{resourceId:'other',question:'Never send this unrelated record'}});
  const calls=[],auth={state:{activeId:'active'},models:async()=>[{id:'test-model'}],token:async()=> 'test-secret'};
  const tutor=new LearningTutor({store,library,auth,fetcher:async(url,request)=>{calls.push({url,request});return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text:'Consider the assumptions.'}]}]}})+'\n\n');}});
  const before=await store.get(),response=await tutor.ask({recordId:id,recordRevision:state.records[0].revision,mode:'hint',model:'test-model'});
  assert.equal(response.text,'Consider the assumptions.');assert.equal(typeof response.sourceLabel,'string');assert.deepEqual(await store.get(),before);
  const body=JSON.parse(calls[0].request.body),input=JSON.parse(body.input[0].content);
  assert.deepEqual(input.source,{lectureId:'1',start:0,end:3,excerpt:'Hello.'});assert.equal(input.learner.explanation,'My answer');assert.equal(body.store,false);assert.equal(body.model,'test-model');assert.equal(calls[0].request.headers.Authorization,'Bearer test-secret');
  assert.equal(calls[0].request.body.includes('Never send this unrelated record'),false);assert.equal(calls[0].request.body.includes('test-secret'),false);
});
test('tutor refuses changed source, unknown model and auth denial before provider request',async t=>{
  const {store,library}=await fixture(t);const saved=await store.saveRecord({revision:0,record}),id=saved.records[0].id;let calls=0;
  const auth={state:{activeId:'active'},models:async()=>[{id:'test'}],token:async()=>{throw new AppError('No consent','plan_disabled',403);}};
  const tutor=new LearningTutor({store,library,auth,fetcher:async()=>{calls++;throw new Error('must not call');}});
  await assert.rejects(tutor.ask({recordId:id,recordRevision:1,mode:'hint',model:'other'}),{code:'invalid_model'});
  await assert.rejects(tutor.ask({recordId:id,recordRevision:1,mode:'hint',model:'test'}),{code:'plan_disabled'});
  await store.saveRecord({revision:1,recordRevision:1,record:{...record,id,anchor:{...record.anchor,sourceText:'Fabricated source'}}});
  await assert.rejects(tutor.ask({recordId:id,recordRevision:2,mode:'hint',model:'test'}),{code:'source_changed'});assert.equal(calls,0);
});
test('provider failure leaves already saved learner work intact',async t=>{
  const {store,library}=await fixture(t),saved=await store.saveRecord({revision:0,record});
  const tutor=new LearningTutor({store,library,auth:{state:{activeId:'active'},models:async()=>[{id:'test'}],token:async()=> 'secret'},fetcher:async()=>{throw new Error('network down');}});
  await assert.rejects(tutor.ask({recordId:saved.records[0].id,recordRevision:1,mode:'critique',model:'test'}),{code:'network'});assert.deepEqual(await store.get(),saved);
});
test('concurrent server edit after tutor preview returns HTTP 409 before any provider call',async t=>{
  const {root,library,store}=await fixture(t),saved=await store.saveRecord({revision:0,record}),preview=saved.records[0];
  let providerCalls=0;
  const auth={state:{activeId:'active'},publicState:()=>({accounts:[]}),models:async()=>{providerCalls++;return [{id:'test'}];},token:async()=>{providerCalls++;return 'unused';}};
  const port=6194,base=`http://127.0.0.1:${port}`,server=createServer({root,library,auth,translations:{publicJob:()=>null},port});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const session=await fetch(base+'/api/session'),cookie=session.headers.get('set-cookie').split(';')[0],{csrf}=await session.json();
  const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':csrf};
  const edit=await fetch(base+'/api/learning/records',{method:'POST',headers,body:JSON.stringify({revision:1,recordRevision:1,record:{...record,id:preview.id,explanation:'New private edit after preview'}})});assert.equal(edit.status,200);
  const response=await fetch(base+'/api/learning/tutor',{method:'POST',headers,body:JSON.stringify({recordId:preview.id,recordRevision:preview.revision,mode:'hint',model:'test'})});
  assert.equal(response.status,409);assert.equal((await response.json()).error.code,'revision_conflict');assert.equal(providerCalls,0);
  const staleSave=await fetch(base+'/api/learning/records',{method:'POST',headers,body:JSON.stringify({revision:2,recordRevision:preview.revision,record:{...record,id:preview.id,explanation:'Stale overwrite'}})});assert.equal(staleSave.status,409);
  const tutor=new LearningTutor({store,library,auth,fetcher:async()=>{providerCalls++;throw new Error('must not call');}});
  for(const recordRevision of [undefined,0,'2',2.5])await assert.rejects(tutor.ask({recordId:preview.id,recordRevision,mode:'hint',model:'test'}),{code:'invalid_learning'});
  assert.equal(providerCalls,0);assert.equal((await store.get()).records[0].explanation,'New private edit after preview');
});
test('HTTP import preview rejects missing YouTube creation time and invalid media fields without changing the library',async t=>{
  const {root,library}=await fixture(t),youtube={number:'yt_aaaaaaaaaaa',youtubeId:'aaaaaaaaaaa',title:'Existing YouTube',player:'youtube',createdAt:'2026-11-16T00:00:00.000Z',cues:[]};
  const youtubeFile=path.join(root,'library',youtube.number+'.json');await atomicJSON(youtubeFile,youtube);const beforeBytes=await readFile(youtubeFile);
  const port=6193,base=`http://127.0.0.1:${port}`,server=createServer({root,library,auth:{publicState:()=>({accounts:[]})},translations:{publicJob:()=>null},port});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const session=await fetch(base+'/api/session'),cookie=session.headers.get('set-cookie').split(';')[0],{csrf}=await session.json();
  const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':csrf};
  const beforeLibrary=await(await fetch(base+'/api/library',{headers})).json(),original=await(await fetch(base+'/api/learning/export',{headers})).json();
  const invalidRows=[{...youtube,createdAt:undefined},{...youtube,createdAt:null},{...youtube,player:undefined},{...youtube,player:'native'},{...youtube,youtubeId:undefined},{...youtube,number:1,youtubeId:undefined,player:'youtube'},{number:1,title:'Broken native',cues:[]},{number:1,title:'Wrong media host',videoUrl:'https://www.youtube.com/not-native.mp4',cues:[]}];
  for(const row of invalidRows){
    const backup=structuredClone(original);backup.library[backup.library.findIndex(item=>String(item.number)===String(row.number))]=row;
    const response=await fetch(base+'/api/learning/import/preview',{method:'POST',headers,body:JSON.stringify({backup})});
    assert.equal(response.status,400,JSON.stringify(row));assert.equal((await response.json()).error.code,'invalid_learning');
  }
  const afterResponse=await fetch(base+'/api/library',{headers});assert.equal(afterResponse.status,200);assert.deepEqual(await afterResponse.json(),beforeLibrary);assert.deepEqual(await readFile(youtubeFile),beforeBytes);
  const after=await(await fetch(base+'/api/learning/export',{headers})).json();for(const key of ['learning','library','folders','translations'])assert.deepEqual(after[key],original[key]);
});
