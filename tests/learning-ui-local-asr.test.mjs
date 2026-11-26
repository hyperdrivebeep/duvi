import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setupLocalASR} from '../src/local-asr-ui.mjs';
import {createRoot} from './fake-dom.mjs';

const running=(stage,percent)=>({job:{state:'running',stage,percent}});
function fixture({lecture={number:1,cues:[]},upload=async()=>assert.fail('unexpected ASR upload'),api}={}){
  const nodes=new Map(),writes=[];
  const $=id=>{
    if(!nodes.has(id))nodes.set(id,createRoot());
    return nodes.get(id);
  };
  $('asrFile').files=[];
  $('asrModel').value='small';
  $('asrForm').reset=()=>{$('asrFile').files=[];$('asrRights').checked=false;};
  $('asrProgress').removeAttribute=()=>{};
  $('closeASR').focus=()=>assert.equal($('closeASR').disabled,false);
  const status=$('asrStatus'),text=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(status),'textContent');
  Object.defineProperty(status,'textContent',{get:()=>text.get.call(status),set:value=>{writes.push(value);text.set.call(status,value);}});
  setupLocalASR({$,api,upload,lecture:()=>lecture,onSaved:async()=>{}});
  const form=$('asrForm');
  return {$,writes,change:()=>form.oninput(),submit:()=>form.onsubmit({preventDefault(){}})};
}

test('only stage transitions update the ASR live region; percentages update progress',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<p\b[^>]*id="asrStatus"[^>]*role="status"/);
  assert.match(html,/<progress\b[^>]*id="asrProgress"/);
  let polls=0;
  const {$,change,submit,writes}=fixture({
    upload:async()=>running('transcribing',10),
    api:async()=>{
      if(++polls===1){assert.equal($('asrProgress').value,10);return running('transcribing',37);}
      if(polls===2){assert.equal($('asrProgress').value,37);return running('saving',99);}
      return {job:{state:'completed'}};
    },
  });
  $('asrFile').files=[{name:'lecture.wav'}];$('asrRights').checked=true;change();
  await submit();
  assert.deepEqual(writes,['로컬 파일 준비 중…','영어 음성 인식 중','자막 저장 중…','기계 생성 자막을 저장했습니다. 정확도는 검증되지 않았습니다.']);
});

test('file and explicit rights confirmation are both required, even on direct submit',async()=>{
  const {$,change,submit,writes}=fixture();
  assert.equal($('runASR').disabled,true);
  $('asrFile').files=[{name:'lecture.wav'}];change();
  assert.equal($('runASR').disabled,true);
  await submit();
  assert.deepEqual(writes,[]);
  $('asrRights').checked=true;change();
  assert.equal($('runASR').disabled,false);
  $('asrRights').checked=false;change();
  assert.equal($('runASR').disabled,true);
});

test('YouTube cannot enable or submit the ASR form even with file and rights',async()=>{
  for(const lecture of [{number:1,player:'youtube',cues:[]},{number:'yt_ABCDEFGHIJK',cues:[]}]){
    const {$,change,submit,writes}=fixture({lecture});
    $('asrFile').files=[{name:'lecture.wav'}];$('asrRights').checked=true;change();
    assert.equal($('runASR').disabled,true);
    await submit();
    assert.deepEqual(writes,[]);
  }
});
