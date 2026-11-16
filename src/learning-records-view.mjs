import {HELP,dueRecords,recordMarkdown,formatTime} from './learning-model.mjs';
import {el,button,field,download,busy} from './learning-dom.mjs';
export function renderRecords(root,{state,review=false,onEdit,onJump,onReview,onReload}){
  root.replaceChildren();const records=review?dueRecords(state.records):[...state.records].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  root.append(el('h3','',review?'지금 떠올려 보기':'내 학습 기록'),el('p','muted',review?'원래 설명을 보기 전에 새 데이터나 다른 조건에서 어떻게 적용할지 적어보세요. 1/3/7일은 바꿀 수 있는 초기 간격입니다.':`${records.length}개 저장한 기록 · 원문과 내 설명, 수정 이력을 함께 보관합니다.`));
  if(!records.length){root.append(el('p','learning-empty',review?'지금 복습할 기록이 없습니다. 질문을 저장할 때 다음 복습을 정할 수 있습니다.':'아직 기록이 없습니다. 강의의 질문 탭에서 막힌 점 한 줄을 남겨보세요.'));return;}
  for(const record of records){
    const card=el('article','learning-record');card.append(el('h4','',record.title||record.question||'내 설명'),el('p','muted',`강의 ${record.lectureId||record.anchor?.lectureId} · ${formatTime(record.anchor?.seconds)} · ${HELP[record.help]||'도움 미기록'}`));
    if(record.reviewDueAt)card.append(el('p','muted',`다음 복습: ${new Date(record.reviewDueAt).toLocaleString('ko-KR')}`));
    if(review){
      const form=el('form'),reflection=field('보지 않고 회상 · 새 문제에 적용 · 달라진 생각','reflection',{required:true}),help=field('이번 복습의 도움','help',{options:HELP}),interval=field('다음 복습 간격','interval',{options:{'1':'1일 뒤','3':'3일 뒤','7':'7일 뒤'}});interval.input.value='3';
      const submit=button('복습 기록 저장',null,'primary');submit.type='submit';const notice=el('p','notice');notice.setAttribute('role','status');form.append(reflection.wrap,help.wrap,interval.wrap,submit,notice);
      form.addEventListener('submit',event=>{event.preventDefault();if(!reflection.input.value.trim()){notice.textContent='회상하거나 보류한 이유를 적어주세요.';return;}void busy(submit,async()=>{try{await onReview({id:record.id,reflection:reflection.input.value,help:help.input.value,intervalDays:Number(interval.input.value)});notice.textContent='복습을 저장했습니다.';}catch(error){notice.textContent=error.message+' 입력은 유지됩니다.';if(error.status===409)notice.append(button('최신 기록 확인 · 입력 유지',async()=>{try{await onReload();notice.textContent='최신 상태를 확인했습니다. 입력을 검토하고 다시 저장하세요.';}catch(error){notice.textContent=error.message;}}));}});});card.append(form);
      const reveal=el('details');reveal.append(el('summary','','내 이전 설명 확인'),el('p','learning-preserve',record.explanation||'질문만 저장한 기록입니다.'),el('p','learning-preserve',record.result||''));card.append(reveal);
    }else card.append(el('p','learning-preserve',record.explanation||record.question));
    const actions=el('div','learning-actions');actions.append(button('기록 열기 · 수정 이력',()=>onEdit(record)),button('원문 시점 확인',()=>onJump(record)),button('Markdown 내려받기',()=>download('duvi-learning-note.md',recordMarkdown(record),'text/markdown;charset=utf-8')));card.append(actions);root.append(card);
  }
}
