export const PROGRESS = Object.freeze({not_started:'아직 시작 전',watching:'학습 중',practicing:'직접 실습 중',explained:'내 말로 설명함',reviewed:'시간을 두고 적용함'});
export const HELP = Object.freeze({none:'도움 없이',hint:'힌트 사용',partial:'부분 설명 사용',full:'전체 설명 사용'});
export const RECORD_FIELDS = ['title','question','explanation','observation','assumptions','alternative','prediction','result','revisionNote'];
export const FIRST_TWO_WEEKS = [
  ['MIT 1강 앞부분 · 코드 실행','선택: Stanford 도입 최대 8분. 데이터/가정/설명 메모와 변수 계산.'],
  ['MIT 1강 나머지 · Finger Exercise','입력을 바꾸기 전 예상과 실제 출력을 남기기.'],
  ['MIT 2강 · 조건문','측정값이 5 이상인 경우만 출력하는 코드.'],
  ['MIT 2강 복습 · 새 문제','왜 특정 측정이 기록에서 빠졌는지 설명하기.'],
  ['화면을 닫고 조건문 재작성','반례 입력과 AI 도움 유무를 표시한 독립 시도.'],
  ['MIT 3강 · 반복문','전체 목록의 합과 개수를 구하기.'],
  ['MIT 3강 연습 · 목록','전체 평균과 선택된 값의 평균 비교.'],
  ['선택 편향 실습','조건을 바꾸면 결론이 달라지는 표. 필요한 부분만 힌트.'],
  ['새 목록 · 고정 오프셋','+2 오프셋과 선택 효과를 구분하기.'],
  ['도움 없이 설명 · 원 목록 숨기기','정보가 부족해 원래 평균을 모르는 경우를 말하기.'],
].map(([title,output])=>({title,output}));
export function progressStatus(value){return typeof value==='string'?value:value?.status||'not_started';}
export function orderedResources(roadmap){return (roadmap?.phases||[]).flatMap(phase=>phase.resources||[]);}
export function nextResource(roadmap,progress={}){
  const resources=orderedResources(roadmap).filter(r=>!resourceCompleted(roadmap,progress,r)),started=resources.find(r=>['watching','practicing'].includes(progressStatus(progress[resourceProgressId(roadmap,r)])));
  return started||resources[0]||null;
}
export function resourceProgressId(roadmap,resource){return resource.lectureId?orderedResources(roadmap).find(r=>String(r.lectureId)===String(resource.lectureId))?.id||resource.id:resource.id;}
export function resourceCompleted(roadmap,progress,resource){return progress?.[resourceProgressId(roadmap,resource)]?.completed===true;}
export function completionSummary(roadmap,progress,resources=orderedResources(roadmap)){const total=resources.length,done=resources.filter(r=>resourceCompleted(roadmap,progress,r)).length;return {total,done,percent:total?Math.round(done/total*100):0};}
export function lectureResource(roadmap,lectureId,title='현재 강의'){return orderedResources(roadmap).find(r=>String(r.lectureId)===String(lectureId))||{id:`lecture-${lectureId}`,lectureId:String(lectureId),title};}
export function firstLecture(roadmap){return orderedResources(roadmap).find(r=>String(r.lectureId)==='1')||orderedResources(roadmap).find(r=>/mit/i.test(r.id+' '+r.title)&&/1(?:\D|$)/.test(r.title))||orderedResources(roadmap)[0];}
export function dueRecords(records,now=Date.now()){return records.filter(r=>r.reviewDueAt&&Number.isFinite(Date.parse(r.reviewDueAt))&&Date.parse(r.reviewDueAt)<=now);}
export function upcomingReviews(records,now=Date.now()){return records.filter(r=>r.reviewDueAt&&Number.isFinite(Date.parse(r.reviewDueAt))&&Date.parse(r.reviewDueAt)>now).sort((a,b)=>Date.parse(a.reviewDueAt)-Date.parse(b.reviewDueAt));}
/** A question still waiting for the learner's own explanation or a later review. */
export function isOpenQuestion(record){return !!record.question?.trim()&&!record.explanation?.trim()&&!record.reviews?.length;}
export const QUESTION_AUTOPAUSE_KEY='duvi-question-autopause';
export function questionAutoPause(storage){try{return storage.getItem(QUESTION_AUTOPAUSE_KEY)!=='off';}catch{return true;}}
export function makeAnchor({lecture,seconds=0,cue,translation=''}){
  if(!lecture)return null;
  const time=Math.max(0,Number(seconds)||0),anchoredTime=cue?Math.max(cue.start,Math.min(cue.end,time)):time;
  return {lectureId:String(lecture.number??lecture.id),seconds:anchoredTime,sourceText:cue?.en||'',translation,alignmentRevision:lecture.alignmentRevision??null,cueStart:cue?.start??null,cueEnd:cue?.end??null};
}
export function anchorState(anchor,lecture){
  if(!anchor||!lecture||String(lecture.number??lecture.id)!==String(anchor.lectureId))return {status:'missing',message:'원래 강의를 찾을 수 없습니다.'};
  const cue=(lecture.cues||[]).find(c=>c.start===anchor.cueStart&&c.end===anchor.cueEnd&&c.en===anchor.sourceText);
  if(!cue)return {status:'missing',message:'원문 구간이 바뀌었거나 없어졌습니다. 저장한 원문을 확인하세요.'};
  if((lecture.alignmentRevision??null)!==(anchor.alignmentRevision??null))return {status:'changed',message:'자막 정렬 버전이 달라졌습니다. 저장 당시 원문과 현재 대본을 대조하세요.'};
  return {status:'matched',seconds:anchor.seconds,message:'저장 당시 원문과 정렬 버전이 일치합니다.'};
}
export function validateRecord(record){
  if(!record.question?.trim()&&!record.explanation?.trim())return '질문 한 줄 또는 내 설명을 적어주세요.';
  if(!record.anchor?.lectureId||!record.anchor.sourceText?.trim()||!Number.isFinite(record.anchor.seconds))return '영어 자막이 있는 시점에서 기록을 시작하세요. 질문 입력은 유지됩니다.';
  return '';
}
export function markdownEscape(text){return String(text??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]()#+.!|~-])/g,'\\$1');}
export function recordMarkdown(record){
  const e=markdownEscape,a=record.anchor||{};
  const fields=[['질문',record.question],['내 설명',record.explanation],['관측 · 원자료 · 선택 규칙',record.observation],['가정 · 변수 · 해석',record.assumptions],['대안 · 측정 오류 · 구별 조건',record.alternative],['실행 전 예측 · 실패 기준 · 비용',record.prediction],['실제 결과 · 코드/노트북 · seed · 한계',record.result],['바뀐 생각 · 바꾼 증거 · 보류 이유',record.revisionNote]];
  return `# ${e(record.title||record.question||'학습 기록')}\n\n출처: 강의 ${e(a.lectureId)} · ${e(a.seconds)}초 · 정렬 버전 ${e(a.alignmentRevision??'원본')}\n\n원문 스냅샷: ${e(a.sourceText)}\n\n번역 스냅샷: ${e(a.translation||'저장 없음')}\n\n도움: ${e(HELP[record.help]||record.help)}\n\n`+fields.map(([title,value])=>`## ${title}\n\n${e(value||'미기록')}\n`).join('\n')+`\n## 최초 설명\n\n${e(record.originalExplanation??record.initialExplanation??record.explanation??'미기록')}\n\n## 수정·복습 이력\n\n${e(JSON.stringify({history:record.history||[],reviews:record.reviews||[]},null,2))}\n\n## 연구 연결 (직접 확인 후 작성)\n\n- 연결 문서 / SHA / 확인 방식: 미기록\n- 해결할 실패 / 바꿀 부품·가중치·기법: 미기록\n- 필요한 새 관측 / 비교군 / 기대 이득과 비용: 미기록\n- 실패 조건 / 결과와 해석 / 유지가 맞는 사례: 미기록\n\n교육용 탐색 기록입니다. 새로운 원리의 발견이나 원 실험 재현을 인증하지 않습니다.\n`;
}
export function recordsMarkdown(records,exportedAt=new Date()){
  const sorted=[...records].sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))),open=sorted.filter(isOpenQuestion).length;
  return `# Duvi 학습 기록 모음\n\n내보낸 시각: ${exportedAt.toISOString()} · 기록 ${sorted.length}개 · 열린 질문 ${open}개\n\n`+sorted.map(record=>recordMarkdown(record).replace(/^#/gm,'##')).join('\n---\n\n');
}
export function safeWebUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}}
export function formatTime(seconds){const n=Math.max(0,Math.floor(seconds||0));return `${Math.floor(n/60).toString().padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
export function apiErrorMessage(error){return error.status===409||/conflict|revision/i.test(error.code||'')?'다른 창에서 기록이 바뀌었습니다. 초안은 유지했습니다. 최신 기록을 확인한 뒤 다시 저장하세요.':error.message||'요청에 실패했습니다. 입력은 유지됩니다.';}
