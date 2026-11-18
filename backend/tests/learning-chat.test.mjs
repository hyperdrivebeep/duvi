import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {LectureLibrary} from '../library.mjs';
import {LearningChat,transcriptWindow,trimHistory,lecturePlace,CHAT_INSTRUCTIONS} from '../learning-chat.mjs';
import {createMockChatProvider} from '../chat-mock.mjs';
import {consumeResponse} from '../chatgpt-translate.mjs';
import {createServer} from '../http-server.mjs';
import {atomicJSON} from '../vault.mjs';

const cues=Array.from({length:40},(_,i)=>({start:i*5,end:i*5+5,en:`Sentence ${i}.`}));
const sse=events=>events.map(event=>`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join('');
const delta=text=>({type:'response.output_text.delta',delta:text});
const completed=text=>({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text}]}]}});
/** A Responses stream that sends each chunk only after the previous one is read, so tests can act between chunks. */
function streamOf(chunks,{hold,signal}={}){
  let i=0;return new Response(new ReadableStream({async pull(controller){
    if(hold&&i===hold.at)await hold.until;
    // Like a real fetch body, an aborted request errors the stream.
    if(signal?.aborted){controller.error(signal.reason);return;}
    if(i<chunks.length)controller.enqueue(new TextEncoder().encode(chunks[i++]));else controller.close();
  }}),{headers:{'Content-Type':'text/event-stream'}});
}
async function fixture(t,{fetcher,connected=true}={}){
  const root=await mkdtemp(path.join(os.tmpdir(),'duvi-chat-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await atomicJSON(path.join(root,'data/catalog.json'),[{number:1}]);
  await atomicJSON(path.join(root,'data/1.json'),{number:1,title:'MIT 1. Introduction',course:'MIT 6.100L',videoUrl:'https://ocw.mit.edu/fixture.mp4',cues});
  const store=new LearningStore({root}),library=new LectureLibrary({root}),calls=[];
  const translations={cache:async()=>({translations:{20:{ko:'문장 20.'}}})};
  const auth={state:{activeId:connected?'acct':null},models:async()=>[{id:'gpt-test',name:'Test'}],token:async()=>'token'};
  const chat=new LearningChat({store,auth,library,translations,fetcher:async(url,init)=>{calls.push({url,body:JSON.parse(init.body),signal:init.signal});return fetcher(init);}});
  return {root,store,library,chat,calls};
}
async function ask(chat,body,{signal}={}){const events=[];await chat.ask({lectureId:'1',seconds:102,model:'gpt-test',...body},{signal,onEvent:(event,data)=>events.push({event,data})});return events;}

test('consumeResponse hands each text fragment to onDelta and returns the final text',async()=>{
  const seen=[];const text=await consumeResponse(streamOf([sse([delta('비유'),delta('로 ')]),sse([completed('비유로 설명')])]),{onDelta:part=>seen.push(part)});
  assert.deepEqual(seen,['비유','로 ']);assert.equal(text,'비유로 설명');
});
test('a chat turn streams deltas and stores both messages with time and model',async t=>{
  const {chat,store,calls}=await fixture(t,{fetcher:()=>streamOf([sse([delta('냄비 '),delta('비유: [01:40] 장면')]),sse([completed('냄비 비유: [01:40] 장면')])])});
  const events=await ask(chat,{text:'  변수가 뭐예요?  '});
  assert.deepEqual(events.map(row=>row.event),['start','delta','delta','done']);
  assert.equal(events[0].data.thread.messages[0].text,'변수가 뭐예요?');
  const {thread}=events.at(-1).data;assert.equal(events.at(-1).data.status,'complete');
  assert.deepEqual(thread.messages.map(row=>[row.role,row.text,row.seconds,row.model]),[['user','변수가 뭐예요?',102,'gpt-test'],['assistant','냄비 비유: [01:40] 장면',102,'gpt-test']]);
  assert.equal(thread.title,'변수가 뭐예요?');assert.equal(thread.lectureId,'1');
  assert.deepEqual((await store.get()).chats,[thread]);
  const body=calls[0].body;assert.equal(body.instructions,CHAT_INSTRUCTIONS);assert.equal(body.store,false);assert.equal(body.stream,true);
  const context=JSON.parse(body.input[0].content.split('\n').slice(1).join('\n'));
  assert.equal(context.lecture.title,'MIT 1. Introduction');assert.equal(context.playback,'01:42');assert.equal(context.roadmap.concept,'MIT 1. Introduction to CS and Programming Using Python');
  // ±60 s around 102 s covers cues 8..32; the cue playing is marked and carries its Korean translation.
  assert.equal(context.transcript[0].at,'00:40');assert.equal(context.transcript.at(-1).at,'02:40');
  assert.deepEqual(context.transcript.find(row=>row.current),{at:'01:40',en:'Sentence 20.',ko:'문장 20.',current:true});
  assert.deepEqual(body.input.at(-1),{role:'user',content:'변수가 뭐예요?'});
});
test('a follow-up sends previous turns and the learner notes of this lecture only',async t=>{
  let n=0;const {chat,store,calls}=await fixture(t,{fetcher:()=>streamOf([sse([delta(`답 ${++n}`),completed(`답 ${n}`)])])});
  const anchor={lectureId:'1',seconds:3,sourceText:'Sentence 0.',translation:'',alignmentRevision:null,cueStart:0,cueEnd:5};
  await store.saveRecord({revision:0,record:{resourceId:'mit-1',lectureId:'1',question:'print는 무엇?',explanation:'화면에 보여 줌',anchor}});
  await store.saveRecord({revision:1,record:{resourceId:'other',question:'다른 강의 질문'}});
  const first=await ask(chat,{text:'첫 질문'}),threadId=first[0].data.thread.id;
  await ask(chat,{threadId,text:'이어서 질문'});
  const second=calls[1].body,context=JSON.parse(second.input[0].content.split('\n').slice(1).join('\n'));
  assert.deepEqual(context.learnerNotes,[{at:'00:03',question:'print는 무엇?',explanation:'화면에 보여 줌'}]);
  assert.deepEqual(second.input.slice(1),[{role:'user',content:'첫 질문'},{role:'assistant',content:'답 1'},{role:'user',content:'이어서 질문'}]);
  assert.equal((await store.get()).chats[0].messages.length,4);
});
test('chat context helpers keep the nearest transcript and the latest history within budget',()=>{
  const window=transcriptWindow(cues,{},101,{budget:40});
  assert.deepEqual(window.map(row=>row.at),['01:35','01:40','01:45']);
  assert.deepEqual(trimHistory([{role:'user',text:'a'.repeat(10)},{role:'assistant',text:'b'.repeat(10)},{role:'user',text:'c'}],{budget:12}),[{role:'assistant',content:'b'.repeat(10)},{role:'user',content:'c'}]);
  assert.equal(lecturePlace('yt_VMj-3S1tku0').phase.length>0,true);assert.equal(lecturePlace('missing'),null);
});
test('not connected, unknown model or empty question fail before anything is stored',async t=>{
  const {chat,store,calls}=await fixture(t,{connected:false,fetcher:()=>{throw new Error('never');}});
  await assert.rejects(ask(chat,{text:'질문'}),{code:'not_connected',status:401,message:/ChatGPT에 연결하면/});
  const connected=await fixture(t,{fetcher:()=>{throw new Error('never');}});
  await assert.rejects(ask(connected.chat,{text:'질문',model:'other'}),{code:'invalid_model'});
  await assert.rejects(ask(connected.chat,{text:'   '}),{code:'invalid_learning'});
  await assert.rejects(ask(connected.chat,{text:'질문',threadId:'missing-thread'}),{code:'not_found'});
  assert.equal(calls.length+connected.calls.length,0);assert.deepEqual((await store.get()).chats,[]);assert.deepEqual((await connected.store.get()).chats,[]);
});
test('a usage limit becomes a chat error event and keeps the question',async t=>{
  const {chat,store}=await fixture(t,{fetcher:()=>streamOf([sse([{type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}}])])});
  const events=await ask(chat,{text:'한도 질문'});
  assert.deepEqual(events.map(row=>row.event),['start','error']);
  assert.equal(events[1].data.code,'subscription_sharing_usage_limit_exceeded');assert.match(events[1].data.message,/사용 한도.*다시 질문/);assert.doesNotMatch(events[1].data.message,/번역|자막/);
  assert.deepEqual((await store.get()).chats[0].messages.map(row=>row.role),['user']);
});
test('a stream that ends early keeps the partial answer as interrupted',async t=>{
  const {chat,store}=await fixture(t,{fetcher:()=>streamOf([sse([delta('반쯤 온 '),delta('답')])])});
  const events=await ask(chat,{text:'끊기는 질문'});
  assert.equal(events.at(-1).event,'error');assert.equal(events.at(-1).data.code,'interrupted_stream');assert.match(events.at(-1).data.message,/받은 부분까지 저장/);
  const answer=(await store.get()).chats[0].messages[1];assert.deepEqual([answer.text,answer.status],['반쯤 온 답','interrupted']);
});
test('a network failure is reported without storing an answer',async t=>{
  const {chat,store}=await fixture(t,{fetcher:()=>{throw new TypeError('fetch failed');}});
  const events=await ask(chat,{text:'연결 질문'});
  assert.equal(events.at(-1).data.code,'network');assert.equal((await store.get()).chats[0].messages.length,1);
});
test('stop ends the stream and saves what arrived as stopped',async t=>{
  let release;const hold={at:1,until:new Promise(resolve=>release=resolve)};
  const {chat,store}=await fixture(t,{fetcher:init=>{const response=streamOf([sse([delta('멈추기 전 ')]),sse([delta('안 보일 글'),completed('x')])],{hold,signal:init.signal});init.signal.addEventListener('abort',()=>release());return response;}});
  const events=[];const running=chat.ask({lectureId:'1',seconds:10,model:'gpt-test',text:'멈출 질문'},{onEvent:(event,data)=>{events.push({event,data});if(event==='delta')assert.deepEqual(chat.stop({threadId:data.thread?.id??events[0].data.thread.id}),{stopped:true});}});
  await running;
  assert.equal(events.at(-1).event,'done');assert.equal(events.at(-1).data.status,'stopped');
  const answer=(await store.get()).chats[0].messages[1];assert.deepEqual([answer.text,answer.status],['멈추기 전','stopped']);
  assert.deepEqual(chat.stop({threadId:answer.id}),{stopped:false});
});
test('a saved answer becomes one open learning record anchored at the question time',async t=>{
  const {chat,store}=await fixture(t,{fetcher:()=>streamOf([sse([completed('AI 답변')])])});
  const events=await ask(chat,{text:'왜 0부터 세나요?'}),thread=events.at(-1).data.thread,answer=thread.messages[1];
  const {state,recordId}=await chat.saveRecord({threadId:thread.id,messageId:answer.id});
  const record=state.records.find(row=>row.id===recordId);
  assert.deepEqual([record.question,record.explanation,record.aiAnswer,record.resourceId,record.lectureId],['왜 0부터 세나요?','','AI 답변','mit-1','1']);
  assert.deepEqual(record.anchor,{lectureId:'1',seconds:102,sourceText:'Sentence 20.',translation:'문장 20.',alignmentRevision:null,cueStart:100,cueEnd:105});
  assert.ok(Date.parse(record.reviewDueAt)>Date.now());
  assert.equal(state.chats[0].messages[1].recordId,recordId);
  const again=await chat.saveRecord({threadId:thread.id,messageId:answer.id});assert.equal(again.recordId,recordId);assert.equal(again.state.records.length,1);
  await assert.rejects(chat.saveRecord({threadId:thread.id,messageId:thread.messages[0].id}),{code:'not_found'});
});
test('the chat route streams server-sent events with the explicit mock provider and refuses without a connection',async t=>{
  const {root,library}=await fixture(t,{fetcher:()=>{throw new Error('never');}});
  const start=async(port,options)=>{const server=createServer({root,library,translations:{publicJob:()=>null,cache:async()=>({translations:{}})},port,...options});await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
    const base=`http://127.0.0.1:${port}`,session=await fetch(base+'/api/session'),cookie=session.headers.get('set-cookie').split(';')[0],{csrf}=await session.json();
    return (route,body)=>fetch(base+route,{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':csrf},body:body&&JSON.stringify(body)});};
  const offline=await start(6197,{auth:{state:{activeId:null},publicState:()=>({accounts:[]})}});
  const refused=await offline('/api/learning/chat',{lectureId:'1',seconds:3,text:'질문',model:'m'});
  assert.equal(refused.status,401);assert.equal((await refused.json()).error.code,'not_connected');
  assert.equal((await offline('/api/learning/chat/models')).status,401);
  const mocked=await start(6198,{auth:{state:{activeId:null},publicState:()=>({accounts:[]})},chatProvider:createMockChatProvider({delayMs:0,chunk:40})});
  const {models}=await (await mocked('/api/learning/chat/models')).json();assert.match(models[0].name,/실제 ChatGPT 아님/);
  const response=await mocked('/api/learning/chat',{lectureId:'1',seconds:3,text:'모의 질문',model:models[0].id});
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/event-stream/);
  const text=await response.text(),names=[...text.matchAll(/^event: (\w+)$/gm)].map(match=>match[1]);
  assert.equal(names[0],'start');assert.equal(names.at(-1),'done');assert.ok(names.includes('delta'));
  const saved=JSON.parse(await readFile(path.join(root,'learning/state.json'),'utf8'));
  assert.match(saved.chats[0].messages[1].text,/모의 답변 · 실제 ChatGPT 아님[\s\S]*\[00:03\]/);
});
