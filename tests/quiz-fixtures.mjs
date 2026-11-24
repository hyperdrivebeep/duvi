// Fixture data for the 확인 문제 and 돌아보기 view tests and the preview pages. All questions and numbers are examples.
export const ITEMS=[
  {id:'q1',type:'predict',prompt:'아래 코드를 실행하면 무엇이 출력될까요? 먼저 예측하세요.',code:'print(7 / 2)\nprint(7 // 2)',options:['3.5\n3.5','3.5\n3','3\n3','알 수 없음 (더 필요한 정보가 있다)'],answer:'3.5\n3',source:{kind:'transcript',ref:'08:41'},quote:'',concepts:['정수 나눗셈'],evidence:'executed',execution:{status:'executed',output:'3.5\n3',aiAnswer:'3.5\n3.5',mismatch:true,truncated:false}},
  {id:'q2',type:'recall',prompt:'로그분산을 범위로 제한하는 이유를 내 말로 적어 보세요.',answer:'값이 너무 커지거나 작아져 수치가 불안정해지는 것을 막기 위해',source:{kind:'repo',repo:'glorious-purpose',ref:'src/attentive_experimenter.py:141-143'},quote:'',concepts:['수치 안정성'],evidence:'ai_unverified'},
  {id:'q3',type:'recall',prompt:"강의가 말한 '절차적 지식'을 내 말로 설명하세요.",answer:'어떻게 하는지에 대한 지식, 즉 레시피',source:{kind:'transcript',ref:'03:10'},quote:'Imperative knowledge is a recipe, or how-to.',concepts:[],evidence:'learner_confirmed'},
];
export function quizStatus({connected=true,set=true,stale=false,generating=false,items=ITEMS}={}){
  return {lectureId:'1',title:'MIT 6.100L · 1강 Introduction to CS and Programming',duration:1500,connected,mock:false,generating,repos:['glorious-purpose'],
    segments:[
      {id:'s0',start:0,end:600,cueCount:120,set:set?{generatedAt:'2026-11-24T09:00:00.000Z',model:'gpt-test',mock:false,dropped:0,items:structuredClone(items),counts:{},stale}:undefined},
      {id:'s600',start:600,end:1200,cueCount:110},
      {id:'s1200',start:1200,end:1500,cueCount:40},
    ]};
}
export const ROADMAP={phases:[{title:'1단계 Python 기초',resources:[{id:'mit-1',lectureId:'1',title:'MIT 1강'},{id:'mit-2',lectureId:'2',title:'MIT 2강'},{id:'reading-1',title:'읽기 1'}]}]};
export function attemptOf(item,extra={}){
  const {id,evidence,execution,...snapshot}=item;
  return {id:`attempt-${id}`,lectureId:'1',segmentId:'s0',itemId:id,item:snapshot,evidence,prediction:'3.5\n3',confidence:'medium',result:'right',grading:'option',explanation:'',createdAt:'2026-11-24T10:00:00.000Z',updatedAt:'2026-11-24T10:00:00.000Z',revision:1,reviewDueAt:'2026-11-27T10:00:00.000Z',...extra};
}
export const LEARNING={schemaVersion:3,revision:4,progress:{'mit-1':{status:'watching',completed:true,revision:1,updatedAt:'2026-11-22T10:00:00.000Z'}},settings:{},chats:[],
  records:[
    {id:'r1',resourceId:'mit-1',lectureId:'1',question:"'지식'은 선언적·절차적 중 어느 쪽?",explanation:'',reviews:[],updatedAt:'2026-11-24T08:00:00.000Z',reviewDueAt:'2026-11-23T08:00:00.000Z',anchor:{lectureId:'1',seconds:22}},
    {id:'r2',resourceId:'mit-1',lectureId:'1',question:'computation과 calculation 차이',explanation:'계산기는 식 하나, 컴퓨터는 순서대로 여러 단계',reviews:[],updatedAt:'2026-11-22T08:00:00.000Z',anchor:{lectureId:'1',seconds:9}},
  ],
  attempts:[attemptOf(ITEMS[0]),attemptOf(ITEMS[1],{id:'attempt-q2',prediction:'모름',confidence:'high',result:'wrong',grading:'self',createdAt:'2026-11-23T10:00:00.000Z',reviewDueAt:'2026-11-24T00:00:00.000Z'})]};
export const EVIDENCE={configured:true,repos:[{label:'glorious-purpose',path:'(fixture)',errors:[],
  commits:[{sha:'0ce68ab',date:'2026-11-23T11:00:00.000Z',subject:'Adam 스텝을 torch와 비교하는 테스트'},{sha:'7a1c2e0',date:'2026-11-21T11:00:00.000Z',subject:'시드 재현성 점검'}],
  tests:[{file:'reports/junit.xml',updatedAt:'2026-11-23T12:00:00.000Z',tests:2,passed:1,failed:1,skipped:0,cases:[{name:'test_adam_step_matches_torch_adam',status:'passed'},{name:'test_same_seed_gives_identical_starting_parameters',status:'failed'}]}]}]};
/** A fake api with recorded calls; methods can be replaced per test. */
export function fakeApi(overrides={}){
  const calls=[],record=(name,value)=>(...args)=>{calls.push([name,...args]);return typeof value==='function'?value(...args):Promise.resolve(structuredClone(value));};
  const api={calls,
    quiz:record('quiz',quizStatus()),learning:record('learning',LEARNING),roadmap:record('roadmap',ROADMAP),evidence:record('evidence',EVIDENCE),models:record('models',[{id:'gpt-test',name:'GPT 테스트'}]),
    preview:record('preview',body=>Promise.resolve({token:'tok',lectureId:'1',segment:{id:body.segmentId,start:600,end:1200},chars:5120,connected:true,payload:{segment:{start:'10:00',end:'20:00'},transcript:[{at:'10:00',en:'Declarative knowledge is a statement of fact.',ko:'선언적 지식은 사실의 진술입니다.'}],excerpts:[],concepts:body.concepts}})),
    generate:record('generate',quizStatus()),cancel:record('cancel',{cancelled:true}),item:record('item',quizStatus()),
    attempt:record('attempt',body=>Promise.resolve({attempt:body.id?{...attemptOf(ITEMS[0]),id:body.id,explanation:body.explanation,revision:2}:attemptOf(ITEMS.find(row=>row.id===body.itemId),{prediction:body.prediction,confidence:body.confidence,result:body.prediction==='3.5\n3'?'right':'wrong'}),revision:5})),
    open:target=>{calls.push(['open',target]);},lectureName:id=>`${id}강`,
    ...overrides};
  return api;
}
