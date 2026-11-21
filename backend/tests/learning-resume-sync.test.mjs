import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {LearningSync} from '../learning-sync.mjs';
import {LearningPlaybackState} from '../../src/learning-playback-state.mjs';
import * as v from '../learning-validation.mjs';

function browser(initial={},now=()=>1000) {
  const storage=new Map([['study-positions',JSON.stringify(initial)]]);
  return new LearningPlaybackState({...initial},{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},now);
}
test('legacy numeric positions have unknown age; local playback stamps only changed positions',()=>{
  let clock=1000;
  const pc=browser({1:90},()=>clock);
  assert.deepEqual(pc.snapshot(),{1:{seconds:90,updatedAt:0}});
  pc.save('1',300);clock=2000;pc.save('1',300);pc.save('2',0);
  assert.deepEqual(pc.snapshot(),{1:{seconds:300,updatedAt:1000}});
});
test('newest per lecture wins, including a rewind; active playback and competing newer local saves stay put',()=>{
  const pc=browser();
  for(const key of ['1','2','3'])pc.save(key,300);
  const n=pc.merge({1:{seconds:100,updatedAt:2000},2:{seconds:100,updatedAt:900},3:{seconds:50,updatedAt:3000}},'3',false);
  assert.equal(n,1);assert.deepEqual(pc.positions,{1:100,2:300,3:300});
  pc.merge({3:{seconds:50,updatedAt:3000}},'3',true);
  assert.equal(pc.save('3',300),false); // idle tick and beforeunload cannot put back the old playhead
  pc.beginLecture();assert.equal(pc.positions[3],50);
});
async function pair(t){
  const tmp=await mkdtemp(path.join(os.tmpdir(),'duvi-resume-'));t.after(()=>rm(tmp,{recursive:true,force:true}));
  const folder=path.join(tmp,'sync');await mkdir(folder);
  const [a,b]=await Promise.all(['A','B'].map(async name=>{
    const root=path.join(tmp,name);await mkdir(root);const sync=new LearningSync({store:new LearningStore({root}),hostname:name});
    await sync.setFolder({folder});return sync;
  }));
  return {a,b,folder};
}
test('confirmed resume sidecar keeps the strict main v1 record parser readable',async t=>{
  const {a,b,folder}=await pair(t),positions={1:{seconds:300,updatedAt:1000}};
  const exported=await a.export({positions}),file=path.join(folder,exported.file);
  const packet=JSON.parse(await readFile(file));
  // main 63a23b6 LearningSync.parse: freeze its allowlist, not the evolving writer's.
  v.bounded(packet);v.keys(packet,['format','schemaVersion','deviceId','deviceName','exportedAt','learning']);
  assert.equal(packet.format,'duvi-learning-sync');assert.equal(packet.schemaVersion,1);
  assert.equal(packet.deviceId,(await a.get()).deviceId);v.text(packet.deviceName,80);v.date(packet.exportedAt);v.state(packet.learning);
  const sidecar=path.join(folder,'positions',`${packet.deviceId}.json`);
  assert.deepEqual(JSON.parse(await readFile(sidecar)).positions,positions);
  const preview=await b.preview({deviceId:packet.deviceId});assert.equal(preview.summary.positionCount,1);
  await rm(sidecar);
  const committed=await b.commit({token:preview.token,revision:preview.revision});assert.deepEqual(committed.positions,positions);
  const old=await b.preview({deviceId:packet.deviceId});assert.equal(old.summary.positionCount,0);
  assert.deepEqual((await b.commit({token:old.token,revision:old.revision})).positions,{});
});
test('future timestamps cannot win on export or when read from another PC',async t=>{
  const {a,b,folder}=await pair(t),now=1700000000000;a.now=b.now=()=>now;
  const positions={1:{seconds:300,updatedAt:now},2:{seconds:90,updatedAt:now+86400000}};
  const exported=await a.export({positions});assert.equal(exported.positionCount,1);
  const deviceId=(await a.get()).deviceId,file=path.join(folder,'positions',`${deviceId}.json`);
  const packet=JSON.parse(await readFile(file));packet.positions=positions;await writeFile(file,JSON.stringify(packet));
  const preview=await b.preview({deviceId});assert.equal(preview.summary.positionCount,1);
});
test('one invalid resume entry cannot block records or valid positions',async t=>{
  const {a,b}=await pair(t),row={seconds:300,updatedAt:1000};
  const exported=await a.export({positions:{1:row,99:row,2:{...row,token:'secret'},3:{...row,seconds:Infinity}}});
  assert.equal(exported.positionCount,1);
  const plan=await b.preview({deviceId:(await a.get()).deviceId});
  assert.deepEqual((await b.commit({token:plan.token,revision:plan.revision})).positions,{1:row});
});
test('snapshot and server export cap valid lecture positions at 526',async t=>{
  const many=Object.fromEntries(Array.from({length:530},(_,i)=>['yt_'+String(i).padStart(11,'0'),20]));
  const snapshot=browser({...many,99:20}).snapshot();
  assert.equal(Object.hasOwn(snapshot,99),false);assert.equal(Object.keys(snapshot).length,526);
  const {a}=await pair(t);
  assert.equal((await a.export({positions:Object.fromEntries(Object.keys(many).map(id=>[id,{seconds:20,updatedAt:1}]))})).positionCount,526);
});
