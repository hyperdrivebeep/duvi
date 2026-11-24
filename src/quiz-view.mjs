import {el,button} from './learning-dom.mjs';
import {formatTime} from './learning-model.mjs';
import {EVIDENCE_LABEL,TYPE_LABEL,CONFIDENCE_LABEL,RESULT_LABEL,evidenceText,segmentLabel,sourceLabel,sourceTarget,latestAttempts,itemResult,segmentProgress} from './quiz-model.mjs';

// 확인 문제: one question at a time for a lecture segment. Predict first, pick a confidence, then check against the
// stored answer and its evidence status. AI-only answers are always labelled unverified; nothing here runs code.
const NOTE='문제는 대본과 내 저장소·위키에서 만들었습니다. 미검증 정답은 그렇게 표시합니다.';
const CONNECT='확인 문제를 만들려면 ChatGPT 연결이 필요합니다.';
export function sourceChip(api,label,target){
  if(!target)return el('span','quiz-source',label);
  const link=el('a','quiz-link',label);link.href='#';link.addEventListener('click',event=>{event.preventDefault();api.open(target);});return link;
}
function radios(name,options,selected,onChange){
  const group=el('div','quiz-options');group.setAttribute('role','radiogroup');
  for(const [value,text] of options){
    const label=el('label',value===selected?'quiz-option is-selected':'quiz-option'),input=el('input');
    input.type='radio';input.name=name;input.value=value;input.checked=value===selected;input.addEventListener('change',()=>onChange(value));
    label.append(input,el('span','',text));group.append(label);
  }
  return group;
}
function textInput(label,value,onInput,{rows=0,className='quiz-field'}={}){
  const wrap=el('label',className),input=el(rows?'textarea':'input');if(rows)input.rows=rows;else input.type='text';
  input.value=value;input.addEventListener('input',()=>onInput(input.value));wrap.append(el('span','',label),input);return {wrap,input};
}
const errorText=error=>error?.message||'요청에 실패했습니다. 입력은 그대로 있습니다.';
function answerLabel(item,grading=false){
  if(item.evidence==='executed')return EVIDENCE_LABEL.executed;
  if(item.evidence==='ai_unverified')return grading?'AI 제안 답 (정답 미검증 · 채점은 내가)':'AI 제안 답 (정답 미검증)';
  return `답 (${EVIDENCE_LABEL[item.evidence]})`;
}
function executionNotes(item){
  const run=item.execution;if(!run)return [];
  if(run.status!=='executed')return [el('p','quiz-muted','✕ 문제 코드를 실행하지 못해 정답이 확인되지 않았습니다: '+(run.reason||''))];
  const notes=[];
  if(run.mismatch)notes.push(el('p','quiz-muted',`AI가 예상한 답(${run.aiAnswer.replace(/\n/g,' / ')})과 실제 출력이 달라 실제 출력을 정답으로 썼습니다.`));
  if(run.optionsDropped)notes.push(el('p','quiz-muted','실제 출력과 같은 보기가 없어 서술형으로 바꿨습니다.'));
  if(run.truncated)notes.push(el('p','quiz-muted','출력이 길어 앞부분만 저장했습니다.'));
  return notes;
}

/** lecturePicker: an optional node (the shell's 강의 select) shown in the title row instead of the lecture title. */
export function renderQuizScreen(root,api,{lectureId,segmentId,lecturePicker}={}){
  const view={lectureId:String(lectureId),segmentId:segmentId||null,status:null,attempts:[],index:0,phase:'answer',draft:{prediction:'',confidence:''},attempt:null,explanation:'',notice:'',loadError:'',
    gen:{state:'idle',concepts:'',excerpts:[],excerpt:{repo:'',path:'',startLine:'1',endLine:'40'},preview:null,models:[],model:'',error:''}};
  const page=el('div','quiz-page'),bar=el('div','quiz-bar'),screen=el('section','quiz-screen');screen.append(page,bar);root.replaceChildren(screen);
  const segment=()=>view.status?.segments.find(row=>row.id===view.segmentId)||null;
  const items=()=>(segment()?.set?.items||[]).filter(item=>item.evidence!=='retired');
  const resetQuestion=()=>{view.phase='answer';view.draft={prediction:'',confidence:''};view.attempt=null;view.explanation='';view.notice='';};
  async function load(){
    try{
      const [status,learning]=await Promise.all([api.quiz(view.lectureId),api.learning()]);view.status=status;view.attempts=learning.attempts||[];view.loadError='';
      if(!status.segments.some(row=>row.id===view.segmentId))view.segmentId=(status.segments.find(row=>row.set)||status.segments[0])?.id||null;
      view.gen.state=status.generating?'generating':view.gen.state==='generating'?'idle':view.gen.state;
      view.index=Math.min(view.index,Math.max(0,items().length-1));
    }catch(error){view.loadError=errorText(error);}
    render();
  }
  function selectSegment(id){view.segmentId=id;view.index=0;view.regenerate=false;resetQuestion();view.gen={...view.gen,state:'idle',preview:null,error:''};render();}
  function header(){
    const head=el('div','quiz-head'),title=el('h1','','확인 문제');
    if(lecturePicker){head.append(title,lecturePicker,el('span','quiz-muted quiz-cut',segment()?`${segmentLabel(segment())} 구간`:''));return head;}
    const place=segment()?`${view.status.title} · ${segmentLabel(segment())} 구간`:view.status?.title||'';
    head.append(title,el('span','quiz-muted quiz-cut',place));return head;
  }
  function picker(){
    const wrap=el('label','quiz-picker'),select=el('select');select.name='segment';
    for(const row of view.status.segments){
      const option=el('option','',`${segmentLabel(row)} · ${row.set?`문제 ${segmentProgress(row,view.attempts).total}${row.set.stale?' · 예전 대본 기준':''}`:'문제 없음'}`);option.value=row.id;select.append(option);
    }
    select.value=view.segmentId||'';select.addEventListener('change',()=>selectSegment(select.value));wrap.append(el('span','','구간'),select);return wrap;
  }
  async function makePreview(){
    const gen=view.gen;gen.error='';gen.state='previewing';render();
    try{
      gen.preview=await api.preview({lectureId:view.lectureId,segmentId:view.segmentId,excerpts:gen.excerpts.map(row=>({...row})),concepts:gen.concepts.split(',').map(row=>row.trim()).filter(Boolean)});
      if(!gen.models.length){try{gen.models=await api.models();gen.model=gen.models[0]?.id||'';}catch(error){gen.error=errorText(error);}}
      gen.state='preview';
    }catch(error){gen.state='failed';gen.error=errorText(error);}
    render();
  }
  async function generate(){
    const gen=view.gen;gen.state='generating';gen.error='';render();
    try{view.status=await api.generate({token:gen.preview.token,model:gen.model});gen.state='idle';gen.preview=null;view.regenerate=false;view.index=0;resetQuestion();}
    catch(error){if(error.code==='cancelled'){gen.state='preview';view.notice=error.message;}else{gen.state='failed';gen.error=errorText(error);}}
    render();
  }
  async function cancel(){try{await api.cancel(view.lectureId);}catch(error){view.gen.error=errorText(error);render();}}
  function generator(){
    const box=el('div','quiz-generate'),gen=view.gen,status=view.status,stale=segment()?.set?.stale;
    if(!status.connected){box.append(el('p','quiz-state','○ '+CONNECT),sourceChip(api,'설정에서 ChatGPT 연결하기',{kind:'settings'}));return box;}
    if(gen.state==='generating'){
      box.append(el('p','quiz-state','◌ 확인 문제를 만드는 중입니다. 내 ChatGPT 연결로 보냈습니다.'),button('취소',cancel,'quiz-button'));return box;
    }
    if(gen.state==='failed'){
      const p=el('p','quiz-state','✕ 만들지 못했습니다: '+gen.error);p.setAttribute('role','alert');box.append(p);
      const actions=el('div','quiz-actions');if(gen.preview)actions.append(button('다시 시도',generate,'quiz-button primary'));actions.append(button('보낼 자료 다시 확인',makePreview,'quiz-button'));box.append(actions);
    }else box.append(el('p','quiz-state',stale?'△ 이 구간의 자막이 바뀌었습니다. 문제를 다시 만들 수 있습니다.':'○ 이 구간에는 아직 확인 문제가 없습니다.'));
    box.append(el('h2','','보낼 자료'));
    box.append(textInput('개념 이름 (쉼표로 구분, 선택)',gen.concepts,value=>{gen.concepts=value;}).wrap);
    const excerptList=el('ul','quiz-excerpts');
    for(const [i,row] of gen.excerpts.entries()){const item=el('li','',`${row.repo}/${row.path}:${row.startLine}-${row.endLine} `);item.append(button('빼기',()=>{gen.excerpts.splice(i,1);render();},'quiz-text-button'));excerptList.append(item);}
    if(status.repos.length){
      const row=el('div','quiz-excerpt-row'),repo=el('select');repo.name='repo';for(const label of status.repos){const option=el('option','',label);option.value=label;repo.append(option);}
      gen.excerpt.repo||=status.repos[0];repo.value=gen.excerpt.repo;repo.addEventListener('change',()=>{gen.excerpt.repo=repo.value;});
      const file=textInput('파일 경로',gen.excerpt.path,value=>{gen.excerpt.path=value;}),from=textInput('시작 줄',gen.excerpt.startLine,value=>{gen.excerpt.startLine=value;},{className:'quiz-field quiz-line'}),to=textInput('끝 줄',gen.excerpt.endLine,value=>{gen.excerpt.endLine=value;},{className:'quiz-field quiz-line'});
      row.append(repo,file.wrap,from.wrap,to.wrap,button('발췌 추가',()=>{const value={repo:gen.excerpt.repo,path:gen.excerpt.path.trim(),startLine:Number(gen.excerpt.startLine),endLine:Number(gen.excerpt.endLine)};if(value.path&&value.startLine>0&&value.endLine>=value.startLine){gen.excerpts.push(value);render();}},'quiz-button'));
      box.append(el('p','quiz-muted','저장소·위키 발췌 (읽기 전용, 최대 120줄)'),excerptList,row);
    }else box.append(el('p','quiz-muted','저장소 발췌를 쓰려면 읽기 전용 저장소를 먼저 설정하세요.'),sourceChip(api,'저장소 설정',{kind:'sources'}));
    if(gen.preview&&gen.state!=='failed'){
      const p=gen.preview.payload,summary=el('ul','quiz-preview');
      summary.append(el('li','',`대본 ${p.transcript.length}문장 (${p.segment.start}~${p.segment.end}, 영어·한국어)`));
      for(const row of p.excerpts)summary.append(el('li','',`${row.kind==='wiki'?'위키':'저장소'} ${row.repo}/${row.ref}`));
      summary.append(el('li','',p.concepts.length?`개념: ${p.concepts.join(', ')}`:'개념: 없음'),el('li','',`모두 ${gen.preview.chars.toLocaleString('ko-KR')}자`));
      const raw=el('details','quiz-raw');raw.append(el('summary','','보낼 내용 그대로 보기'),el('pre','',JSON.stringify(p,null,2)));
      const model=el('select');model.name='model';for(const row of gen.models){const option=el('option','',row.name||row.id);option.value=row.id;model.append(option);}model.value=gen.model;model.addEventListener('change',()=>{gen.model=model.value;});
      const send=button('보내고 만들기',generate,'quiz-button primary');send.disabled=!gen.model;
      box.append(el('p','quiz-muted','아래 내용만 내 ChatGPT 연결로 보냅니다. 받은 문제의 인용은 대본·파일과 글자 그대로 대조합니다.'),summary,raw,model,send);
      if(gen.error)box.append(el('p','quiz-state','✕ '+gen.error));
    }else if(gen.state!=='failed')box.append(button(gen.state==='previewing'?'확인하는 중…':'보낼 자료 확인',makePreview,'quiz-button primary'));
    if(view.notice)box.append(el('p','quiz-muted',view.notice));
    return box;
  }
  async function check(item){
    if(!item.options&&view.phase==='answer'){view.phase='grade';render();return;}
    await save(item,item.options?undefined:view.draft.result);
  }
  async function save(item,result){
    view.notice='';
    try{
      const saved=await api.attempt({lectureId:view.lectureId,segmentId:view.segmentId,itemId:item.id,prediction:view.draft.prediction,confidence:view.draft.confidence,...(result&&{result})});
      view.attempt=saved.attempt;view.attempts=[...view.attempts,saved.attempt];view.phase='result';
    }catch(error){view.notice=errorText(error);}
    render();
  }
  async function saveExplanation(){
    try{const saved=await api.attempt({id:view.attempt.id,explanation:view.explanation});view.attempt=saved.attempt;view.attempts=view.attempts.map(row=>row.id===saved.attempt.id?saved.attempt:row);view.notice='내 설명을 저장했습니다.';}
    catch(error){view.notice=errorText(error);}
    render();
  }
  async function itemAction(item,action){
    try{view.status=await api.item({lectureId:view.lectureId,segmentId:view.segmentId,itemId:item.id,action,...(action==='retire'&&{reason:'학습자가 이상한 문제로 신고'})});if(action==='retire'){view.index=Math.min(view.index,Math.max(0,items().length-1));resetQuestion();}}
    catch(error){view.notice=errorText(error);}
    render();
  }
  function question(item,list){
    const card=el('div','quiz-question'),meta=el('div','quiz-meta');
    meta.append(el('span','',`확인 문제 ${list.indexOf(item)+1}/${list.length} · ${TYPE_LABEL[item.type]}`),el('span','','출처: '),sourceChip(api,sourceLabel(item.source),sourceTarget(item.source,view.lectureId)));
    card.append(meta,el('p','quiz-evidence',evidenceText(item.evidence)),el('h2','quiz-prompt',item.prompt));
    // The question's fixed code is shown, never run here: its output was recorded once when the set was generated.
    if(item.code)card.append(el('pre','quiz-code',item.code));
    const answering=view.phase==='answer';
    if(item.options)card.append(radios('prediction',item.options.map(row=>[row,row]),view.draft.prediction,value=>{if(answering){view.draft.prediction=value;render();}}));
    else{const field=textInput('내 예측·답',view.draft.prediction,value=>{view.draft.prediction=value;syncBar();},{rows:3});field.input.disabled=!answering;card.append(field.wrap);}
    const confidence=el('div','quiz-confidence');confidence.append(el('span','quiz-muted','확신'),radios('confidence',Object.entries(CONFIDENCE_LABEL),view.draft.confidence,value=>{if(answering){view.draft.confidence=value;render();}}));card.append(confidence);
    if(view.phase==='grade'){
      card.append(el('p','quiz-label',answerLabel(item,true)),el('p','quiz-answer',item.answer),...executionNotes(item));
      if(item.quote)card.append(el('blockquote','quiz-quote',item.quote));
      const grade=el('div','quiz-actions');grade.append(el('span','quiz-muted','내 답은'),button('맞았음',()=>save(item,'right'),'quiz-button'),button('틀렸음',()=>save(item,'wrong'),'quiz-button'));card.append(grade);
    }
    if(view.phase==='result'&&view.attempt){
      const a=view.attempt,result=el('div','quiz-result');
      result.append(el('p','quiz-outcome',`${a.result==='right'?'✓':'✕'} ${RESULT_LABEL[a.result]}${a.grading==='self'?' (내가 채점)':''} · 확신 ${CONFIDENCE_LABEL[a.confidence]}`));
      result.append(el('p','quiz-label',answerLabel(item)),el('p','quiz-answer',item.answer),...executionNotes(item));
      if(item.quote){result.append(el('blockquote','quiz-quote',item.quote));}
      result.append(el('p','quiz-muted',`다음 복습: ${new Date(a.reviewDueAt).toLocaleDateString('ko-KR')}`));
      const why=textInput(a.result==='wrong'?'왜 달랐나 · 내 말로':'내 말로 설명',view.explanation||a.explanation,value=>{view.explanation=value;},{rows:3});
      const actions=el('div','quiz-actions');actions.append(button('설명 저장',saveExplanation,'quiz-button'));
      if(item.evidence==='ai_unverified')actions.append(button('내가 확인 (답이 맞다)',()=>itemAction(item,'confirm'),'quiz-button'));
      actions.append(button('이상한 문제 신고',()=>itemAction(item,'retire'),'quiz-text-button'));
      result.append(why.wrap,actions);card.append(result);
    }
    if(view.notice&&view.phase!=='idle')card.append(el('p','quiz-muted',view.notice));
    return card;
  }
  function table(set){
    const wrap=el('div','quiz-list'),tableNode=el('table'),head=el('tr'),latest=latestAttempts(view.attempts),active=items();
    for(const text of ['문제','출처','정답 근거','내 결과',''])head.append(el('th','',text));tableNode.append(head);
    for(const item of set.items){
      const row=el('tr',active[view.index]===item?'is-current':''),first=el('td'),retired=item.evidence==='retired';
      const pick=button(`${active.includes(item)?active.indexOf(item)+1+'. ':''}${item.prompt}`,()=>{view.index=active.indexOf(item);resetQuestion();render();},'quiz-row-button');pick.disabled=retired;if(active[view.index]===item)pick.setAttribute('aria-current','true');first.append(pick);
      const source=el('td');source.append(sourceChip(api,sourceLabel(item.source),sourceTarget(item.source,view.lectureId)));
      const action=el('td');if(retired)action.append(button('되살리기',()=>itemAction(item,'restore'),'quiz-text-button'));
      row.append(first,source,el('td','',evidenceText(item.evidence)),el('td','',itemResult(item,latest)),action);tableNode.append(row);
    }
    wrap.append(tableNode);return wrap;
  }
  let primary=null;
  function syncBar(){if(primary&&view.phase==='answer')primary.disabled=!view.draft.prediction.trim()||!view.draft.confidence;}
  function render(){
    page.replaceChildren();bar.replaceChildren();primary=null;
    const bare=()=>{const head=el('div','quiz-head');head.append(el('h1','','확인 문제'));if(lecturePicker)head.append(lecturePicker);return head;};
    if(view.loadError){page.append(bare(),el('p','quiz-state','✕ '+view.loadError),button('다시 불러오기',load,'quiz-button'));return;}
    if(!view.status){page.append(bare(),el('p','quiz-muted','불러오는 중…'));return;}
    page.append(header());
    if(!view.status.segments.length){page.append(el('p','quiz-state','○ 이 강의에는 아직 영어 자막이 없습니다. 자막을 준비하면 10분 구간마다 확인 문제를 만들 수 있습니다.'));return;}
    page.append(picker());
    const current=segment(),set=current?.set,list=items();
    if(view.status.mock)page.append(el('p','quiz-muted','QA 전용 모의 연결입니다. 실제 ChatGPT 문제 품질이 아닙니다.'));
    if(set?.stale){const stale=el('div','quiz-stale');stale.append(el('p','quiz-state','△ 이 문제는 예전 대본 기준입니다. 자막이 바뀌었습니다.'),button('다시 만들기',()=>{view.gen.state='idle';view.gen.preview=null;view.regenerate=true;render();},'quiz-button'));page.append(stale);}
    if(!set||view.regenerate||['generating','failed','preview','previewing'].includes(view.gen.state))page.append(generator());
    if(set&&list.length&&!['generating'].includes(view.gen.state)){
      const item=list[Math.min(view.index,list.length-1)];page.append(question(item,list),table(set));
      bar.append(el('span','quiz-muted quiz-cut',NOTE));
      if(view.phase==='result'){primary=button(view.index+1<list.length?'다음 문제':'처음 문제로',()=>{view.index=(view.index+1)%list.length;resetQuestion();render();},'quiz-button primary');bar.append(primary);}
      else if(view.phase==='answer'){
        bar.append(button('건너뛰기',()=>{view.index=(view.index+1)%list.length;resetQuestion();render();},'quiz-button'));
        primary=button('확인',()=>check(item),'quiz-button primary');bar.append(primary);syncBar();
      }
    }else{
      if(set&&!list.length)page.append(el('p','quiz-state','○ 이 구간의 문제를 모두 신고해 뺐습니다.'),table(set));
      bar.append(el('span','quiz-muted quiz-cut',NOTE));
    }
  }
  render();
  return {ready:load(),view,reload:load};
}

/** The lecture panel's 확인 문제 tab: one checkpoint per ten-minute segment, with 안 풂/풂 status. */
export function renderLectureQuizTab(root,api,{lectureId}={}){
  const box=el('div','quiz-tab');root.replaceChildren(box);
  async function load(){
    box.replaceChildren(el('p','quiz-muted','불러오는 중…'));
    let status,learning;
    try{[status,learning]=await Promise.all([api.quiz(String(lectureId)),api.learning()]);}
    catch(error){box.replaceChildren(el('p','quiz-state','✕ '+errorText(error)),button('다시 불러오기',load,'quiz-button'));return;}
    box.replaceChildren(el('p','quiz-muted','구간 끝 체크포인트 · 예측하고 확인합니다. 점수가 아닙니다.'));
    if(!status.segments.length){box.append(el('p','quiz-state','○ 자막이 준비되면 10분 구간마다 확인 문제를 만들 수 있습니다.'));return;}
    const list=el('ul','quiz-checkpoints');
    for(const segment of status.segments){
      const row=el('li','quiz-checkpoint'),progress=segmentProgress(segment,learning.attempts||[]);
      const time=sourceChip(api,formatTime(segment.end),{kind:'lecture',lectureId:String(lectureId),seconds:segment.end});
      const label=!segment.set?'문제 없음':`문제 ${progress.total} · ${progress.solved?`풂 ${progress.solved}/${progress.total}`:'안 풂'}${segment.set.stale?' · △ 예전 대본 기준':''}`;
      row.append(el('span','quiz-glyph',segment.set?(progress.total&&progress.solved===progress.total?'◆':'◇'):'·'),time,el('span','quiz-checkpoint-text',`${segmentLabel(segment)} 구간 끝 · ${label}`),
        button(segment.set?'풀기':'만들기',()=>api.open({kind:'quiz',lectureId:String(lectureId),segmentId:segment.id}),'quiz-text-button'));
      list.append(row);
    }
    box.append(list);
  }
  return {ready:load(),reload:load};
}
