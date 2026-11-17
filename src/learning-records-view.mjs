import {HELP,dueRecords,upcomingReviews,isOpenQuestion,recordMarkdown,recordsMarkdown,formatTime} from './learning-model.mjs';
import {el,button,field,download,busy} from './learning-dom.mjs';
const where=(record,lectureName)=>`${lectureName(record.lectureId||record.anchor?.lectureId)} · ${formatTime(record.anchor?.seconds)}`;
const dateText=value=>new Date(value).toLocaleString('ko-KR',{month:'long',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'});
export function renderRecords(root,{state,review=false,filter='all',onFilter=()=>{},lectureName=id=>`강의 ${id}`,onEdit,onJump,onReview,onReload}){
  root.replaceChildren();
  const all=[...state.records].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))),open=all.filter(isOpenQuestion);
  const records=review?dueRecords(state.records):filter==='open'?open:all;
  root.append(el('h3','',review?'지금 떠올려 보기':'내 학습 기록'),el('p','muted',review?'원래 설명을 보기 전에 새 데이터나 다른 조건에서 어떻게 적용할지 적어보세요. 1/3/7일은 바꿀 수 있는 초기 간격입니다.':`${all.length}개 저장한 기록 · 원문과 내 설명, 수정 이력을 함께 보관합니다.`));
  if(!review){
    const bar=el('div','learning-actions learning-record-filter');bar.setAttribute('role','group');bar.setAttribute('aria-label','기록 보기');
    for(const [id,label] of [['all',`전체 ${all.length}`],['open',`열린 질문 ${open.length}`]]){const tab=button(label,()=>onFilter(id));tab.setAttribute('aria-pressed',String(filter===id));bar.append(tab);}
    const exportAll=button('전체 기록 Markdown 내려받기',()=>download(`duvi-learning-records-${new Date().toISOString().slice(0,10)}.md`,recordsMarkdown(state.records),'text/markdown;charset=utf-8'));exportAll.disabled=!all.length;bar.append(exportAll);
    root.append(bar);
    if(filter==='open')root.append(el('p','muted','열린 질문: 질문은 남겼지만 아직 내 설명도 복습도 없는 기록입니다. 하나를 골라 내 말로 설명해 보세요.'));
  }
  if(!records.length)root.append(el('p','learning-empty',review?(upcomingReviews(state.records).length?'지금 복습할 기록이 없습니다. 아래 "예정된 복습"에서 다음 날짜를 확인하세요.':'지금 복습할 기록이 없습니다. 질문을 저장할 때 다음 복습을 정할 수 있습니다.'):filter==='open'?'열린 질문이 없습니다. 남긴 질문마다 내 설명을 적었거나 복습했습니다.':'아직 기록이 없습니다. 강의의 질문 탭에서 막힌 점 한 줄을 남겨보세요.'));
  for(const record of records){
    const card=el('article','learning-record');card.append(el('h4','',record.question||record.title||'내 설명'));
    if(record.question&&record.title)card.append(el('p','muted',`제목: ${record.title}`));
    card.append(el('p','muted',`${where(record,lectureName)} · ${HELP[record.help]||'도움 미기록'}`));
    if(record.reviewDueAt)card.append(el('p','muted',`다음 복습: ${new Date(record.reviewDueAt).toLocaleString('ko-KR')}`));
    if(review){
      const form=el('form'),reflection=field('보지 않고 회상 · 새 문제에 적용 · 달라진 생각','reflection',{required:true}),help=field('이번 복습의 도움','help',{options:HELP}),interval=field('다음 복습 간격','interval',{options:{'1':'1일 뒤','3':'3일 뒤','7':'7일 뒤'}});interval.input.value='3';
      const submit=button('복습 기록 저장',null,'primary');submit.type='submit';const notice=el('p','notice');notice.setAttribute('role','status');form.append(reflection.wrap,help.wrap,interval.wrap,submit,notice);
      form.addEventListener('submit',event=>{event.preventDefault();if(!reflection.input.value.trim()){notice.textContent='회상하거나 보류한 이유를 적어주세요.';return;}void busy(submit,async()=>{try{await onReview({id:record.id,reflection:reflection.input.value,help:help.input.value,intervalDays:Number(interval.input.value)});notice.textContent='복습을 저장했습니다.';}catch(error){notice.textContent=error.message+' 입력은 유지됩니다.';if(error.status===409)notice.append(button('최신 기록 확인 · 입력 유지',async()=>{try{await onReload();notice.textContent='최신 상태를 확인했습니다. 입력을 검토하고 다시 저장하세요.';}catch(error){notice.textContent=error.message;}}));}});});card.append(form);
      const reveal=el('details');reveal.append(el('summary','','내 이전 설명 확인'),el('p','learning-preserve',record.explanation||'질문만 저장한 기록입니다.'),el('p','learning-preserve',record.result||''));card.append(reveal);
    }else if(record.explanation)card.append(el('p','learning-label','내 설명'),el('p','learning-preserve',record.explanation));
    else card.append(el('p','learning-open-tag',isOpenQuestion(record)?'열린 질문 · 아직 내 설명 전':'질문만 저장 · 복습 기록 있음'));
    const actions=el('div','learning-actions');actions.append(button(record.explanation?'기록 열기 · 수정 이력':'기록 열기 · 내 설명 쓰기',()=>onEdit(record)),button('원문 시점 확인',()=>onJump(record)),button('Markdown 내려받기',()=>download('duvi-learning-note.md',recordMarkdown(record),'text/markdown;charset=utf-8')));card.append(actions);root.append(card);
  }
  if(review){
    const upcoming=upcomingReviews(state.records),box=el('details','learning-upcoming');box.open=!records.length&&upcoming.length>0;
    box.append(el('summary','',`예정된 복습 ${upcoming.length}개`));
    if(!upcoming.length)box.append(el('p','muted','예정된 복습이 없습니다. 기록을 저장할 때 다음 회상 복습을 고르면 여기에 날짜순으로 보입니다.'));
    else{const list=el('ol','learning-upcoming-list');for(const record of upcoming){const row=el('li');row.append(el('strong','',dateText(record.reviewDueAt)),el('span','',` ${record.question||record.title||'내 설명'}`),el('span','muted',` · ${where(record,lectureName)}`),button('기록 열기',()=>onEdit(record)));list.append(row);}box.append(list);}
    root.append(box);
  }
}
