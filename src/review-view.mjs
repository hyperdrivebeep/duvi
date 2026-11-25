import {el,button} from './learning-dom.mjs';
import {completionSummary,nextResource,isOpenQuestion} from './learning-model.mjs';
import {NO_EVIDENCE,evidenceSummary,evidenceLog,shortDate} from './quiz-model.mjs';
import {sourceChip} from './quiz-view.mjs';

// 돌아보기: what I marked myself (left) kept apart from what my records show (right), then one time-ordered evidence log.
// A missing kind of evidence reads '아직 증거 없음', never a 0 that looks like progress.
export const SELF_MARK_NOTE='자기 표시입니다. 이해나 숙달을 뜻하지 않습니다.';
const GROUPS=[['all','전체'],['records','질문·설명'],['quiz','확인 문제'],['repo','커밋·테스트']];
function linkButton(text,action){return button(text,action,'review-link');}

export function renderReviewScreen(root,api){
  const view={state:null,roadmap:null,evidence:null,evidenceError:'',loadError:'',filter:'all'};
  const page=el('div','review-page'),bar=el('div','review-bar'),screen=el('section','review-screen');screen.append(page,bar);root.replaceChildren(screen);
  let logSection=null;
  async function load(){
    try{
      const [state,roadmap]=await Promise.all([api.learning(),api.roadmap()]);Object.assign(view,{state,roadmap,loadError:''});
      try{view.evidence=await api.evidence();view.evidenceError='';}catch(error){view.evidence=null;view.evidenceError=error.message||'저장소 기록을 읽지 못했습니다.';}
    }catch(error){view.loadError=error.message||'기록을 불러오지 못했습니다.';}
    render();
  }
  function showLog(group){view.filter=group;render();logSection?.scrollIntoView?.({block:'start'});}
  function selfMark(){
    const box=el('div','review-self'),summary=completionSummary(view.roadmap,view.state.progress);
    box.append(el('p','review-muted','내가 완료로 표시한 것'));
    box.append(el('p','review-big',summary.done?`${summary.done} / ${summary.total}`:'아직 완료 표시 없음'));
    if(!summary.done)box.append(el('p','review-muted',`로드맵 자료 ${summary.total}개`));
    box.append(el('p','review-muted',SELF_MARK_NOTE));
    return box;
  }
  function counts(){
    const s=evidenceSummary(view.state,view.evidence),box=el('div','review-counts'),table=el('table');
    box.append(el('p','review-muted','기록이 보여 주는 것'));
    const row=(label,value,action)=>{const tr=el('tr');const cell=el('td');if(action)cell.append(action);tr.append(el('th','',label),el('td',value===NO_EVIDENCE?'review-muted':'',value),cell);table.append(tr);};
    row('질문 기록',s.records?`${s.records.total}개 (열린 질문 ${s.records.open}, 내 설명 ${s.records.explained})`:NO_EVIDENCE,linkButton('기록 보기',()=>api.open({kind:'records'})));
    const e=s.attempts?.byEvidence;
    row('확인 문제',s.attempts?`${s.attempts.total}회 풂 (실행 근거 ${e.executed}, 원문 인용 확인 ${e.source_quoted}, 내가 확인 ${e.learner_confirmed}, AI 제안 · 미검증 ${e.ai_unverified}${e.retired?`, 신고 ${e.retired}`:''})`:NO_EVIDENCE,linkButton('푼 기록 보기',()=>showLog('quiz')));
    if(view.evidenceError)row('커밋·테스트','✕ '+view.evidenceError,linkButton('저장소 설정',()=>api.open({kind:'sources'})));
    else if(s.repos==='unconfigured')row('커밋·테스트',view.evidence?.message||'설정된 저장소 없음',linkButton('저장소 설정',()=>api.open({kind:'sources'})));
    else row('커밋·테스트',s.repos?`커밋 ${s.repos.commits}개, 테스트 결과 ${s.repos.testFiles}개 (통과 ${s.repos.passed}, 실패 ${s.repos.failed})`:NO_EVIDENCE,linkButton('목록 보기',()=>showLog('repo')));
    row('복습',s.dueToday?`오늘 ${s.dueToday}개`:'오늘 예정된 복습 없음',linkButton('복습하기',()=>api.open({kind:'review'})));
    box.append(table);return box;
  }
  function log(){
    const section=el('div','review-log'),rows=evidenceLog(view.state,view.evidence,{lectureName:api.lectureName}).filter(row=>view.filter==='all'||row.group===view.filter);
    const head=el('div','review-log-head');head.append(el('h2','','근거 기록 (최근 순)'));
    const filters=el('div','review-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','근거 종류');
    for(const [id,label] of GROUPS){const tab=button(label,()=>{view.filter=id;render();},'review-filter');tab.setAttribute('aria-pressed',String(view.filter===id));filters.append(tab);}
    head.append(filters);section.append(head);
    if(!rows.length)section.append(el('p','review-muted',NO_EVIDENCE));
    else{
      const table=el('table'),top=el('tr');for(const text of ['날짜','종류','내용','출처'])top.append(el('th','',text));table.append(top);
      for(const row of rows){const tr=el('tr'),source=el('td');if(row.source)source.append(sourceChip(api,row.source.label,row.source.target));tr.append(el('td','review-num',shortDate(row.at)),el('td','',row.kind),el('td','',row.text),source);table.append(tr);}
      section.append(table);
    }
    section.append(el('p','review-muted','커밋과 테스트 결과는 이 PC의 저장소 기록을 읽기만 합니다. Duvi는 코드를 실행하거나 올리지 않습니다.'));
    return section;
  }
  function more(){
    const nav=el('div','review-more');nav.append(el('span','review-muted','다른 곳:'));
    for(const [label,kind] of [['학습 로드맵','roadmap'],['내 기록','records'],['복습','review'],['백업·복원','backup'],['현재 시점 기록 남기기','note']])nav.append(linkButton(label,()=>api.open({kind})));
    return nav;
  }
  function nextStep(){
    const next=nextResource(view.roadmap,view.state.progress),open=(view.state.records||[]).filter(isOpenQuestion).length,text=el('div','review-next');
    text.append(el('p','review-muted','다음 할 일'));
    const line=el('p','review-cut');line.append(el('strong','',next?`${next.title} 이어 보기`:'로드맵 자료를 모두 완료로 표시했습니다 · 복습하기'));if(open)line.append(el('span','review-muted',` · 열린 질문 ${open}개`));text.append(line);
    bar.append(text,button(next?'이어 보기':'복습하기',()=>api.open(next?{kind:'resource',resource:next}:{kind:'review'}),'review-primary'));
  }
  function render(){
    page.replaceChildren();bar.replaceChildren();
    page.append(el('h1','','돌아보기'));
    if(view.loadError){page.append(el('p','review-state','✕ '+view.loadError),button('다시 불러오기',load,'review-link'));return;}
    if(!view.state){page.append(el('p','review-muted','불러오는 중…'));return;}
    const top=el('div','review-top');top.append(selfMark(),counts());logSection=log();page.append(top,logSection,more());nextStep();
  }
  render();
  return {ready:load(),view,reload:load};
}
