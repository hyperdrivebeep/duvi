import {PROGRESS,FIRST_TWO_WEEKS,progressStatus,orderedResources,firstLecture,nextResource} from './learning-model.mjs';
import {el,button,link,field,describe} from './learning-dom.mjs';
export function resourceAction(resource,label,onOpen,className=''){return resource.lectureId?button(label,()=>onOpen(resource),className):link(label,resource.url);}
export function renderRoadmap(root,{roadmap,state,onOpen,onProgress,onPrepare}){
  root.replaceChildren();
  const first=firstLecture(roadmap),next=nextResource(roadmap,state.progress),started=Object.values(state.progress||{}).some(v=>progressStatus(v)!=='not_started');
  const hero=el('section','learning-start');hero.append(el('p','learning-eyebrow','오늘 시작하기'),el('h3','',first?.title||'MIT Python · Lecture 1'),el('p','muted','첫 본강의는 MIT Python 1강입니다. 질문 한 줄을 남기고, 직접 작은 코드를 실행해 보세요.'));
  if(first)hero.append(resourceAction(first,'MIT 1강 시작하기',onOpen,'primary'));
  if(started&&next)hero.append(resourceAction(next,`이어서 공부하기 · ${next.title}`,onOpen));
  hero.append(button('순서대로 강의 폴더 준비',onPrepare));root.append(hero);
  root.append(el('p','muted','시청 시간은 이해의 증거가 아닙니다. 실제로 해 본 활동을 직접 표시하세요. 단계는 자유롭게 오갈 수 있습니다.'));
  const source=roadmap.source,sourceLine=el('div','learning-source');
  sourceLine.append(el('span','muted',`로드맵 버전 ${roadmap.version||'미기록'} · ${typeof source==='object'?(source.checkedAt||source.verifiedAt||source.commit||source.sha||'원문 기준'):source||'원문 확인 필요'}`));
  if(source?.url)sourceLine.append(link('로드맵 원문',source.url));root.append(sourceLine);
  for(const [index,phase] of (roadmap.phases||[]).entries()){
    const section=el('details','learning-phase');section.open=index===0;
    section.append(el('summary','',`${String(index+1).padStart(2,'0')} · ${phase.title} · ${describe(phase.weeks)}`));
    section.append(el('p','learning-goal',phase.goal));
    const list=el('ol','learning-resources');
    for(const resource of phase.resources||[]){
      const row=el('li','learning-resource'),body=el('div','learning-resource-body');body.append(el('h4','',resource.title));if(resource.description)body.append(el('p','muted',resource.description));
      if(resource.start!==undefined||resource.end!==undefined)body.append(el('p','muted',`선택 구간: ${resource.start??0}–${resource.end??'끝'}초`));
      const actions=el('div','learning-resource-actions');if(resource.lectureId)actions.append(button('강의 열기',()=>onOpen(resource)));actions.append(link('원문 자료 ↗',resource.url));
      const status=field(`${resource.title} 학습 상태`,'status',{value:progressStatus(state.progress?.[resource.id]),options:PROGRESS});status.wrap.classList.add('learning-progress-field');
      status.input.addEventListener('change',async()=>{const previous=progressStatus(state.progress?.[resource.id]);status.input.disabled=true;try{await onProgress(resource.id,status.input.value);}catch{status.input.value=previous;}finally{status.input.disabled=false;}});
      body.append(actions);row.append(body,status.wrap);list.append(row);
    }
    section.append(list);
    if(phase.exercise)section.append(el('h4','','직접 해 보기'),el('p','learning-preserve',describe(phase.exercise)));
    if(phase.check)section.append(el('h4','','다음으로 가기 전 확인'),el('p','learning-preserve',describe(phase.check)));
    root.append(section);
  }
  const practice=el('details','learning-phase');practice.open=true;practice.append(el('summary','','첫 2주 · 2시간씩 10회'),el('p','muted','끝내지 못한 활동은 다음 회차로 넘깁니다. 3강 완강보다 조건문·반복문을 직접 쓰고 선택 규칙을 설명하는 것이 목표입니다.'));
  const sessions=roadmap.firstTwoWeeks?.sessions||roadmap.firstTwoWeeks||roadmap.sessions||FIRST_TWO_WEEKS;
  if(Array.isArray(sessions)){const list=el('ol','learning-sessions');for(const item of sessions){const row=el('li');row.append(el('strong','',item.title||item.activity||`회차 ${item.session||item.day||''}`),el('p','muted',item.output||item.deliverable||item.check||describe(item)));list.append(row);}practice.append(list);}
  else practice.append(el('p','muted','10회 상세 일정은 위 로드맵 원문에서 확인하세요.'));
  practice.append(el('h4','','선택 규칙만 바꾸면 평균은 어떻게 달라질까?'),el('p','learning-preserve','교육용 모의 측정값 [1,2,3,4,5,6,7,8,9,10]에서 5 이상만 보관하세요. 실행 전에 전체 평균과 선택 평균을 예상하고, 직접 계산한 결과와 비교하세요. 다음에는 +2 오프셋, 새 목록, 원 목록을 숨긴 조건을 비교합니다.'));
  const solution=el('details');solution.append(el('summary','','실습 후 확인하기'),el('p','learning-preserve','전체 평균 5.5, 선택 평균 7.5. 기록된 값이 정확해도 선택 규칙에 따라 결론이 달라집니다. 빠진 값과 개수를 모르면 원래 평균을 확정할 수 없습니다. +2는 측정값 자체를 바꾸는 오프셋으로, 선택 효과와 구분하세요.'));practice.append(solution);root.append(practice);
  const count=orderedResources(roadmap).length;root.append(el('p','muted',`${roadmap.phases?.length||0}단계 · ${count}개 자료. 외부 노트북과 파일은 직접 열어 실행합니다. Duvi는 코드를 실행하지 않습니다.`));
}
