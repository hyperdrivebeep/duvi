import test from 'node:test';
import assert from 'node:assert/strict';
import {alignSentences, timedWords, parseSentenceBatch} from '../sentence-alignment.mjs';
import {TranslationService,fingerprint,PROMPT_VERSION} from '../chatgpt-translate.mjs';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const cues=[
  {start:0,end:3,en:'We compute gradients with'},
  {start:3,end:6,en:'respect to the weights. Then'},
  {start:6,end:9,en:'we update those weights.'},
];

test('a sentence crossing with / respect to remains one English-Korean timed pair',async()=>{
  const result=await alignSentences({cues,title:'Gradients'},async()=>JSON.stringify({sentences:[
    {endWord:7,ko:'가중치에 대한 기울기를 계산합니다.',punctuation:'.'},
    {endWord:12,ko:'그런 다음 가중치를 갱신합니다.',punctuation:'.'},
  ]}));
  assert.equal(result.cues[0].en,'We compute gradients with respect to the weights.');
  assert.equal(result.translations[0],'가중치에 대한 기울기를 계산합니다.');
  assert.equal(result.cues[1].en,'Then we update those weights.');
  assert.equal(result.cues[0].end,result.cues[1].start);
  assert.equal(result.cues.at(-1).end,9);
});

test('overlapping concurrent batches keep every source word once even when boundaries disagree',async()=>{
  const source={cues:[{start:0,end:100,en:Array.from({length:100},(_,i)=>'w'+i).join(' ')}]};
  const result=await alignSentences(source,async input=>{
    const first=input.words[0].id,last=input.words.at(-1).id;
    const ends=input.words.filter(w=>(w.id+1)%5===0).map(w=>w.id);
    if(input.isLast&&ends.at(-1)!==last)ends.push(last);
    // Occasionally disagree inside the overlap; the coordinator must retry.
    if(first===20)ends.splice(1,1);
    return JSON.stringify({sentences:ends.map(endWord=>({endWord,ko:'번역.',punctuation:'.'}))});
  },{batchSize:30,concurrency:3});
  assert.equal(result.cues.map(c=>c.en.replace(/\.$/,'')).join(' '),source.cues[0].en);
  for(let i=1;i<result.cues.length;i++)assert.equal(result.cues[i-1].end,result.cues[i].start);
});

test('alignment commits English/Korean together, backs up old cache and reuses sentence IDs on later jobs',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'duvi-sentences-'));
  const source={number:1,title:'Gradients',cues},auth={state:{activeId:'test'},models:async()=>[{id:'test-model'}],token:async()=>'test'};
  const legacy={version:1,lecture:1,promptVersion:PROMPT_VERSION,sourceHash:fingerprint(source),translations:{0:{ko:'이전 자막'}}};
  await writeFile(path.join(directory,'1.json'),JSON.stringify(legacy));let calls=0;
  const service=new TranslationService({auth,root:directory,cacheDirectory:directory,library:{get:async()=>source},fetcher:async()=>{
    calls++;
    assert.deepEqual(JSON.parse(await readFile(path.join(directory,'1.json'),'utf8')),legacy);
    const result={sentences:[{endWord:7,ko:'가중치에 대한 기울기를 계산합니다.',punctuation:'.'},{endWord:12,ko:'그런 다음 가중치를 갱신합니다.',punctuation:'.'}]};
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]}})+'\n\n');
  }});
  try{
    await service.start({number:1,model:'test-model',scope:'lecture',sentenceAligned:true});await service.task;
    assert.equal(service.job.status,'completed');const cache=await service.cache(1);
    assert.equal(cache.cues.length,2);assert.equal(Object.keys(cache.translations).length,2);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory,`1.json.before-sentences-${fingerprint(source).slice(0,12)}.json`),'utf8')),legacy);
    await service.start({number:1,model:'test-model',scope:'lecture',sentenceAligned:true});
    assert.equal(service.job.total,2);assert.equal(calls,1);
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('invalid, incomplete and out-of-order model boundaries never produce misaligned subtitles',()=>{
  const words=timedWords(cues);
  for(const rows of [[],[{endWord:99,ko:'번역'}],[{endWord:7,ko:'번역'}],[{endWord:7,ko:'번역'},{endWord:6,ko:'역순'}],[{endWord:12,ko:''}]]){
    assert.throws(()=>parseSentenceBatch(JSON.stringify({sentences:rows}),words,0,true));
  }
});

test('failed sentence alignment leaves the current bilingual cache untouched',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'duvi-sentences-error-'));
  const source={number:1,title:'Gradients',cues},auth={state:{activeId:'test'},models:async()=>[{id:'test-model'}],token:async()=>'test'};
  const legacy={version:1,lecture:1,promptVersion:PROMPT_VERSION,sourceHash:fingerprint(source),translations:{0:{ko:'기존 번역'}}};
  const file=path.join(directory,'1.json');await writeFile(file,JSON.stringify(legacy));
  const service=new TranslationService({auth,root:directory,cacheDirectory:directory,library:{get:async()=>source},fetcher:async()=>new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:'{"sentences":[{"endWord":999,"ko":"잘못된 번역","punctuation":"."}]}'}]}]}})+'\n\n')});
  try{
    await service.start({number:1,model:'test-model',scope:'lecture',sentenceAligned:true});await service.task;
    assert.equal(service.job.status,'error');assert.equal(service.job.error.code,'invalid_sentence_alignment');
    assert.deepEqual(JSON.parse(await readFile(file,'utf8')),legacy);
  }finally{await rm(directory,{recursive:true,force:true});}
});

test('unfinished batch tails carry into the next request, including after a checkpoint resume',async()=>{
  const source={cues:[{start:0,end:20,en:Array.from({length:20},(_,i)=>'word'+i).join(' ')}]};
  let calls=0,checkpoint;
  const partial=await alignSentences(source,async input=>{
    calls++;assert.equal(input.words[0].id,0);
    return JSON.stringify({sentences:[{endWord:5,ko:'첫 문장.',punctuation:'.'}]});
  },{batchSize:8,onProgress:value=>{checkpoint=value;throw new Error('interrupted');}}).catch(e=>e);
  assert.match(partial.message,/interrupted/);assert.equal(calls,1);
  const result=await alignSentences(source,async input=>{
    assert.equal(input.words[0].id,6);
    return JSON.stringify({sentences:[{endWord:19,ko:'나머지 문장.',punctuation:'.'}]});
  },{checkpoint});
  assert.equal(result.cues.length,2);assert.equal(result.cues[1].en,Array.from({length:14},(_,i)=>'word'+(i+6)).join(' ')+'.');
  assert.equal(result.cues[0].end,result.cues[1].start);
});
