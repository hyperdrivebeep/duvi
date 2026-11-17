import {PROGRESS,FIRST_TWO_WEEKS,progressStatus,orderedResources,nextResource,completionSummary,resourceCompleted,resourceProgressId} from './learning-model.mjs';
import {el,button,link,field,describe} from './learning-dom.mjs';
export function resourceAction(resource,label,onOpen,className=''){return resource.lectureId?button(label,()=>onOpen(resource),className):link(label,resource.url);}
export function renderRoadmap(root,{roadmap,state,onOpen,onProgress,onPrepare,onComplete}){
  root.replaceChildren();
  const updates=[],hero=el('section','learning-start');root.append(hero);
  updates.push(current=>{const next=nextResource(roadmap,current.progress),summary=completionSummary(roadmap,current.progress);hero.replaceChildren(el('p','learning-eyebrow',`전체 학습 · ${summary.done}/${summary.total}개 완료 · ${summary.percent}%`));
    hero.append(progressMeter(summary,'전체 학습 진행률'));
    if(next){const phase=roadmap.phases.find(p=>p.resources.includes(next));hero.append(el('p','muted',`${phase?.title||''} · 다음 할 일`),el('h3','',next.title),el('p','muted',summary.done===0&&next.id==='mit-1'?'오늘은 print(2 + 3)을 직접 실행해 보세요. 숫자를 바꾸기 전에 결과를 예상하고, 실제 결과와 비교하세요.':next.description||'자료를 공부한 뒤 완료 표시를 남기세요.'));hero.append(resourceAction(next,next.lectureId?'이 강의 이어서 공부하기':'읽기·실습 자료 열기 ↗',onOpen,'primary'));}
    else hero.append(el('h3','','계획한 자료를 모두 완료했습니다'),el('p','muted','내 기록과 복습에서 새 문제에 다시 적용해 보세요. 완료 표시는 숙달 판정이 아닙니다.'));
    hero.append(button('강의 폴더 준비',onPrepare));
  });
  const purpose=el('details','learning-phase');purpose.append(el('summary','','왜 이 순서로 배우나요? · Glorious Purpose'),el('p','learning-preserve','북극성은 인간의 삶을 바꿀 과학의 발전을 만드는 에이전트입니다. 지금 가진 데이터가 선택·측정·해석 과정에서 무엇을 놓치는지 묻고, 대안들을 구별할 증거를 만드는 연습부터 시작합니다. Python은 그 질문을 작은 실험으로 바꾸는 첫 도구입니다.'),el('p','learning-preserve','질문 → 내 설명 → 관측과 가정 구분 → 대안·판별 실험 → 결과에 따른 설명 수정. 처음에는 질문 한 줄이면 충분합니다.'),el('p','muted','13단계 순서: Python → 수학 → 수학 보강 → 머신러닝 검증 → 학습 실무 → 인과·불확실성 → 신경망·LLM → 신경망 부품 → Attention·Transformer → 불확실성·모델 비교 → 강화학습·탐색 → 역학·기호 회귀 → 네 조건 비교 실습.'));
  const progressHelp=el('p','muted','진행률은 완료 표시한 자료 수입니다. 영상·읽기·실습을 모두 포함하며, 시청 시간이나 이해도를 뜻하지 않습니다. 완료는 ');progressHelp.append(el('span','learning-keep-phrase','취소할 수 있습니다.'));
  root.append(purpose,progressHelp);
  const source=roadmap.source,sourceLine=el('div','learning-source');
  sourceLine.append(el('span','muted',`로드맵 버전 ${roadmap.version||'미기록'} · ${typeof source==='object'?(source.checkedAt||source.verifiedAt||source.commit||source.sha||'원문 기준'):source||'원문 확인 필요'}`));
  if(source?.url)sourceLine.append(link('로드맵 원문',source.url));root.append(sourceLine);
  for(const [index,phase] of (roadmap.phases||[]).entries()){
    const section=el('details','learning-phase');section.open=index===0;section.dataset.phaseId=phase.id;
    const heading=el('summary'),title=el('span','',`${phase.title} · ${describe(phase.weeks)}`),count=el('span','learning-phase-count');heading.append(title,count);section.append(heading);
    const meter=progressMeter(completionSummary(roadmap,state.progress,phase.resources),`${phase.title} 진행률`);section.append(meter);
    updates.push(current=>{const summary=completionSummary(roadmap,current.progress,phase.resources);count.textContent=`${summary.total&&summary.done===summary.total?'✓ ':''}${summary.done}/${summary.total}개 완료 · ${summary.percent}%`;meter.value=summary.done;});
    section.append(el('p','learning-goal',phase.goal));
    const list=el('ol','learning-resources');
    for(const resource of phase.resources||[]){
      const row=el('li','learning-resource'),body=el('div','learning-resource-body');body.append(el('h4','',resource.title));if(resource.description)body.append(el('p','muted',resource.description));
      if(resource.concepts?.length)body.append(el('p','muted learning-concepts',`신규 해설 영상 · 채우는 개념: ${resource.concepts.join(' · ')}`));
      if(resource.start!==undefined||resource.end!==undefined)body.append(el('p','muted',`선택 구간: ${resource.start??0}–${resource.end??'끝'}초`));
      const actions=el('div','learning-resource-actions');if(resource.lectureId)actions.append(button('강의 열기',()=>onOpen(resource)));actions.append(link('원문 자료 ↗',resource.url));
      const resourceId=resourceProgressId(roadmap,resource),controls=el('div','learning-resource-controls');
      const status=field('학습 활동','status',{value:progressStatus(state.progress?.[resourceId]),options:PROGRESS});status.input.setAttribute('aria-label',`${resource.title} 학습 활동`);status.wrap.classList.add('learning-progress-field');
      status.input.addEventListener('change',async()=>{const previous=progressStatus(state.progress?.[resourceId]);status.input.disabled=true;try{await onProgress(resourceId,status.input.value);}catch{status.input.value=previous;}finally{status.input.disabled=false;}});
      const complete=button('',async()=>{complete.disabled=true;try{await onComplete(resource);}catch{}finally{complete.disabled=false;}},'learning-complete');complete.setAttribute('aria-label',`${resource.title} 완료 표시`);
      updates.push(current=>{const done=resourceCompleted(roadmap,current.progress,resource);complete.textContent=done?'✓ 완료 · 취소':'완료로 표시';complete.setAttribute('aria-pressed',String(done));status.input.value=progressStatus(current.progress?.[resourceId]);});
      controls.append(complete,status.wrap);body.append(actions);row.append(body,controls);list.append(row);
    }
    section.append(list);
    if(phase.exercise)section.append(el('h4','','직접 해 보기'),el('p','learning-preserve',describe(phase.exercise)));
    if(phase.check)section.append(el('h4','','다음으로 가기 전 확인'),el('p','learning-preserve',describe(phase.check)));
    root.append(section);
  }
  const practice=el('details','learning-phase');practice.append(el('summary','','첫 2주 · 2시간씩 10회 · 직접 해 볼 일'),el('p','muted','끝내지 못한 활동은 다음 회차로 넘깁니다. 3강 완강보다 조건문·반복문을 직접 쓰고 선택 규칙을 설명하는 것이 목표입니다.'));
  const sessions=roadmap.firstTwoWeeks?.sessions||roadmap.firstTwoWeeks||roadmap.sessions||FIRST_TWO_WEEKS;
  if(Array.isArray(sessions)){const list=el('ol','learning-sessions');for(const item of sessions){const row=el('li');row.append(el('strong','',item.title||item.activity||`회차 ${item.session||item.day||''}`),el('p','muted',item.output||item.deliverable||item.check||describe(item)));list.append(row);}practice.append(list);}
  else practice.append(el('p','muted','10회 상세 일정은 위 로드맵 원문에서 확인하세요.'));
  practice.append(el('h4','','선택 규칙만 바꾸면 평균은 어떻게 달라질까?'),el('p','learning-preserve','교육용 모의 측정값 [1,2,3,4,5,6,7,8,9,10]에서 5 이상만 보관하세요. 실행 전에 전체 평균과 선택 평균을 예상하고, 직접 계산한 결과와 비교하세요. 다음에는 +2 오프셋, 새 목록, 원 목록을 숨긴 조건을 비교합니다.'));
  const solution=el('details');solution.append(el('summary','','실습 후 확인하기'),el('p','learning-preserve','전체 평균 5.5, 선택 평균 7.5. 기록된 값이 정확해도 선택 규칙에 따라 결론이 달라집니다. 빠진 값과 개수를 모르면 원래 평균을 확정할 수 없습니다. +2는 측정값 자체를 바꾸는 오프셋으로, 선택 효과와 구분하세요.'));practice.append(solution);sourceLine.after(practice);
  const count=orderedResources(roadmap).length;root.append(el('p','muted',`${roadmap.phases?.length||0}단계 · ${count}개 자료. 외부 노트북과 파일은 직접 열어 실행합니다. Duvi는 코드를 실행하지 않습니다.`));
  const update=current=>{state=current;for(const apply of updates)apply(current);};update(state);return update;
}
export function progressMeter(summary,label){const meter=el('progress','learning-meter');meter.max=summary.total||1;meter.value=summary.done;meter.setAttribute('aria-label',label);return meter;}
