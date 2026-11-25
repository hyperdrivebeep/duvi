import {RECORD_FIELDS,HELP,validateRecord,recordMarkdown,formatTime,apiErrorMessage,QUESTION_AUTOPAUSE_KEY,questionAutoPause} from './learning-model.mjs';
import {el,button,field,describe,download,busy} from './learning-dom.mjs';
import {prepareTutorContext,tutorRequest} from './learning-tutor-context.mjs';
const labels={title:'제목 (선택)',question:'막힌 점 · 질문 한 줄',explanation:'내 설명 (선택)',observation:'관측 · 원자료 · 단위 · 선택/결측 규칙',assumptions:'가정 · 변수/대리 지표 · 내 해석',alternative:'대안 · 측정 오류 · 구별할 조건',prediction:'실행 전 예측 · 판별 조건 · 비용/실패 기준',result:'실제 결과 · 코드/노트북 경로 · seed · 한계',revisionNote:'바뀐 생각 · 바꾼 증거 · 아직 보류할 점'};
export class LearningEditor{
  constructor(root,{capture,onSave,onJump,onTutor,onConflict,lectureName=id=>`강의 ${id}`}){
    Object.assign(this,{root,capture,onSave,onJump,onTutor,onConflict,lectureName});this.inputs={};this.record=null;this.savedRecord=null;this.baseRevision=undefined;this.key='';
    try{this.drafts=JSON.parse(localStorage.getItem('duvi-learning-drafts-v1')||'{}');}catch{this.drafts={};}
    this.build();
  }
  build(){
    const root=this.root;root.classList.add('learning-editor');
    const top=el('div','learning-actions');this.newButton=button('현재 시점에서 새 기록',()=>this.newRecord());top.append(this.newButton);
    const pause=el('label','learning-confirm');this.autoPause=el('input');this.autoPause.type='checkbox';this.autoPause.checked=questionAutoPause(localStorage);this.autoPause.addEventListener('change',()=>{try{localStorage.setItem(QUESTION_AUTOPAUSE_KEY,this.autoPause.checked?'on':'off');}catch{}});pause.append(this.autoPause,document.createTextNode('질문을 열면 영상 멈추기'));top.append(pause);root.append(top);
    this.anchorSummary=el('p','muted');this.anchorText=el('blockquote','learning-anchor');this.notice=el('p','notice');this.notice.setAttribute('role','status');
    this.aiAnswer=el('details','learning-ai-saved');this.aiAnswerText=el('p','learning-preserve');this.aiAnswer.append(el('summary','','AI 제안 · 질문 탭에서 받은 답'),this.aiAnswerText);
    this.form=el('form');this.fields=el('fieldset','learning-fields');this.form.append(this.fields);root.append(this.anchorSummary,this.anchorText,this.aiAnswer,this.form,this.notice);
    for(const name of ['title','question','explanation']){const entry=field(labels[name],name,{rows:name==='title'?1:3});this.inputs[name]=entry.input;this.fields.append(entry.wrap);}
    const optional=el('details','learning-evidence');optional.append(el('summary','','이 설명을 시험하기 · 근거·가정 보기'));
    optional.append(el('p','muted','선택 입력입니다. 원문 주장, 내 추론, 실제 관측을 구분하세요. 측정하지 않은 값은 미확인으로 남깁니다.'));
    for(const name of RECORD_FIELDS.slice(3)){const entry=field(labels[name],name);this.inputs[name]=entry.input;optional.append(entry.wrap);}this.fields.append(optional);
    const help=field('이번 설명의 AI 도움 정도','help',{options:HELP});this.inputs.help=help.input;this.fields.append(help.wrap);
    const review=field('다음 회상 복습','reviewDays',{value:'1',options:{keep:'현재 예약 유지','1':'지금부터 1일 뒤','3':'지금부터 3일 뒤','7':'지금부터 7일 뒤','none':'예약하지 않음'}});this.inputs.reviewDays=review.input;this.fields.append(review.wrap);
    const actions=el('div','learning-actions');this.saveButton=button('질문·설명 저장',null,'primary');this.saveButton.type='submit';actions.append(this.saveButton,button('저장한 원문으로 이동',()=>this.jump()));this.fields.append(actions);
    this.form.addEventListener('input',()=>this.stash());this.form.addEventListener('change',()=>this.stash());this.form.addEventListener('submit',event=>{event.preventDefault();void this.save();});
    this.conflictButton=button('최신 저장본 확인 · 초안 유지',async()=>{try{const saved=await this.onConflict();if(!saved)throw new Error('원래 기록이 없습니다. 백업 또는 새 기록으로 입력을 보관하세요.');this.savedRecord=structuredClone(saved);this.showHistory(saved);this.notice.textContent='아래 최신 설명과 내 초안을 비교하세요. 초안을 반영하려면 확인 후 저장 준비를 누르세요.';this.conflictButton.hidden=true;this.reconcileButton.hidden=false;}catch(error){this.notice.textContent=error.message;}});this.conflictButton.hidden=true;root.append(this.conflictButton);
    this.reconcileButton=button('최신 설명을 확인했으며 이 초안으로 저장 준비',()=>{this.baseRevision=this.savedRecord.revision;this.record.revision=this.baseRevision;this.draftConflict=false;this.reconcileButton.hidden=true;this.stash();this.notice.textContent='초안 내용을 다시 확인하고 저장하세요. 저장 전까지 서버 기록은 바뀌지 않습니다.';});this.reconcileButton.hidden=true;root.append(this.reconcileButton);
    this.history=el('details','learning-history');this.history.append(el('summary','','최초 설명·도움·수정 이력'));this.historyBody=el('div');this.history.append(this.historyBody);root.append(this.history);
    const exportBox=el('details');exportBox.append(el('summary','','Markdown 미리보기 · 내려받기'));this.preview=el('pre','learning-markdown');exportBox.append(button('현재 입력으로 미리보기',()=>{this.preview.textContent=recordMarkdown(this.value());}),this.preview,button('Markdown 내려받기',()=>download('duvi-learning-note.md',recordMarkdown(this.value()),'text/markdown;charset=utf-8')));root.append(exportBox);
    this.buildTutor();
  }
  buildTutor(){
    const box=el('details','learning-tutor');box.append(el('summary','','AI 도움 · 직접 요청할 때만 전송'));
    box.append(el('p','muted','저장한 질문·내 설명·근거 입력과 원문 구간을 확인한 뒤 기존 연결 계정과 번역 설정의 모델로 보냅니다. 인증이 없어도 기록과 복습은 쓸 수 있습니다. AI 답변은 제안이며 관측값이나 숙달 판정이 아닙니다.'));
    const help=field('요청 수준','tutorHelp',{options:{hint:'힌트만',partial:'부분 설명',full:'전체 설명'}});this.tutorHelp=help.input;box.append(help.wrap);
    this.tutorPreview=el('pre','learning-markdown');this.tutorAnswer=el('div','learning-ai-answer');this.tutorAnswer.setAttribute('role','status');
    const preview=button('전송할 문맥 확인',()=>{try{this.tutorContext=prepareTutorContext(this.value(),this.savedRecord,this.tutorHelp.value);const input=this.tutorContext.input;this.tutorPreview.textContent=`요청: ${this.tutorHelp.selectedOptions[0].textContent}\n원문: 강의 ${input.source.lectureId} · ${formatTime(input.source.start)}–${formatTime(input.source.end)}\n${input.source.excerpt}\n\n`+RECORD_FIELDS.map(key=>`${labels[key]}\n${input.learner[key]||'미기록'}`).join('\n\n')+`\n\n이전 도움: ${HELP[input.help]}`;this.tutorSend.hidden=false;this.tutorAnswer.textContent='';}catch(error){this.tutorAnswer.textContent=error.message;this.tutorSend.hidden=true;}});
    this.tutorSend=button('위 문맥으로 AI에 요청',()=>busy(this.tutorSend,async()=>{this.fields.disabled=true;const context=this.tutorContext;try{const current=prepareTutorContext(this.value(),this.savedRecord,context.help);if(JSON.stringify(current)!==JSON.stringify(context))throw new Error('입력이 바뀌었습니다. 문맥을 다시 확인하세요.');const response=await this.onTutor(tutorRequest(context));this.tutorAnswer.textContent='AI 제안 · 독립 확인 필요\n'+(response.answer||response.text||describe(response));this.inputs.help.value=context.help;this.stash();this.acceptSaved(await this.onSave(this.value()));this.showHistory(this.record);this.notice.textContent='AI 도움 정도를 저장했습니다. 최초 설명은 유지됩니다.';}catch(error){this.tutorAnswer.textContent+=`\nAI 요청 또는 도움 이력 저장 실패: ${error.message} 작성한 기록은 유지됩니다.`;if(error.status===409)this.conflictButton.hidden=false;}finally{this.fields.disabled=false;this.tutorSend.hidden=true;}}));this.tutorSend.hidden=true;
    this.form.addEventListener('input',()=>{this.tutorSend.hidden=true;});this.tutorHelp.addEventListener('change',()=>{this.tutorSend.hidden=true;});
    box.append(preview,this.tutorPreview,this.tutorSend,this.tutorAnswer);this.root.append(box);
  }
  value(){const result={...this.record,revision:this.baseRevision??this.record?.revision};for(const name of RECORD_FIELDS)result[name]=this.inputs[name].value;result.help=this.inputs.help.value;const days=this.inputs.reviewDays.value;result.reviewDueAt=days==='keep'?(this.record?.reviewDueAt??null):days==='none'?null:new Date(Date.now()+Number(days)*86400000).toISOString();return result;}
  isDirty(){if(!this.record)return false;if(!this.savedRecord)return RECORD_FIELDS.some(key=>key!=='title'&&this.inputs[key].value.trim());return RECORD_FIELDS.some(key=>(this.savedRecord[key]||'')!==this.inputs[key].value)||this.inputs.help.value!==this.savedRecord.help||this.inputs.reviewDays.value!=='keep'||JSON.stringify(this.record.anchor)!==JSON.stringify(this.savedRecord.anchor);}
  stash(){if(!this.key)return;if(this.isDirty())this.drafts[this.key]={record:this.value(),baseRevision:this.baseRevision,reviewDays:this.inputs.reviewDays.value};else delete this.drafts[this.key];try{localStorage.setItem('duvi-learning-drafts-v1',JSON.stringify(this.drafts));}catch{this.notice.textContent='이 브라우저에 초안을 보관할 수 없습니다. 창을 닫기 전에 서버에 저장하거나 Markdown을 내려받으세요.';}}
  acceptSaved(saved){this.record=saved;this.savedRecord=structuredClone(saved);this.baseRevision=saved.revision;this.draftConflict=false;this.inputs.reviewDays.value='keep';delete this.drafts[this.key];try{localStorage.setItem('duvi-learning-drafts-v1',JSON.stringify(this.drafts));}catch{}}
  newRecord(){const context=this.capture();if(!context?.anchor){this.notice.textContent='강의를 먼저 열어주세요.';return;}this.open({...context,title:'',help:'none'},true);}
  notePaused(seconds){this.notice.textContent=`영상을 ${formatTime(seconds)}에서 멈췄습니다. 질문을 적고 저장한 뒤 다시 재생하세요.`;}
  open(record,fresh=false){
    if(this.fields.disabled){this.notice.textContent='요청을 마친 뒤 다른 기록을 열어주세요. 현재 입력을 유지합니다.';return;}
    this.stash();this.key=record.id||`${record.anchor?.lectureId}:${record.anchor?.cueStart??record.anchor?.seconds}`;
    const draft=this.drafts[this.key];this.savedRecord=record.id?structuredClone(record):null;this.record={...(draft?.record||record)};this.baseRevision=draft?(draft.baseRevision??draft.record.revision):record.revision;this.draftConflict=!!(record.id&&draft&&this.baseRevision!==record.revision);
    for(const name of RECORD_FIELDS)this.inputs[name].value=this.record[name]||'';this.inputs.help.value=this.record.help||'none';this.inputs.reviewDays.value=draft?.reviewDays||(record.id?'keep':'1');
    const a=this.record.anchor||{};this.anchorSummary.textContent=`${a.lectureId?this.lectureName(a.lectureId):'강의 미선택'} · ${formatTime(a.seconds)} · 원문 자막 기준`;this.aiAnswer.hidden=!this.record.aiAnswer;this.aiAnswerText.textContent=this.record.aiAnswer||'';this.anchorText.textContent=`기록 당시 원문: ${a.sourceText||'자막 없음'}${a.translation?'\n당시 번역: '+a.translation:''}`;
    this.notice.textContent=this.draftConflict?'초안 이후 서버 기록이 바뀌었습니다. 초안은 유지합니다. 최신 설명을 확인하고 반영 여부를 선택하세요.':draft?'저장하지 않은 초안을 복원했습니다.':fresh?'질문 한 줄만 적어도 저장할 수 있습니다.':'';this.conflictButton.hidden=!this.draftConflict;this.reconcileButton.hidden=true;this.tutorSend.hidden=true;this.tutorAnswer.textContent='';this.tutorPreview.textContent='';this.preview.textContent='';this.showHistory(record);this.inputs.question.focus();
  }
  showHistory(record){this.historyBody.replaceChildren(el('h4','','최초 내 설명'),el('p','learning-preserve',(record.originalExplanation??record.initialExplanation??record.explanation)||'최초 저장에는 설명이 없습니다.'));
    this.historyBody.append(el('h4','','현재 저장된 설명'),el('p','learning-preserve',record.explanation||'질문만 저장됨'),el('p','muted',HELP[record.help]||'도움 미기록'));
    for(const [name,list] of [['수정',record.history],['복습',record.reviews]])if(list?.length){this.historyBody.append(el('h4','',name));for(const entry of list){const snapshot=entry.record||entry,detail=el('details'),date=entry.at?new Date(entry.at).toLocaleString('ko-KR'):'';detail.append(el('summary','',`${name} · ${date} · ${HELP[snapshot.help]||'도움 미기록'}${entry.device?` · 다른 PC(${entry.device}) 수정본`:''}`));for(const key of [...RECORD_FIELDS,'reflection'])if(snapshot[key])detail.append(el('h4','',labels[key]||'회상·전이 복습'),el('p','learning-preserve',snapshot[key]));
      if(name==='수정'&&snapshot.explanation&&snapshot.explanation!==record.explanation)detail.append(button('이 설명 복원 (저장 전 확인)',()=>{
        if(this.fields.disabled)return;
        this.inputs.explanation.value=snapshot.explanation;
        if(HELP[snapshot.help])this.inputs.help.value=snapshot.help;
        this.stash();this.tutorSend.hidden=true;
        this.notice.textContent='이전 설명을 편집란에 불러왔습니다. 확인 후 저장하면 새 수정 이력으로 남습니다.';
        this.inputs.explanation.focus();
      }));
      const source=snapshot.anchor||record.anchor;if(source){detail.append(el('p','muted',`강의 ${source.lectureId} · ${formatTime(source.seconds)}의 원문`),button('이때 원문으로 이동',async()=>{try{const result=await this.onJump(source);this.notice.textContent=result.message;}catch(error){this.notice.textContent=error.message;}}));}this.historyBody.append(detail);}}}
  async jump(){try{const result=await this.onJump(this.record.anchor);this.notice.textContent=result.message;}catch(error){this.notice.textContent=error.message;}}
  async save(){const record=this.value(),error=validateRecord(record);if(error){this.notice.textContent=error;return;}this.stash();if(this.draftConflict){this.notice.textContent='서버 기록이 바뀌었습니다. 초안을 유지한 채 최신 저장본을 먼저 확인하세요.';this.conflictButton.hidden=false;return;}this.fields.disabled=true;
    try{const saved=await this.onSave(record);delete this.drafts[this.key];this.key=saved.id;this.acceptSaved(saved);try{localStorage.setItem('duvi-learning-drafts-v1',JSON.stringify(this.drafts));}catch{}this.showHistory(saved);this.notice.textContent='저장했습니다. 강의를 이어가거나 나중에 복습하세요.';this.conflictButton.hidden=true;}
    catch(error){this.notice.textContent=apiErrorMessage(error);this.conflictButton.hidden=error.status!==409;}
    finally{this.fields.disabled=false;}
  }
}
