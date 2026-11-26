import {el,button,busy} from './learning-dom.mjs';
import {RECORD_FIELDS,orderedResources,apiErrorMessage,lectureResource,curriculumPlace,resourceCompleted,resourceProgressId,progressStatus,completionSummary,questionAutoPause} from './learning-model.mjs';
import {LearningEditor} from './learning-editor.mjs';
import {renderRoadmap,resourceAction,requiredProgressText} from './learning-map-view.mjs';
import {focusV4Card} from './curriculum-v4-view.mjs';
import {nextStudyStep} from './curriculum-v4-model.mjs';
import {renderRecords} from './learning-records-view.mjs';
import {LearningBackupUI} from './learning-backup-ui.mjs';
import {LearningSyncUI} from './learning-sync-ui.mjs';
import {ChatPanel} from './learning-chat.mjs';
import {withThread} from './learning-chat-model.mjs';
import {lectureStream} from './learning-stream-model.mjs';
import {TimeStrip} from './learning-timeline.mjs';
export function recordInput(record){return Object.fromEntries(['id','resourceId','lectureId',...RECORD_FIELDS,'aiAnswer','help','anchor','reviewDueAt'].filter(key=>record[key]!==undefined).map(key=>[key,record[key]]));}
/** The panel re-renders while the dialog loads, so fall back to the re-created control with the same label. */
export function returnFocusTarget({opener,label,root}){
  if(opener?.isConnected)return opener;
  return label&&root?[...root.querySelectorAll('button,a,summary')].find(node=>node.textContent===label)||null:null;
}
export class LearningUI{
  constructor({api,stream,capture,onOpen,onOpenConcept,onJump,onPrepare,onRestorePositions=()=>{},resumeSync,onStateChange=()=>{},getModel,openPanel,closeLibrary,showView=()=>{},player,cueAt,onChatCount=()=>{}}){
    Object.assign(this,{api,capture,onOpen,onOpenConcept,onJump,onPrepare,onRestorePositions,resumeSync,onStateChange,getModel,openPanel,closeLibrary,showView,player});
    this.strip=new TimeStrip(document.getElementById('timeStrip'),{jump:seconds=>{player.pause();player.seek(seconds);}});this.state={revision:0,records:[],progress:{},chats:[]};this.roadmap=null;this.view='roadmap';this.loaded=false;this.saving=false;
    this.dialog=document.getElementById('learningDialog');this.content=document.getElementById('learningContent');this.notice=document.getElementById('learningNotice');
    const header=this.dialog.querySelector('.dialog-header');
    new ResizeObserver(()=>{
      const {height}=header.getBoundingClientRect();
      if(height)this.dialog.style.setProperty('--roadmap-header-height',`${height}px`);
    }).observe(header,{box:'border-box'});
    // The full record editor (evidence fields, history, Markdown, tutor) opens as a dialog from a question's 자세히.
    this.recordDialog=document.getElementById('recordDialog');
    document.getElementById('closeRecord').onclick=()=>this.recordDialog.close();
    this.recordDialog.addEventListener('close',()=>{if(this.recordOpener?.isConnected)this.recordOpener.focus();if(this.recordDialog.parentElement.id==='stage')document.body.append(this.recordDialog);});
    const jumpFromRecord=async anchor=>{const result=await onJump(anchor);if(result.status==='matched'&&this.recordDialog.open)this.recordDialog.close();return result;};
    this.editor=new LearningEditor(document.getElementById('learningQuestion'),{capture:()=>this.context(),onSave:record=>this.saveRecord(record),onJump:jumpFromRecord,onTutor:body=>this.api('/api/learning/tutor',{...body,model:this.getModel()}),onConflict:async()=>{await this.refresh();return this.state.records.find(r=>r.id===this.editor.record?.id);},lectureName:id=>this.lectureName(id)});
    this.chat=new ChatPanel(document.getElementById('learningChat'),{api,stream,capture,...player,getState:()=>this.state,
      applyThread:(thread,revision,record)=>this.applyThread(thread,revision,record),openDetails:(record,history)=>this.edit(record,history),cueAt,onCount:onChatCount,
      saveExplanation:(item,text,help,revision)=>this.saveExplanation(item,text,help,revision),
      latestExplanation:async key=>{await this.refresh();return this.streamItems().find(row=>row.key===key)?.record;}});
    this.nav=document.getElementById('learningNav');for(const [id,title]of Object.entries({roadmap:'학습 로드맵',records:'내 기록',review:'복습',backup:'백업·동기화'})){const tab=button(title,()=>this.select(id));tab.dataset.learningView=id;this.nav.append(tab);}
    document.getElementById('openLearning').onclick=()=>this.open('roadmap');
    for(const opener of document.querySelectorAll('[data-open-learning]'))opener.onclick=()=>this.open(opener.dataset.openLearning);
    document.getElementById('closeLearning').onclick=()=>this.dialog.close();
    this.dialog.addEventListener('close',()=>{
      const opener=returnFocusTarget({opener:this.opener,label:this.openerLabel,root:document.getElementById(this.openerRootId)});
      opener?.focus();
      const stage=this.dialog.parentElement;
      if(stage.id==='stage'){
        document.body.append(this.dialog);
        if(stage.classList.contains('study-focus')&&!stage.contains(document.activeElement))stage.focus();
      }
    });
    // 강의 완료 sits in the lecture header and, because fullscreen hides the header, also in fullscreen's ⚙ settings.
    const completeCurrent=()=>{const current=this.capture();if(current)void this.complete(lectureResource(this.roadmap,current.lectureId,current.title)).catch(()=>{});};
    this.completeButtons=['lectureHeaderActions','fullscreenComplete'].map(id=>{const node=button('○ 강의 완료로 표시',completeCurrent,'learning-complete');document.getElementById(id).append(node);return node;});
    this.completeButton=this.completeButtons[0];this.completeButton.id='completeLecture';
    this.completionNotice=el('span','learning-completion-notice');this.completionNotice.setAttribute('role','status');this.completeButton.after(this.completionNotice);
    this.resume=el('div','learning-resume');document.getElementById('openLearning').after(this.resume);
    this.renderPanel();
  }
  /** The lecture title a learner recognises, instead of an internal id such as yt_VMj-3S1tku0. */
  lectureName(id){const current=this.capture();return orderedResources(this.roadmap).find(r=>String(r.lectureId)===String(id))?.title||(current&&String(current.lectureId)===String(id)&&current.title)||`강의 ${id}`;}
  context(){const context=this.capture();if(!context)return null;const resource=orderedResources(this.roadmap).find(r=>String(r.lectureId)===String(context.lectureId));return {...context,resourceId:resource?.id||`lecture-${context.lectureId}`};}
  /** A chat turn (and its question's record) written by the server; any other change since our copy means reloading the whole state. */
  applyThread(thread,revision,record){const next=withThread(this.state,thread,revision,record);if(next){this.state=next;this.sync();}else void this.refresh().catch(()=>{});}
  /** A newly loaded lecture: its markers on the time strip and its stream in the panel. */
  lectureChanged(){this.renderPanel();this.strip.set(this.streamItems(),this.player.duration());this.chat.sync();}
  streamItems(){const current=this.capture();return current?lectureStream(this.state,current.lectureId):[];}
  tick(seconds){this.strip.update(seconds);this.chat.tick(seconds);}
  /**
   * The learner's explanation under a question. A question sent since 2026-11-24 already has its record; an older one
   * becomes a record first. The first explanation schedules the next-day review that an open question does not have yet.
   */
  async saveExplanation(item,explanation,help,baseRevision){
    let record=item.record;
    if(!record){
      const answer=item.answers?.findLast(row=>row.role==='assistant'&&row.text);if(!answer)throw new Error('답이 온 뒤에 내 설명을 저장할 수 있습니다.');
      const {state,recordId}=await this.api('/api/learning/chat/record',{threadId:item.threadId,messageId:answer.id});this.state=state;this.sync();
      record=state.records.find(row=>row.id===recordId);if(!record)throw new Error('기록을 만들지 못했습니다. 다시 저장하세요.');
    }
    // A just-created chat record starts at 1. A later revision belongs to another edit.
    return this.saveRecord({...record,revision:baseRevision??1,explanation,help,reviewDueAt:record.reviewDueAt??new Date(Date.now()+86400000).toISOString()});
  }
  async refresh(){const [state,roadmap]=await Promise.all([this.api('/api/learning'),this.api('/api/learning/roadmap')]);if(!this.loaded||state.revision>=this.state.revision)this.state=state;this.roadmap=roadmap;this.loaded=true;this.sync();this.chat.sync();}
  sync(){
    this.renderPanel();this.strip.set(this.streamItems(),this.player.duration());this.chat.renderLog();this.updateRoadmap?.(this.state);this.onStateChange(this.roadmap,this.state.progress);
    const {progress}=this.state,summary=completionSummary(this.roadmap,progress),step=nextStudyStep(this.roadmap,progress);
    this.resume.replaceChildren(el('p','muted',`기존 자료 ${summary.done}/${summary.total}개 완료 · ${summary.percent}%${requiredProgressText(this.roadmap,progress)}`));
    if(step){
      const {item,kind}=step;
      const label=`다음 · ${item.label?`${item.label} · `:''}${item.title}`;
      const action=kind==='resource'?resourceAction(item,label,r=>this.openResource(r)):button(label,()=>this.open('roadmap',item.id));
      action.classList.add('learning-resume-action');this.resume.append(action);
    }else this.resume.append(button('✓ 계획 완료 · 복습하기',()=>this.open('review')));
    if(this.resourceError){const error=el('p','notice',this.resourceError);error.setAttribute('role','status');this.resume.append(error,button('로드맵에서 강의 준비',()=>this.open('roadmap')));}
  }
  async openPhase(id){await this.open('roadmap');const section=[...this.content.querySelectorAll('[data-phase-id]')].find(node=>node.dataset.phaseId===id);if(section){section.open=true;section.querySelector('summary').focus();section.scrollIntoView({block:'start'});}}
  async init(){try{await this.refresh();}catch(error){this.completionNotice.textContent=error.message;}}
  async open(view='roadmap',cardId){
    this.opener=document.activeElement;this.openerLabel=this.opener?.textContent;this.openerRootId=this.opener?.parentElement?.closest('[id]')?.id;this.modal(this.dialog);this.view=view;this.content.replaceChildren(el('p','muted','학습 기록을 불러오는 중…'));this.notice.textContent='';
    try{await this.refresh();this.select(view);if(view==='roadmap'&&cardId)focusV4Card(this.content,cardId);}catch(error){this.notice.textContent=error.message;this.content.replaceChildren(button('다시 불러오기',()=>this.open(view,cardId)));}
  }
  select(view){if(!this.loaded)return;this.view=view;this.notice.textContent='';this.updateRoadmap=null;for(const tab of this.nav.children)tab.setAttribute('aria-pressed',String(tab.dataset.learningView===view));this.content.replaceChildren();
    if(view==='roadmap')this.updateRoadmap=renderRoadmap(this.content,{roadmap:this.roadmap,state:this.state,onOpen:resource=>this.openResource(resource),onOpenConcept:this.onOpenConcept&&((id)=>{this.dialog.close();this.onOpenConcept(id);}),onProgress:(id,status)=>this.changeProgress(id,status),onPrepare:event=>this.prepare(event),onComplete:resource=>this.complete(resource)});
    if(view==='records'||view==='review')renderRecords(this.content,{state:this.state,review:view==='review',filter:this.recordFilter||'all',onFilter:filter=>{this.recordFilter=filter;this.select('records');},lectureName:id=>this.lectureName(id),onEdit:record=>this.edit(record),onJump:record=>this.jump(record),onReview:body=>this.review(body),onReload:()=>this.refresh()});
    if(view==='backup'){new LearningBackupUI(this.content,{api:this.api,onImported:async()=>{this.onRestorePositions();await this.refresh();await this.onPrepare();}});new LearningSyncUI(this.content,{api:this.api,resumeSync:this.resumeSync,onImported:()=>this.refresh()});}
  }
  /** The lecture header: curriculum place and completion (돌아보기 is review-view.mjs). */
  renderPanel(){
    const current=this.capture(),resource=current?lectureResource(this.roadmap,current.lectureId,current.title):null,done=resource&&resourceCompleted(this.roadmap,this.state.progress,resource);
    const place=document.getElementById('lecturePlace');place.textContent=place.title=current?curriculumPlace(this.roadmap,current.lectureId):'';
    if(this.completionLectureId!==current?.lectureId){this.completionNotice.textContent='';this.completionLectureId=current?.lectureId;}
    for(const node of this.completeButtons||[]){node.disabled=!this.loaded||!current||this.saving;node.textContent=done?'✓ 강의 완료 · 취소':'○ 강의 완료로 표시';node.setAttribute('aria-pressed',String(!!done));}
  }
  /** Shows a dialog; in fullscreen it moves into the stage so the fullscreen element does not hide it. */
  modal(dialog){this.closeLibrary();const stage=document.getElementById('stage');if(stage.classList.contains('study-focus')){stage.append(dialog);dialog.inert=false;}if(!dialog.open)dialog.showModal();}
  /** 현재 시점 기록 남기기: a record without asking the tutor, at the current playback time. */
  question(){
    const paused=this.player.isPlaying()&&questionAutoPause(localStorage);if(paused)this.player.pause();
    this.recordOpener=document.activeElement;this.showView('lecture');this.modal(this.recordDialog);this.editor.newRecord();
    if(paused)this.editor.notePaused(this.player.time());
  }
  edit(record,history=false){this.recordOpener=document.activeElement;if(this.dialog.open)this.dialog.close();this.modal(this.recordDialog);this.editor.open(record);if(history){this.editor.history.open=true;this.editor.history.querySelector('summary').focus();}}
  async jump(record){try{const result=await this.onJump(record.anchor);if(result.status==='matched'){if(this.dialog.open)this.dialog.close();this.openPanel('chat');}else this.notice.textContent=result.message;}catch(error){this.notice.textContent=error.message;}}
  async openResource(resource){
    this.resourceError='';this.notice.textContent='강의를 여는 중…';try{await this.onOpen(resource);this.closeLibrary();this.dialog.close();this.notice.textContent='';}catch(error){this.resourceError=error.message;this.notice.textContent=error.message;}this.sync();
  }
  async prepare(event){const target=event?.currentTarget;const action=async()=>{this.notice.textContent='강의 순서와 폴더를 준비하는 중…';try{const result=await this.api('/api/learning/prepare',{});await this.onPrepare();this.notice.textContent='강의 폴더를 준비했습니다. 각 강의에서 자막 상태를 확인하세요.'+(result.failed?.length?` 준비하지 못한 항목 ${result.failed.length}개`: '');}catch(error){this.notice.textContent=error.message;}};if(target)await busy(target,action);else await action();}
  async mutate(route,body){if(!this.loaded)await this.refresh();if(this.saving)throw new Error('이전 저장을 마친 뒤 다시 시도하세요.');this.saving=true;try{this.state=await this.api(route,{revision:this.state.revision,...body});return this.state;}finally{this.saving=false;this.sync();}}
  async saveRecord(record){const previous=new Set(this.state.records.map(r=>r.id)),body={record:recordInput(record)};if(record.id)body.recordRevision=record.revision;const state=await this.mutate('/api/learning/records',body);return record.id?state.records.find(r=>r.id===record.id):state.records.find(r=>!previous.has(r.id));}
  async changeProgress(resourceId,status){try{await this.mutate('/api/learning/progress',{resourceId,status});this.notice.textContent='학습 상태를 저장했습니다.';}catch(error){this.notice.textContent=apiErrorMessage(error);if(error.status===409){const retry=button('최신 상태 확인',async()=>{await this.refresh();this.select('roadmap');this.notice.textContent='최신 상태입니다. 원하는 상태를 다시 선택하세요.';});this.notice.append(retry);}throw error;}}
  async complete(resource){if(!this.loaded)await this.refresh();const id=resourceProgressId(this.roadmap,resource),done=resourceCompleted(this.roadmap,this.state.progress,resource);for(const node of this.completeButtons)node.disabled=true;try{await this.mutate('/api/learning/progress',{resourceId:id,status:progressStatus(this.state.progress[id]),completed:!done});const message=done?'완료 표시를 취소했습니다.':'완료 표시를 저장했습니다.';this.notice.textContent=message;this.completionNotice.textContent=message;}catch(error){if(error.status===409)await this.refresh().catch(()=>{});const message=apiErrorMessage(error);this.notice.textContent=message;this.completionNotice.textContent=message;throw error;}finally{for(const node of this.completeButtons)node.disabled=false;}}
  async review(body){await this.mutate('/api/learning/review',body);this.select('review');this.notice.textContent='복습과 다음 날짜를 저장했습니다.';}
}
