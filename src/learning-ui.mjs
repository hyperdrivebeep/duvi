import {el,button,busy} from './learning-dom.mjs';
import {RECORD_FIELDS,orderedResources,apiErrorMessage,dueRecords,lectureResource,resourceCompleted,resourceProgressId,progressStatus,nextResource,completionSummary} from './learning-model.mjs';
import {LearningEditor} from './learning-editor.mjs';
import {renderRoadmap,resourceAction} from './learning-map-view.mjs';
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
  constructor({api,stream,capture,onOpen,onJump,onPrepare,onRestorePositions=()=>{},resumeSync,onStateChange=()=>{},getModel,openPanel,closeLibrary,player,cueAt}){
    Object.assign(this,{api,capture,onOpen,onJump,onPrepare,onRestorePositions,resumeSync,onStateChange,getModel,openPanel,closeLibrary,player});
    this.strip=new TimeStrip(document.getElementById('timeStrip'),{jump:seconds=>{player.pause();player.seek(seconds);}});this.state={revision:0,records:[],progress:{},chats:[]};this.roadmap=null;this.view='roadmap';this.loaded=false;this.saving=false;
    this.dialog=document.getElementById('learningDialog');this.content=document.getElementById('learningContent');this.notice=document.getElementById('learningNotice');
    this.editor=new LearningEditor(document.getElementById('learningQuestion'),{capture:()=>this.context(),onSave:record=>this.saveRecord(record),onJump,onTutor:body=>this.api('/api/learning/tutor',{...body,model:this.getModel()}),onConflict:async()=>{await this.refresh();return this.state.records.find(r=>r.id===this.editor.record?.id);},lectureName:id=>this.lectureName(id)});
    this.chat=new ChatPanel(document.getElementById('learningChat'),{api,stream,capture,...player,getState:()=>this.state,
      applyThread:(thread,revision)=>this.applyThread(thread,revision),applyState:state=>{this.state=state;this.sync();},
      openRecords:()=>{this.recordFilter='open';void this.open('records');},openTranscript:()=>openPanel('transcript'),cueAt,
      saveExplanation:(item,text,help,revision)=>this.saveExplanation(item,text,help,revision),
      latestExplanation:async key=>{await this.refresh();return this.streamItems().find(row=>row.key===key)?.record;}});
    this.nav=document.getElementById('learningNav');for(const [id,title]of Object.entries({roadmap:'학습 로드맵',records:'내 기록',review:'복습',backup:'백업·동기화'})){const tab=button(title,()=>this.select(id));tab.dataset.learningView=id;this.nav.append(tab);}
    document.getElementById('openLearning').onclick=()=>this.open('roadmap');document.getElementById('openLearningMobile').onclick=()=>this.open('roadmap');
    document.getElementById('closeLearning').onclick=()=>this.dialog.close();this.dialog.addEventListener('close',()=>{returnFocusTarget({opener:this.opener,label:this.openerLabel,root:document.getElementById(this.openerRootId)})?.focus();if(this.dialog.parentElement.id==='stage')document.body.append(this.dialog);});
    this.completeButton=button('강의 완료',()=>{const current=this.capture();if(current)void this.complete(lectureResource(this.roadmap,current.lectureId,current.title)).catch(()=>{});},'learning-complete');this.completeButton.id='completeLecture';document.getElementById('openQuestion').before(this.completeButton);
    this.completionNotice=el('span','learning-completion-notice');this.completionNotice.setAttribute('role','status');this.completeButton.after(this.completionNotice);
    this.resume=el('div','learning-resume');document.getElementById('openLearning').after(this.resume);
    this.renderPanel();
  }
  /** The lecture title a learner recognises, instead of an internal id such as yt_VMj-3S1tku0. */
  lectureName(id){const current=this.capture();return orderedResources(this.roadmap).find(r=>String(r.lectureId)===String(id))?.title||(current&&String(current.lectureId)===String(id)&&current.title)||`강의 ${id}`;}
  context(){const context=this.capture();if(!context)return null;const resource=orderedResources(this.roadmap).find(r=>String(r.lectureId)===String(context.lectureId));return {...context,resourceId:resource?.id||`lecture-${context.lectureId}`};}
  /** A chat turn written by the server; any other change since our copy means reloading the whole state. */
  applyThread(thread,revision){const next=withThread(this.state,thread,revision);if(next){this.state=next;this.sync();}else void this.refresh().catch(()=>{});}
  /** A newly loaded lecture: its markers on the time strip and its stream in the panel. */
  lectureChanged(){this.renderPanel();this.strip.set(this.streamItems(),this.player.duration());this.chat.sync();}
  streamItems(){const current=this.capture();return current?lectureStream(this.state,current.lectureId):[];}
  tick(seconds){this.strip.update(seconds);this.chat.tick(seconds);}
  /** The learner's explanation under a question: a chat answer becomes its record first, then the explanation is saved on it. */
  async saveExplanation(item,explanation,help,baseRevision){
    let record=item.record;
    if(!record){
      const answer=item.answers?.findLast(row=>row.role==='assistant'&&row.text);if(!answer)throw new Error('답이 온 뒤에 내 설명을 저장할 수 있습니다.');
      const {state,recordId}=await this.api('/api/learning/chat/record',{threadId:item.threadId,messageId:answer.id});this.state=state;this.sync();
      record=state.records.find(row=>row.id===recordId);if(!record)throw new Error('기록을 만들지 못했습니다. 다시 저장하세요.');
    }
    // A just-created chat record starts at 1. A later revision belongs to another edit.
    return this.saveRecord({...record,revision:baseRevision??1,explanation,help});
  }
  async refresh(){const [state,roadmap]=await Promise.all([this.api('/api/learning'),this.api('/api/learning/roadmap')]);if(!this.loaded||state.revision>=this.state.revision)this.state=state;this.roadmap=roadmap;this.loaded=true;this.sync();this.chat.sync();}
  sync(){this.renderPanel();this.strip.set(this.streamItems(),this.player.duration());this.chat.renderLog();this.updateRoadmap?.(this.state);this.onStateChange(this.roadmap,this.state.progress);const summary=completionSummary(this.roadmap,this.state.progress),next=nextResource(this.roadmap,this.state.progress);this.resume.replaceChildren(el('p','muted',`학습 ${summary.done}/${summary.total}개 완료 · ${summary.percent}%`));if(next){const action=resourceAction(next,`다음 · ${next.title}`,r=>this.openResource(r),'learning-resume-action');action.classList.add('learning-resume-action');this.resume.append(action);}else this.resume.append(button('✓ 계획 완료 · 복습하기',()=>this.open('review')));if(this.resourceError){const error=el('p','notice',this.resourceError);error.setAttribute('role','status');this.resume.append(error,button('로드맵에서 강의 준비',()=>this.open('roadmap')));}}
  async openPhase(id){await this.open('roadmap');const section=[...this.content.querySelectorAll('[data-phase-id]')].find(node=>node.dataset.phaseId===id);if(section){section.open=true;section.querySelector('summary').focus();section.scrollIntoView({block:'start'});}}
  async init(){try{await this.refresh();}catch(error){this.panelNotice.textContent=error.message;}}
  async open(view='roadmap'){
    this.opener=document.activeElement;this.openerLabel=this.opener?.textContent;this.openerRootId=this.opener?.parentElement?.closest('[id]')?.id;this.closeLibrary();const stage=document.getElementById('stage');if(stage.classList.contains('study-focus')){stage.append(this.dialog);this.dialog.inert=false;}if(!this.dialog.open)this.dialog.showModal();this.view=view;this.content.replaceChildren(el('p','muted','학습 기록을 불러오는 중…'));this.notice.textContent='';
    try{await this.refresh();this.select(view);}catch(error){this.notice.textContent=error.message;this.content.replaceChildren(button('다시 불러오기',()=>this.open(view)));}
  }
  select(view){if(!this.loaded)return;this.view=view;this.notice.textContent='';this.updateRoadmap=null;for(const tab of this.nav.children)tab.setAttribute('aria-pressed',String(tab.dataset.learningView===view));this.content.replaceChildren();
    if(view==='roadmap')this.updateRoadmap=renderRoadmap(this.content,{roadmap:this.roadmap,state:this.state,onOpen:resource=>this.openResource(resource),onProgress:(id,status)=>this.changeProgress(id,status),onPrepare:event=>this.prepare(event),onComplete:resource=>this.complete(resource)});
    if(view==='records'||view==='review')renderRecords(this.content,{state:this.state,review:view==='review',filter:this.recordFilter||'all',onFilter:filter=>{this.recordFilter=filter;this.select('records');},lectureName:id=>this.lectureName(id),onEdit:record=>this.edit(record),onJump:record=>this.jump(record),onReview:body=>this.review(body),onReload:()=>this.refresh()});
    if(view==='backup'){new LearningBackupUI(this.content,{api:this.api,onImported:async()=>{this.onRestorePositions();await this.refresh();await this.onPrepare();}});new LearningSyncUI(this.content,{api:this.api,resumeSync:this.resumeSync,onImported:()=>this.refresh()});}
  }
  renderPanel(){
    const root=document.getElementById('learningStudy');root.replaceChildren(el('h3','','내 학습'),el('p','muted','시청 → 질문 → 내 설명 → 작은 실습 → 생각 수정 → 복습'));
    const current=this.capture(),resource=current?lectureResource(this.roadmap,current.lectureId,current.title):null,done=resource&&resourceCompleted(this.roadmap,this.state.progress,resource);
    if(this.completionLectureId!==current?.lectureId){this.completionNotice.textContent='';this.completionLectureId=current?.lectureId;}
    if(this.completeButton){this.completeButton.disabled=!this.loaded||!current||this.saving;this.completeButton.textContent=done?'✓ 강의 완료 · 취소':'강의 완료';this.completeButton.setAttribute('aria-pressed',String(!!done));}
    if(resource)root.append(el('p','learning-completion-label',done?'✓ 이 강의 완료 표시됨':'이 강의는 아직 완료 전입니다.'));
    const next=nextResource(this.roadmap,this.state.progress);if(this.loaded&&next)root.append(resourceAction(next,`다음 · ${next.title}`,r=>this.openResource(r),'learning-panel-record'));
    this.panelNotice=el('p','notice',this.resourceError||'');this.panelNotice.setAttribute('role','status');root.append(this.panelNotice);
    const actions=el('div','learning-actions');actions.append(button('질문하기 (채팅)',()=>this.openPanel('chat')),button('현재 시점 기록 남기기',()=>this.question()),button('전체 로드맵',()=>this.open('roadmap')),button(this.loaded?`복습할 기록 ${dueRecords(this.state.records).length}개`:'복습 기록 열기',()=>this.open('review')));root.append(actions);
    if(!this.loaded)root.append(el('p','muted','학습 기록을 아직 불러오지 못했습니다.'),button('다시 불러오기',()=>this.init()));
    const local=this.state.records.filter(r=>String(r.lectureId)===String(this.capture()?.lectureId));
    root.append(el('h4','','이 강의의 기록'));if(!local.length)root.append(el('p','muted','아직 저장한 기록이 없습니다.'));
    for(const record of local)root.append(button(record.question||record.title||'내 설명',()=>this.edit(record),'learning-panel-record'));
  }
  question(){this.openPanel('question');if(!this.editor.record)this.editor.newRecord();else this.editor.inputs.question.focus();}
  edit(record){if(this.dialog.open)this.dialog.close();this.openPanel('question');this.editor.open(record);}
  async jump(record){try{const result=await this.onJump(record.anchor);if(result.status==='matched'){if(this.dialog.open)this.dialog.close();this.openPanel('question');this.editor.open(record);}else this.notice.textContent=result.message;}catch(error){this.notice.textContent=error.message;}}
  async openResource(resource){
    this.resourceError='';this.notice.textContent='강의를 여는 중…';try{await this.onOpen(resource);this.closeLibrary();this.dialog.close();this.notice.textContent='';}catch(error){this.resourceError=error.message;this.notice.textContent=error.message;}this.sync();
  }
  async prepare(event){const target=event?.currentTarget;const action=async()=>{this.notice.textContent='강의 순서와 폴더를 준비하는 중…';try{const result=await this.api('/api/learning/prepare',{});await this.onPrepare();this.notice.textContent='강의 폴더를 준비했습니다. 각 강의에서 자막 상태를 확인하세요.'+(result.failed?.length?` 준비하지 못한 항목 ${result.failed.length}개`: '');}catch(error){this.notice.textContent=error.message;}};if(target)await busy(target,action);else await action();}
  async mutate(route,body){if(!this.loaded)await this.refresh();if(this.saving)throw new Error('이전 저장을 마친 뒤 다시 시도하세요.');this.saving=true;try{this.state=await this.api(route,{revision:this.state.revision,...body});return this.state;}finally{this.saving=false;this.sync();}}
  async saveRecord(record){const previous=new Set(this.state.records.map(r=>r.id)),body={record:recordInput(record)};if(record.id)body.recordRevision=record.revision;const state=await this.mutate('/api/learning/records',body);return record.id?state.records.find(r=>r.id===record.id):state.records.find(r=>!previous.has(r.id));}
  async changeProgress(resourceId,status){try{await this.mutate('/api/learning/progress',{resourceId,status});this.notice.textContent='학습 상태를 저장했습니다.';}catch(error){this.notice.textContent=apiErrorMessage(error);if(error.status===409){const retry=button('최신 상태 확인',async()=>{await this.refresh();this.select('roadmap');this.notice.textContent='최신 상태입니다. 원하는 상태를 다시 선택하세요.';});this.notice.append(retry);}throw error;}}
  async complete(resource){if(!this.loaded)await this.refresh();const id=resourceProgressId(this.roadmap,resource),done=resourceCompleted(this.roadmap,this.state.progress,resource);this.completeButton.disabled=true;try{await this.mutate('/api/learning/progress',{resourceId:id,status:progressStatus(this.state.progress[id]),completed:!done});const message=done?'완료 표시를 취소했습니다.':'완료 표시를 저장했습니다.';this.notice.textContent=message;this.completionNotice.textContent=message;}catch(error){if(error.status===409)await this.refresh().catch(()=>{});const message=apiErrorMessage(error);this.notice.textContent=message;this.completionNotice.textContent=message;throw error;}finally{this.completeButton.disabled=false;}}
  async review(body){await this.mutate('/api/learning/review',body);this.select('review');this.notice.textContent='복습과 다음 날짜를 저장했습니다.';}
}
