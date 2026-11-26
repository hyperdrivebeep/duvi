import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {once} from 'node:events';
import net from 'node:net';
import http from 'node:http';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {setTimeout as wait} from 'node:timers/promises';
import {LectureLibrary} from '../library.mjs';
import {createServer} from '../http-server.mjs';

const cues=[{start:0.5,end:1.2,en:'First line.'},{start:2,end:3,en:'Second line.'}];
const youtube='yt_ABCDEFGHIJK';
const input=Buffer.from('engine stub input');

async function fixture(t,transcribe=async()=>cues,options={}){
  const root=await mkdtemp(path.join(tmpdir(),'duvi-asr-test-')),scratch=path.join(root,'scratch');
  await Promise.all(['data','library','scratch'].map(dir=>mkdir(path.join(root,dir))));
  const lecture={number:1,title:'Lecture',videoUrl:'https://ocw.mit.edu/a.mp4',cues:[]};
  const file=path.join(root,'data/1.json');
  await Promise.all([
    writeFile(file,JSON.stringify(lecture)),writeFile(path.join(root,'data/catalog.json'),'[{"number":1}]'),
    writeFile(path.join(root,'data/2.json'),JSON.stringify({...lecture,number:2,cues})),
    writeFile(path.join(root,'library',youtube+'.json'),JSON.stringify({number:youtube,title:'YouTube',youtubeId:youtube.slice(3),player:'youtube',createdAt:new Date().toISOString(),cues:[]})),
  ]);
  const portProbe=net.createServer();portProbe.listen(0,'127.0.0.1');await once(portProbe,'listening');
  const {port}=portProbe.address();await new Promise(resolve=>portProbe.close(resolve));
  let calls=0;
  const library=new LectureLibrary({root});
  const server=createServer({
    root,library,port,auth:{publicState:()=>({})},translations:{publicJob:()=>null},
    asrOptions:{tempRoot:scratch,engine:{check:async()=>{},transcribe:async context=>{calls++;return transcribe(context);}},...options},
  });
  server.listen(port,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await server.stopLocalASR();await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});});
  const origin=`http://127.0.0.1:${port}`;
  async function client(){
    const session=await fetch(origin+'/api/session'),{csrf}=await session.json(),cookie=session.headers.get('set-cookie').split(';')[0];
    const request=async(suffix='',body,headers={})=>{
      const [key='1',action]=suffix.split('/');
      const response=await fetch(`${origin}/api/local-asr/${key||'1'}${action?`/${action}`:''}`,{
        method:body?'POST':'GET',body,headers:{cookie,...(body&&{origin,'x-csrf-token':csrf}),...headers},
      });
      return {status:response.status,...await response.json()};
    };
    return {
      start:(key='1',headers={})=>request(key,input,{'content-type':'application/octet-stream','x-asr-format':'wav','x-asr-rights':'confirmed',...headers}),
      declareSize:size=>new Promise((resolve,reject)=>{
        // Send only headers: the server must reject before waiting for or staging the body.
        const req=http.request(origin+'/api/local-asr/1',{method:'POST',agent:false,headers:{
          cookie,origin,'x-csrf-token':csrf,'content-length':size,'content-type':'application/octet-stream',
          'x-asr-format':'wav','x-asr-rights':'confirmed',
        }},async res=>{
          try{
            const chunks=[];for await(const chunk of res)chunks.push(chunk);
            resolve({status:res.statusCode,...JSON.parse(Buffer.concat(chunks).toString())});
          }catch(error){reject(error);}
          finally{req.destroy();}
        });
        req.on('error',reject);
        req.setTimeout(2000,()=>req.destroy(new Error('ASR did not reject the declared size before reading the body')));
        req.flushHeaders();
      }),
      status:async()=> (await request()).job,
      cancel:()=>request('1/cancel','{}',{'content-type':'application/json'}),
      done:async(predicate=job=>job&&job.state!=='running')=>{
        for(let i=0;i<200;i++){const job=(await request()).job;if(predicate(job))return job;await wait(10);}
        assert.fail('ASR did not reach the expected state');
      },
      backup:async()=> (await fetch(origin+'/api/learning/export',{headers:{cookie}})).json(),
    };
  }
  return {library,client:await client(),other:await client(),calls:()=>calls,current:async()=>JSON.parse(await readFile(file,'utf8')),
    scratch:()=>readdir(scratch),lecture,file};
}

test('opt-in and CSRF are enforced, with no job for rejected or YouTube/official tracks',async t=>{
  const f=await fixture(t),c=f.client;
  assert.equal(await c.status(),null);
  assert.equal((await c.start('1',{'x-asr-rights':''})).error.code,'asr_rights');
  assert.equal((await c.start('1',{'x-csrf-token':'wrong'})).error.code,'csrf');
  assert.equal((await c.start('1',{'x-asr-model':'custom'})).error.code,'asr_bad_model');
  assert.equal((await c.start('1',{'x-asr-format':'m3u8'})).error.code,'asr_media');
  assert.equal((await c.start(youtube)).error.code,'asr_youtube');
  assert.equal((await c.start('2')).error.code,'asr_existing');
  assert.equal(f.calls(),0);
  assert.deepEqual(await f.scratch(),[]);
  assert.deepEqual(await f.current(),f.lecture);
});

test('stub input and default model produce prepared cues and provenance preserved by backup',async t=>{
  const f=await fixture(t,async({file,model})=>{
    assert.deepEqual(await readFile(file),input);
    assert.equal(model,'small');
    return cues;
  });
  assert.equal((await f.client.start()).status,202);
  assert.equal((await f.client.done()).state,'completed');
  const result=await f.current();
  assert.deepEqual(result.cues,cues);
  assert.equal(result.captionStatus,'ready');
  assert.equal(result.captionSource,'local-asr');
  assert.deepEqual(result.captionProvenance,{source:'local-asr',model:'small',savedAt:new Date(result.captionProvenance.savedAt).toISOString()});
  assert.deepEqual((await f.client.backup()).library[0].captionProvenance,result.captionProvenance);
  assert.deepEqual(await f.scratch(),[]);
});

test('an upload declared above 1 GiB is rejected before invoking the engine or staging a file',async t=>{
  const f=await fixture(t);
  const result=await f.client.declareSize(1024**3+1);
  assert.equal(result.status,413);
  assert.equal(result.error.code,'asr_size');
  assert.equal(f.calls(),0);
  assert.equal(await f.client.status(),null);
  assert.deepEqual(await f.scratch(),[]);
});

test('progress, session ownership, concurrent request, cancellation and retry',async t=>{
  let model;
  const f=await fixture(t,async({signal,progress,model:picked})=>{
    if(model)return cues;
    model=picked;
    progress('transcribing',41);
    await wait(10000,null,{signal});
    return cues;
  });
  assert.equal((await f.client.start('1',{'x-asr-model':'tiny'})).status,202);
  assert.equal((await f.client.done(job=>job?.stage==='transcribing')).percent,41);
  assert.equal(model,'tiny');
  assert.equal(await f.other.status(),null);
  assert.equal((await f.other.cancel()).job,null);
  assert.equal((await f.other.start()).error.code,'asr_busy');
  assert.equal((await f.client.cancel()).status,200);
  assert.equal((await f.client.done()).code,'asr_cancelled');
  assert.deepEqual(await f.current(),f.lecture);
  assert.deepEqual(await f.scratch(),[]);
  assert.equal((await f.client.start('1',{'x-asr-model':'base'})).status,202);
  assert.equal((await f.client.done()).state,'completed');
  assert.equal((await f.current()).captionProvenance.model,'base');
});

test('silence, disk full, invalid engine data and timeout never write cues',async t=>{
  const cases=[
    ['asr_silence',async()=>[]],
    ['asr_disk',async()=>{throw Object.assign(new Error('private'),{code:'ENOSPC'});}],
    ['asr_engine',async()=>[{start:-1,end:2,en:'invalid'}]],
    ['asr_timeout',async({signal})=>{await wait(10000,null,{signal});}, {timeout:200}],
  ];
  for(const [code,engine,options] of cases)await t.test(code,async t=>{
    const f=await fixture(t,engine,options);
    assert.equal((await f.client.start()).status,202);
    const job=await f.client.done();
    assert.equal(job.code,code);
    assert.doesNotMatch(job.message,/private/);
    assert.deepEqual(await f.current(),f.lecture);
    assert.deepEqual(await f.scratch(),[]);
  });
});

test('official captions added during recognition win the atomic save',async t=>{
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const f=await fixture(t,async()=>{await gate;return cues;});
  try{
    assert.equal((await f.client.start()).status,202);
    await writeFile(f.file,JSON.stringify({...f.lecture,cues,captionSource:'official'}));
  }finally{release();}
  assert.equal((await f.client.done()).code,'asr_existing');
  assert.equal((await f.current()).captionSource,'official');
  assert.deepEqual(await f.scratch(),[]);
});

test('an abort during the final lecture read prevents entering the save commit',async t=>{
  const f=await fixture(t),controller=new AbortController(),key='1';
  const reason=new Error('cancelled during final read');
  const load=f.library.get.bind(f.library);
  f.library.get=async id=>{
    const lecture=await load(id);
    controller.abort(reason);
    return lecture;
  };
  let committed=false;
  await assert.rejects(f.library.saveLocalASR(key,cues,'small',{
    signal:controller.signal,onCommit:()=>{committed=true;},
  }),error=>error===reason);
  assert.equal(committed,false);
  assert.deepEqual(await f.current(),f.lecture);
});
