import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {LearningSync} from '../learning-sync.mjs';
import {LearningPlaybackState} from '../../src/learning-playback-state.mjs';

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
test('positions travel through a confirmed device snapshot; v1 exports without positions remain readable',async t=>{
  const tmp=await mkdtemp(path.join(os.tmpdir(),'duvi-resume-'));t.after(()=>rm(tmp,{recursive:true,force:true}));
  const folder=path.join(tmp,'sync');await mkdir(folder);
  const [a,b]=await Promise.all(['A','B'].map(async name=>{
    const root=path.join(tmp,name);await mkdir(root);const sync=new LearningSync({store:new LearningStore({root}),hostname:name});
    await sync.setFolder({folder});return sync;
  }));
  const positions={1:{seconds:300,updatedAt:1000}};
  const exported=await a.export({positions}),file=path.join(folder,exported.file);
  const packet=JSON.parse(await readFile(file));assert.deepEqual(packet.positions,positions);
  const preview=await b.preview({deviceId:packet.deviceId});assert.equal(preview.summary.positionCount,1);
  delete packet.positions;await writeFile(file,JSON.stringify(packet));
  const committed=await b.commit({token:preview.token,revision:preview.revision});assert.deepEqual(committed.positions,positions);
  const old=await b.preview({deviceId:packet.deviceId});assert.equal(old.summary.positionCount,0);
  assert.deepEqual((await b.commit({token:old.token,revision:old.revision})).positions,{});
  await assert.rejects(a.export({positions:{1:{seconds:Infinity,updatedAt:1000}}}));
  await assert.rejects(a.export({positions:{1:{seconds:300,updatedAt:1000,token:'secret'}}}));
});
