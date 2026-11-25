import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom,createRoot,all,byTag,byText,settle} from './fake-dom.mjs';
import {fakeApi,quizStatus,ITEMS,LEARNING,EVIDENCE} from './quiz-fixtures.mjs';
import {renderQuizScreen,renderLectureQuizTab} from '../src/quiz-view.mjs';
import {renderReviewScreen,SELF_MARK_NOTE} from '../src/review-view.mjs';
import {createLearningViewApi} from '../src/quiz-api.mjs';

let restore;
test.beforeEach(()=>{restore=installDom();});
test.afterEach(()=>restore());
const radio=(root,name,value)=>all(root,node=>node.tagName==='INPUT'&&node.name===name&&node.value===value)[0];
const choose=(root,name,value)=>{const input=radio(root,name,value);input.checked=true;input.dispatch('change');};

test('quiz screen shows one question with its source chip, evidence label, code and a disabled 확인 until predicted',async()=>{
  const root=createRoot(),api=fakeApi(),view=renderQuizScreen(root,api,{lectureId:'1'});await view.ready;
  assert.ok(byText(root,'확인 문제','h1'));assert.match(root.textContent,/00:00~10:00 구간/);
  assert.ok(byText(root,'확인 문제 1/3 · 예측'));assert.ok(byText(root,'▶ 정답: 실제 실행 결과'));
  assert.equal(byTag(root,'pre')[0].textContent,'print(7 / 2)\nprint(7 // 2)');
  const check=byText(root,'확인','button');assert.equal(check.disabled,true);assert.ok(byText(root,'건너뛰기','button'));
  byText(root,'대본 08:41','a').click();assert.deepEqual(api.calls.at(-1),['open',{kind:'lecture',lectureId:'1',seconds:521}]);
  const rows=byTag(root,'tr');assert.equal(rows.length,4);
  assert.deepEqual(rows.slice(1).map(row=>row.children[2].textContent),['▶ 정답: 실제 실행 결과','△ AI 제안 · 정답 미검증','● 내가 확인']);
  assert.deepEqual(rows.slice(1).map(row=>row.children[3].textContent),['풂 · ✓ 맞음','풂 · ✕ 틀림','안 풂']);
  assert.ok(byText(root,'내 저장소 glorious-purpose/src/attentive_experimenter.py:141-143','a'));
  assert.equal(all(root,node=>node.tagName==='TEXTAREA'||node.tagName==='INPUT'&&node.type==='text').length,0,'an option question has no free-text box, and nothing here runs code');
});

test('predict → confidence → 확인 saves an attempt and shows the real output, the AI mismatch and the explanation box',async()=>{
  const root=createRoot(),api=fakeApi(),view=renderQuizScreen(root,api,{lectureId:'1'});await view.ready;
  choose(root,'prediction','3.5\n3.5');choose(root,'confidence','high');
  const check=byText(root,'확인','button');assert.equal(check.disabled,false);check.click();await settle();
  assert.deepEqual(api.calls.find(call=>call[0]==='attempt')[1],{lectureId:'1',segmentId:'s0',itemId:'q1',prediction:'3.5\n3.5',confidence:'high'});
  assert.ok(byText(root,/^✕ 예상과 다름/));assert.ok(byText(root,'정답: 실제 실행 결과','p'));assert.ok(byText(root,/AI가 예상한 답\(3.5 \/ 3.5\)과 실제 출력이 달라/));
  const why=all(root,node=>node.tagName==='TEXTAREA')[0];why.value='//는 몫만 남긴다';why.dispatch('input');
  byText(root,'설명 저장','button').click();await settle();
  assert.deepEqual(api.calls.filter(call=>call[0]==='attempt').at(-1)[1],{id:'attempt-q1',explanation:'//는 몫만 남긴다'});
  assert.ok(byText(root,'내 설명을 저장했습니다.'));assert.ok(byText(root,'다음 문제','button'));
});

test('a free-text AI question is self-graded after revealing the unverified answer, and can be confirmed or reported',async()=>{
  const root=createRoot(),api=fakeApi(),view=renderQuizScreen(root,api,{lectureId:'1'});await view.ready;
  byText(root,'건너뛰기','button').click();
  assert.ok(byText(root,'확인 문제 2/3 · 원문 회상'));assert.ok(byText(root,'△ AI 제안 · 정답 미검증'));
  const answer=all(root,node=>node.tagName==='TEXTAREA')[0];answer.value='값 폭주 방지';answer.dispatch('input');choose(root,'confidence','low');
  byText(root,'확인','button').click();await settle();
  assert.ok(byText(root,'AI 제안 답 (정답 미검증 · 채점은 내가)'));assert.equal(api.calls.some(call=>call[0]==='attempt'),false,'nothing is saved before the learner grades');
  byText(root,'맞았음','button').click();await settle();
  assert.equal(api.calls.find(call=>call[0]==='attempt')[1].result,'right');
  byText(root,'내가 확인 (답이 맞다)','button').click();await settle();assert.deepEqual(api.calls.filter(call=>call[0]==='item').at(-1)[1],{lectureId:'1',segmentId:'s0',itemId:'q2',action:'confirm'});
});

test('with code execution off a coded AI question reads 꺼짐, not a failed run, and stays unverified',async()=>{
  const coded={...ITEMS[1],code:'print(7 / 2)',execution:{status:'disabled',reason:'코드 실행 꺼짐'}};
  const root=createRoot(),api=fakeApi({quiz:()=>Promise.resolve({...quizStatus({items:[coded]}),codeExecution:false})}),view=renderQuizScreen(root,api,{lectureId:'1'});await view.ready;
  assert.ok(byText(root,/^문제 코드 실행이 꺼져 있습니다/));assert.ok(byText(root,'△ AI 제안 · 정답 미검증'));
  const answer=all(root,node=>node.tagName==='TEXTAREA')[0];answer.value='3.5';answer.dispatch('input');choose(root,'confidence','low');
  byText(root,'확인','button').click();await settle();
  assert.ok(byText(root,'AI 제안 답 (정답 미검증 · 채점은 내가)'));assert.ok(byText(root,'○ 코드 실행 꺼짐 · 정답 미검증','p'));
  assert.equal(/실행하지 못해/.test(root.textContent),false,'an execution switched off is not shown as a failed run');
});

test('generation states: no set → preview of what is sent → generating with cancel → failed with retry, input kept',async()=>{
  let fail;const pending=new Promise((resolve,reject)=>{fail=reject;});
  const root=createRoot(),api=fakeApi({quiz:()=>Promise.resolve(quizStatus({set:false})),generate:body=>{api.calls.push(['generate',body]);return pending;}});
  const view=renderQuizScreen(root,api,{lectureId:'1'});await view.ready;
  assert.ok(byText(root,'○ 이 구간에는 아직 확인 문제가 없습니다.'));
  const concepts=all(root,node=>node.tagName==='INPUT'&&node.type==='text')[0];concepts.value='정수 나눗셈, 자료형';concepts.dispatch('input');
  byText(root,'보낼 자료 확인','button').click();await settle();
  assert.deepEqual(api.calls.find(call=>call[0]==='preview')[1],{lectureId:'1',segmentId:'s0',excerpts:[],concepts:['정수 나눗셈','자료형']});
  assert.ok(byText(root,'대본 1문장 (10:00~20:00, 영어·한국어)'));assert.ok(byText(root,'보낼 내용 그대로 보기'));
  byText(root,'보내고 만들기','button').click();await settle();
  assert.deepEqual(api.calls.find(call=>call[0]==='generate')[1],{token:'tok',model:'gpt-test'});
  assert.ok(byText(root,/^◌ 확인 문제를 만드는 중입니다/));byText(root,'취소','button').click();await settle();assert.ok(api.calls.some(call=>call[0]==='cancel'));
  fail(Object.assign(new Error('ChatGPT 사용 한도에 도달했습니다.'),{code:'subscription_sharing_usage_limit_exceeded'}));await settle();
  assert.ok(byText(root,'✕ 만들지 못했습니다: ChatGPT 사용 한도에 도달했습니다.'));assert.ok(byText(root,'다시 시도','button'));
  assert.equal(all(root,node=>node.tagName==='INPUT'&&node.type==='text')[0].value,'정수 나눗셈, 자료형','the learner input survives the failure');
});

test('connection needed and stale sets are explicit states',async()=>{
  const offline=createRoot(),view=renderQuizScreen(offline,fakeApi({quiz:()=>Promise.resolve(quizStatus({set:false,connected:false}))}),{lectureId:'1'});await view.ready;
  assert.ok(byText(offline,'○ 확인 문제를 만들려면 ChatGPT 연결이 필요합니다.'));assert.equal(byText(offline,'보낼 자료 확인','button'),null);
  const stale=createRoot(),staleView=renderQuizScreen(stale,fakeApi({quiz:()=>Promise.resolve(quizStatus({stale:true}))}),{lectureId:'1'});await staleView.ready;
  assert.ok(byText(stale,'△ 이 문제는 예전 대본 기준입니다. 자막이 바뀌었습니다.'));assert.ok(byText(stale,'확인 문제 1/3 · 예측'),'old questions stay usable');
});

test('lecture tab lists segment-end checkpoints with 안 풂/풂 and opens the quiz screen',async()=>{
  const root=createRoot(),api=fakeApi(),tab=renderLectureQuizTab(root,api,{lectureId:'1'});await tab.ready;
  const rows=all(root,node=>node.className==='quiz-checkpoint');assert.equal(rows.length,3);
  assert.match(rows[0].textContent,/00:00~10:00 구간 끝 · 문제 3 · 풂 2\/3/);assert.match(rows[1].textContent,/문제 없음/);
  byText(rows[1],'만들기','button').click();assert.deepEqual(api.calls.at(-1),['open',{kind:'quiz',lectureId:'1',segmentId:'s600'}]);
  byText(rows[0],'10:00','a').click();assert.deepEqual(api.calls.at(-1),['open',{kind:'lecture',lectureId:'1',seconds:600}]);
});

test('review screen separates self-marks from evidence, logs evidence newest first and links each count to its list',async()=>{
  const root=createRoot(),api=fakeApi(),view=renderReviewScreen(root,api);await view.ready;
  assert.ok(byText(root,'1 / 3'));assert.ok(byText(root,SELF_MARK_NOTE));
  assert.ok(byText(root,'2개 (열린 질문 1, 내 설명 1)'));assert.ok(byText(root,'2회 풂 (실행 근거 1, 원문 인용 확인 0, 내가 확인 0, AI 제안 · 미검증 1)'));
  assert.ok(byText(root,'커밋 2개, 테스트 결과 1개 (통과 1, 실패 1)'));assert.ok(byText(root,'오늘 2개'));
  const dates=byTag(root,'tr').filter(row=>row.children[0]?.className==='review-num').map(row=>row.children[0].textContent);
  assert.deepEqual(dates,[...dates].sort().reverse());assert.equal(dates.length,7);
  byText(root,'푼 기록 보기','button').click();assert.deepEqual(byTag(root,'tr').filter(row=>row.children[0]?.className==='review-num').map(row=>row.children[1].textContent),['확인 문제','확인 문제']);
  for(const [label,kind] of [['기록 보기','records'],['복습하기','review'],['학습 로드맵','roadmap'],['백업·복원','backup']]){byText(root,label,'button').click();assert.deepEqual(api.calls.at(-1),['open',{kind}]);}
  assert.ok(byText(root,'MIT 2강 이어 보기'));byText(root,'이어 보기','button').click();assert.equal(api.calls.at(-1)[1].resource.id,'mit-2');
});

test('missing evidence reads 아직 증거 없음 and an unconfigured repository says so, never a 0 as progress',async()=>{
  const empty={...LEARNING,progress:{},records:[],attempts:[]};
  const root=createRoot(),view=renderReviewScreen(root,fakeApi({learning:()=>Promise.resolve(empty),evidence:()=>Promise.resolve({configured:false,message:'설정된 저장소 없음',repos:[]})}));await view.ready;
  assert.ok(byText(root,'아직 완료 표시 없음'));assert.equal(all(root,node=>node.textContent==='아직 증거 없음').filter(node=>!node.children.length).length,3);
  assert.ok(byText(root,'설정된 저장소 없음'));assert.ok(byText(root,'저장소 설정','button'));assert.equal(/(^|\D)0(개|회)/.test(root.textContent),false);
  const configuredEmpty=createRoot(),second=renderReviewScreen(configuredEmpty,fakeApi({learning:()=>Promise.resolve(empty),evidence:()=>Promise.resolve({configured:true,repos:[{...EVIDENCE.repos[0],commits:[],tests:[]}]})}));await second.ready;
  assert.ok(byText(configuredEmpty,'아직 증거 없음','td'));
});

test('the view api maps to the registered routes',async()=>{
  const seen=[],api=createLearningViewApi(async(route,body)=>{seen.push([route,body]);return {models:[]};});
  await api.quiz('yt_abc');await api.preview({a:1});await api.generate({token:'t'});await api.cancel(1);await api.attempt({});await api.item({});await api.evidence();await api.models();
  assert.deepEqual(seen.map(row=>row[0]),['/api/learning/quizzes/yt_abc','/api/learning/quiz/preview','/api/learning/quiz/generate','/api/learning/quiz/cancel','/api/learning/quiz/attempt','/api/learning/quiz/item','/api/learning/evidence','/api/learning/chat/models']);
  assert.deepEqual(seen[3][1],{lectureId:'1'});
});
