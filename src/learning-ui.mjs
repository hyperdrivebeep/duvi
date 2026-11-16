import {el,button,busy} from './learning-dom.mjs';
import {RECORD_FIELDS,orderedResources,apiErrorMessage,dueRecords} from './learning-model.mjs';
import {LearningEditor} from './learning-editor.mjs';
import {renderRoadmap} from './learning-map-view.mjs';
import {renderRecords} from './learning-records-view.mjs';
import {LearningBackupUI} from './learning-backup-ui.mjs';
export function recordInput(record){return Object.fromEntries(['id','resourceId','lectureId',...RECORD_FIELDS,'help','anchor','reviewDueAt'].filter(key=>record[key]!==undefined).map(key=>[key,record[key]]));}
export class LearningUI{
  constructor({api,capture,onOpen,onJump,onPrepare,onRestorePositions=()=>{},getModel,openPanel,closeLibrary}){
    Object.assign(this,{api,capture,onOpen,onJump,onPrepare,onRestorePositions,getModel,openPanel,closeLibrary});this.state={revision:0,records:[],progress:{}};this.roadmap=null;this.view='roadmap';this.loaded=false;this.saving=false;
    this.dialog=document.getElementById('learningDialog');this.content=document.getElementById('learningContent');this.notice=document.getElementById('learningNotice');
    this.editor=new LearningEditor(document.getElementById('learningQuestion'),{capture:()=>this.context(),onSave:record=>this.saveRecord(record),onJump,onTutor:body=>this.api('/api/learning/tutor',{...body,model:this.getModel()}),onConflict:async()=>{await this.refresh();return this.state.records.find(r=>r.id===this.editor.record?.id);}});
    this.nav=document.getElementById('learningNav');for(const [id,title]of Object.entries({roadmap:'학습 로드맵',records:'내 기록',review:'복습',backup:'백업·복원'})){const tab=button(title,()=>this.select(id));tab.dataset.learningView=id;this.nav.append(tab);}
    document.getElementById('openLearning').onclick=()=>this.open('roadmap');document.getElementById('openLearningMobile').onclick=()=>this.open('roadmap');
    document.getElementById('closeLearning').onclick=()=>this.dialog.close();this.dialog.addEventListener('close',()=>{if(this.opener?.isConnected)this.opener.focus();if(this.dialog.parentElement.id==='stage')document.body.append(this.dialog);});
    this.renderPanel();
  }
  context(){const context=this.capture();if(!context)return null;const resource=orderedResources(this.roadmap).find(r=>String(r.lectureId)===String(context.lectureId));return {...context,resourceId:resource?.id||`lecture-${context.lectureId}`};}
  async refresh(){const [state,roadmap]=await Promise.all([this.api('/api/learning'),this.api('/api/learning/roadmap')]);if(!this.loaded||state.revision>=this.state.revision)this.state=state;this.roadmap=roadmap;this.loaded=true;this.renderPanel();}
  async init(){try{await this.refresh();}catch(error){this.panelNotice.textContent=error.message;}}
  async open(view='roadmap'){
    this.opener=document.activeElement;this.closeLibrary();const stage=document.getElementById('stage');if(stage.classList.contains('study-focus')){stage.append(this.dialog);this.dialog.inert=false;}if(!this.dialog.open)this.dialog.showModal();this.view=view;this.content.replaceChildren(el('p','muted','학습 기록을 불러오는 중…'));this.notice.textContent='';
    try{await this.refresh();this.select(view);}catch(error){this.notice.textContent=error.message;this.content.replaceChildren(button('다시 불러오기',()=>this.open(view)));}
  }
  select(view){if(!this.loaded)return;this.view=view;this.notice.textContent='';for(const tab of this.nav.children)tab.setAttribute('aria-pressed',String(tab.dataset.learningView===view));this.content.replaceChildren();
    if(view==='roadmap')renderRoadmap(this.content,{roadmap:this.roadmap,state:this.state,onOpen:resource=>this.openResource(resource),onProgress:(id,status)=>this.changeProgress(id,status),onPrepare:event=>this.prepare(event)});
    if(view==='records'||view==='review')renderRecords(this.content,{state:this.state,review:view==='review',onEdit:record=>this.edit(record),onJump:record=>this.jump(record),onReview:body=>this.review(body),onReload:()=>this.refresh()});
    if(view==='backup')new LearningBackupUI(this.content,{api:this.api,onImported:async()=>{this.onRestorePositions();await this.refresh();await this.onPrepare();}});
  }
  renderPanel(){
    const root=document.getElementById('learningStudy');root.replaceChildren(el('h3','','내 학습'),el('p','muted','시청 → 질문 → 내 설명 → 작은 실습 → 생각 수정 → 복습'));
    this.panelNotice=el('p','notice');this.panelNotice.setAttribute('role','status');root.append(this.panelNotice);
    const actions=el('div','learning-actions');actions.append(button('현재 시점 질문 남기기',()=>this.question()),button('전체 로드맵',()=>this.open('roadmap')),button(this.loaded?`복습할 기록 ${dueRecords(this.state.records).length}개`:'복습 기록 열기',()=>this.open('review')));root.append(actions);
    if(!this.loaded)root.append(el('p','muted','학습 기록을 아직 불러오지 못했습니다.'),button('다시 불러오기',()=>this.init()));
    const local=this.state.records.filter(r=>String(r.lectureId)===String(this.capture()?.lectureId));
    root.append(el('h4','','이 강의의 기록'));if(!local.length)root.append(el('p','muted','아직 저장한 기록이 없습니다.'));
    for(const record of local)root.append(button(record.title||record.question||'내 설명',()=>this.edit(record),'learning-panel-record'));
  }
  question(){this.openPanel('question');if(!this.editor.record)this.editor.newRecord();else this.editor.inputs.question.focus();}
  edit(record){if(this.dialog.open)this.dialog.close();this.openPanel('question');this.editor.open(record);}
  async jump(record){try{const result=await this.onJump(record.anchor);if(result.status==='matched'){if(this.dialog.open)this.dialog.close();this.openPanel('question');this.editor.open(record);}else this.notice.textContent=result.message;}catch(error){this.notice.textContent=error.message;}}
  async openResource(resource){
    this.notice.textContent='강의를 여는 중…';try{await this.onOpen(resource);this.dialog.close();this.renderPanel();}catch(error){this.notice.textContent=error.message;}
  }
  async prepare(event){const target=event?.currentTarget;const action=async()=>{this.notice.textContent='강의 순서와 폴더를 준비하는 중…';try{const result=await this.api('/api/learning/prepare',{});await this.onPrepare();this.notice.textContent='강의 폴더를 준비했습니다. 각 강의에서 자막 상태를 확인하세요.'+(result.failed?.length?` 준비하지 못한 항목 ${result.failed.length}개`: '');}catch(error){this.notice.textContent=error.message;}};if(target)await busy(target,action);else await action();}
  async mutate(route,body){if(!this.loaded)await this.refresh();if(this.saving)throw new Error('이전 저장을 마친 뒤 다시 시도하세요.');this.saving=true;try{this.state=await this.api(route,{revision:this.state.revision,...body});this.renderPanel();return this.state;}finally{this.saving=false;}}
  async saveRecord(record){const previous=new Set(this.state.records.map(r=>r.id)),body={record:recordInput(record)};if(record.id)body.recordRevision=record.revision;const state=await this.mutate('/api/learning/records',body);return record.id?state.records.find(r=>r.id===record.id):state.records.find(r=>!previous.has(r.id));}
  async changeProgress(resourceId,status){try{await this.mutate('/api/learning/progress',{resourceId,status});this.notice.textContent='학습 상태를 저장했습니다.';}catch(error){this.notice.textContent=apiErrorMessage(error);if(error.status===409){const retry=button('최신 상태 확인',async()=>{await this.refresh();this.select('roadmap');this.notice.textContent='최신 상태입니다. 원하는 상태를 다시 선택하세요.';});this.notice.append(retry);}throw error;}}
  async review(body){await this.mutate('/api/learning/review',body);this.select('review');this.notice.textContent='복습과 다음 날짜를 저장했습니다.';}
}
