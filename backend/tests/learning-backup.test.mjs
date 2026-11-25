import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {LearningBackup} from '../learning-backup.mjs';
import {LectureLibrary} from '../library.mjs';
import {atomicJSON} from '../vault.mjs';
import {fingerprint} from '../chatgpt-translate.mjs';
import {LearningTutor} from '../learning-tutor.mjs';

const at='2026-11-16T00:00:00.000Z';
test('explicit completion survives backup preview and restore without promoting activity',async t=>{
  const source=await fixture(t),target=await fixture(t,{seed:false});
  await source.store.setProgress({revision:1,resourceId:'mit-1',status:'explained',completed:true});
  await source.store.setProgress({revision:2,resourceId:'reading',status:'reviewed'});
  const backup=await source.service.export(),preview=await target.service.preview({backup});
  const restored=await target.service.commit({revision:0,token:preview.token,mode:'merge'});
  assert.equal(restored.progress['mit-1'].completed,true);assert.equal(restored.progress.reading.completed,false);
});
async function fixture(t,{seed=true,...options}={}){
  const root=await mkdtemp(path.join(os.tmpdir(),'duvi-learning-backup-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=new LearningStore({root}),library=new LectureLibrary({root});
  if(seed){
    const lecture={number:1,title:'Fixture lecture',videoUrl:'https://ocw.mit.edu/fixture.mp4',cues:[{start:0,end:3,en:'Hello.'}],access_token:'do-not-export',extraLocalData:{keep:true}};
    await atomicJSON(path.join(root,'data/1.json'),lecture);await atomicJSON(path.join(root,'data/catalog.json'),[{number:1,title:lecture.title,extraLocalData:true}]);
    await atomicJSON(path.join(root,'library/folders.json'),{version:1,folders:[{id:'first',name:'Ordered',lectureIds:['1'],refresh_token:'folder-secret'}]});
    await atomicJSON(path.join(root,'translations/1.json'),{version:1,lecture:1,sourceHash:fingerprint(lecture),promptVersion:'mit-python-ko-v1',alignmentVersion:'bilingual-sentences-v1',alignmentRevision:'alignment-1',cues:lecture.cues,translations:{0:{ko:'안녕.',model:'test',updatedAt:at,apiKey:'translation-secret'}},access_token:'cache-secret'});
    await atomicJSON(path.join(root,'learning/not-exported-auth.json'),{access_token:'auth-file-secret'});
    await store.saveRecord({revision:0,record:{resourceId:'mit-01',explanation:'original'}});
  }
  return {root,store,library,service:new LearningBackup({store,library,...options})};
}
test('whitelisted export round trips lectures, ordered folders, aligned translations and learning to an empty directory',async t=>{
  const source=await fixture(t),target=await fixture(t,{seed:false}),exported=await source.service.export();
  const serialized=JSON.stringify(exported);for(const value of ['do-not-export','folder-secret','translation-secret','cache-secret','auth-file-secret','access_token','apiKey','refresh_token','extraLocalData'])assert.equal(serialized.includes(value),false);
  const preview=await target.service.preview({backup:exported});assert.deepEqual(preview.counts,{records:1,chats:0,attempts:0,progress:0,lectures:1,folders:1,translations:1});assert.deepEqual(preview.conflicts.records,[]);
  const state=await target.service.commit({revision:0,token:preview.token,mode:'merge'});assert.equal(state.records[0].explanation,'original');
  const restored=await target.service.export();assert.deepEqual(restored.library,exported.library);assert.deepEqual(restored.folders,exported.folders);assert.deepEqual(restored.translations,exported.translations);
  assert.equal((await target.library.list())[0].title,'Fixture lecture');assert.equal((await target.library.folders.list()).folders[0].lectureIds[0],'1');
  assert.equal(JSON.parse(await readFile(path.join(target.root,'learning/before-import.json'),'utf8')).learning.revision,0);
  await assert.rejects(target.service.commit({revision:1,token:preview.token,mode:'merge'}),{code:'invalid_preview'});
});
test('preview rejects malformed, versioned, duplicate, traversal, secret and oversized inputs before writing',async t=>{
  const fixtureData=await fixture(t),{service,store}=fixtureData,original=await service.export();
  const mutate=[b=>{b.schemaVersion=2;},b=>{b.library[0].number='../accounts';},b=>{b.library[0].videoUrl='file:///C:/secret';},b=>{b.library.push(b.library[0]);},b=>{b.learning.records[0].history={};},b=>{b.learning.progress=JSON.parse('{"__proto__":{"status":"watching"}}');},b=>{b.credentials={access_token:'secret'};},b=>{b.translations[0].translations[0].access_token='secret';},b=>{b.folders[0].lectureIds=['yt_aaaaaaaaaaa'];}];
  for(const edit of mutate){const candidate=structuredClone(original);edit(candidate);await assert.rejects(async()=>service.preview({backup:candidate}),{code:'invalid_learning'});}
  await assert.rejects(async()=>service.preview({backup:{...original,padding:'x'.repeat(16*1024*1024)}}),{code:'too_large'});
  assert.equal((await store.get()).revision,1);
});
test('preview snapshots cannot be tampered with, expire, and detect external asset changes',async t=>{
  let now=0;const {service,root}=await fixture(t,{now:()=>now}),value=await service.export();
  const preview=await service.preview({backup:value});value.learning.records[0].explanation='tampered';
  const result=await service.commit({revision:1,token:preview.token,mode:'replace'});assert.equal(result.records[0].explanation,'original');
  const next=await service.preview({backup:await service.export()});await atomicJSON(path.join(root,'data/1.json'),{number:1,title:'Changed externally',videoUrl:'https://ocw.mit.edu/fixture.mp4',cues:[]});
  await assert.rejects(service.commit({revision:2,token:next.token,mode:'merge'}),{code:'import_conflict'});
  const expires=await service.preview({backup:await service.export()});now=600001;await assert.rejects(service.commit({revision:2,token:expires.token,mode:'merge'}),{code:'invalid_preview'});
  await assert.rejects(service.commit({revision:2,token:'tampered-token',mode:'merge'}),{code:'invalid_preview'});
});
test('merge preserves local conflicts and original asset bytes; replace requires a fresh revision',async t=>{
  const {service,store,root}=await fixture(t),incoming=await service.export();incoming.learning.records[0].explanation='incoming';incoming.library[0].title='incoming title';
  const before=await readFile(path.join(root,'data/1.json')),preview=await service.preview({backup:incoming});assert.equal(preview.conflicts.records.length,1);
  const merged=await service.commit({revision:1,token:preview.token,mode:'merge'});assert.equal(merged.records[0].explanation,'original');assert.deepEqual(await readFile(path.join(root,'data/1.json')),before);
  const stale=await service.preview({backup:incoming});await store.setProgress({revision:2,resourceId:'mit-01',status:'watching'});
  await assert.rejects(service.commit({revision:2,token:stale.token,mode:'replace'}),{code:'revision_conflict'});
  const fresh=await service.preview({backup:incoming});assert.equal((await service.commit({revision:3,token:fresh.token,mode:'replace'})).records[0].explanation,'incoming');
});
test('failure after partial asset writes rolls back all originals and removes newly created files',async t=>{
  let writes=0;const {service,root,store}=await fixture(t,{writer:async(file,value)=>{if(++writes===3)throw new Error('injected import failure');await atomicJSON(file,value);}});
  const incoming=await service.export();incoming.library[0].title='replacement';incoming.library.push({number:2,title:'New',videoUrl:'https://ocw.mit.edu/fixture-2.mp4',cues:[]});
  const paths=['data/1.json','data/catalog.json','learning/state.json'],before=await Promise.all(paths.map(file=>readFile(path.join(root,file))));
  const preview=await service.preview({backup:incoming});await assert.rejects(service.commit({revision:1,token:preview.token,mode:'replace'}),/injected import failure/);
  assert.deepEqual(await Promise.all(paths.map(file=>readFile(path.join(root,file)))),before);await assert.rejects(readFile(path.join(root,'data/2.json')),{code:'ENOENT'});assert.equal((await store.get()).revision,1);
});
test('interrupted transaction journal recovers on restart and rejects journal path traversal',async t=>{
  const {service,root}=await fixture(t),file=path.join(root,'data/1.json'),before=JSON.parse(await readFile(file,'utf8'));
  await atomicJSON(service.journal,{entries:[{file:'data/1.json',before}]});await atomicJSON(file,{number:1,title:'Interrupted',cues:[]});
  await new LearningBackup({store:service.store}).export();assert.deepEqual(JSON.parse(await readFile(file,'utf8')),before);
  await atomicJSON(service.journal,{entries:[{file:'../outside.json',before:{}}]});await assert.rejects(service.recover(),{code:'invalid_learning'});
});
test('active background translation blocks snapshot and import',async t=>{
  const {service}=await fixture(t,{translations:{job:{status:'running'}}});await assert.rejects(service.export(),{code:'busy'});
});
test('replacement import invalidates old record revisions for both edits and tutor previews',async t=>{
  const {service,store,library}=await fixture(t),incoming=await service.export(),old=incoming.learning.records[0];
  incoming.learning.records[0].explanation='Imported explanation with the same version';
  const preview=await service.preview({backup:incoming}),restored=await service.commit({revision:1,token:preview.token,mode:'replace'});
  assert.ok(restored.records[0].revision>old.revision);
  await assert.rejects(store.saveRecord({revision:restored.revision,recordRevision:old.revision,record:{id:old.id,resourceId:old.resourceId,explanation:'Stale draft'}}),{code:'revision_conflict'});
  let calls=0;const tutor=new LearningTutor({store,library,auth:{state:{activeId:'active'},models:async()=>{calls++;return [];}}});
  await assert.rejects(tutor.ask({recordId:old.id,recordRevision:old.revision,mode:'hint',model:'test'}),{code:'revision_conflict'});assert.equal(calls,0);
});
test('restoring into a fresh install without folders.json keeps MIT lectures in numeric order',async t=>{
  const source=await fixture(t,{seed:false}),target=await fixture(t,{seed:false}),numbers=[1,2,3,9,10,11,12];
  for(const {root} of [source,target]){
    for(const number of numbers)await atomicJSON(path.join(root,`data/${number}.json`),{number,title:`Lecture ${number}`,videoUrl:`https://ocw.mit.edu/${number}.mp4`,cues:[{start:0,end:3,en:'Hello.'}]});
    await atomicJSON(path.join(root,'data/catalog.json'),numbers.map(number=>({number,title:`Lecture ${number}`})));
  }
  const exported=await source.service.export();assert.deepEqual(exported.folders[0].lectureIds,numbers.map(String));
  const preview=await target.service.preview({backup:exported});await target.service.commit({revision:0,token:preview.token,mode:'merge'});
  assert.deepEqual((await target.library.folders.list()).folders[0].lectureIds,numbers.map(String));
  assert.deepEqual((await target.service.export()).library.map(row=>row.number),numbers);
});
