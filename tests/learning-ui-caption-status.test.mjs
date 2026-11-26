import test from 'node:test';
import assert from 'node:assert/strict';
import {captionStatus} from '../src/caption-status.mjs';

function state(options={},lecture={}){
  return captionStatus({lecture:{player:'youtube',cues:[{},{}],...lecture},count:0,current:0,aiReady:true,...options});
}

test('initial caption preparation and retry are not failures',()=>{
  assert.equal(state({},{cues:[],captionStatus:'pending'}).english,'영어 자막 준비 중');
  assert.equal(state({preparing:true},{cues:[],captionStatus:'failed'}).english,'영어 자막 준비 중');
  assert.equal(state({},{cues:[],captionStatus:'failed'}).english,'영어 자막 실패');
  assert.equal(state({checkError:'network'},{cues:[],captionStatus:'pending'}).english,'영어 자막 미준비');
  assert.equal(state({},{cues:[],captionStatus:'unavailable'}).english,'영어 자막 이용 불가');
  assert.equal(state({},{cues:[],captionStatus:'pending'}).canTranslate,false);
});

test('ready English is independent of whether the Korean cache has loaded or has entries',()=>{
  assert.deepEqual(state(),{english:'영어 자막 준비됨',korean:'한국어 저장 없음',canTranslate:true});
  assert.equal(state({count:null}).korean,'한국어 저장 확인 중');
  assert.equal(state({count:undefined}).korean,'한국어 저장 확인 불가');
  assert.equal(state({count:1}).korean,'한국어 1 / 2문장 저장됨');
  assert.equal(state({count:1,saved:'번역됨'}).canTranslate,false);
  assert.equal(state({current:-1}).canTranslate,false);
  assert.equal(state({running:true}).canTranslate,false);
  assert.equal(state({aiReady:false}).canTranslate,false);
  assert.match(state({aiReady:false}).korean,/ChatGPT 계정·모델 필요/);
  assert.equal(state({},{player:'native'}),null);
});

test('Chrome local translation is enabled only when its Translator can be used',()=>{
  for(const availability of ['available','downloadable','downloading']){
    assert.equal(state({chrome:true,aiReady:false,availability}).canTranslate,true);
    assert.equal(state({chrome:true,availability,working:true}).canTranslate,false);
  }
  for(const availability of ['unavailable','checking','unknown']){
    assert.equal(state({chrome:true,availability}).canTranslate,false);
    assert.match(state({chrome:true,availability}).korean,/Chrome 번역/);
  }
});
