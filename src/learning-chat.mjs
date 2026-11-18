import {el,button,busy} from './learning-dom.mjs';
import {formatTime} from './learning-model.mjs';
import {CHAT_AUTOPAUSE_KEY,CHAT_MODEL_KEY,chatAutoPause,textSegments,composerAction,lectureThreads,threadLabel} from './learning-chat-model.mjs';

const STARTERS=['방금 부분을 쉬운 비유로 설명해 줘','지금 코드가 한 줄씩 무슨 일을 하는지 알려 줘','이 개념을 확인할 작은 문제 하나 내 줘'];
const STATUS={stopped:'멈춤 · 받은 부분까지',interrupted:'중간에 끊김'};
/** 질문하기: a side chat that answers while the lecture plays, kept per lecture in the learning state. */
export class ChatPanel{
  constructor(root,{api,stream,capture,time,getState,applyThread,applyState,seek,pause,isPlaying,openRecords,openSettings}){
    Object.assign(this,{root,api,stream,capture,time,getState,applyThread,applyState,seek,pause,isPlaying,openRecords,openSettings});
    this.threadId=null;this.lectureId=undefined;this.streaming=null;this.models=null;this.build();
  }
  build(){
    const root=this.root;root.classList.add('learning-chat');
    const head=el('div','chat-head');
    this.threadSelect=el('select');this.threadSelect.setAttribute('aria-label','이 강의의 대화');this.threadSelect.addEventListener('change',()=>{this.threadId=this.threadSelect.value||null;this.notice.textContent='';this.renderLog();});
    this.newButton=button('새 대화',()=>{this.threadId=null;this.startNew=true;this.notice.textContent='';this.render();this.input.focus();});
    head.append(this.threadSelect,this.newButton);
    const options=el('div','chat-options');
    this.modelSelect=el('select');this.modelSelect.setAttribute('aria-label','답변 모델');this.modelSelect.append(new Option('모델 불러오는 중…',''));
    this.modelSelect.addEventListener('change',()=>{try{localStorage.setItem(CHAT_MODEL_KEY,this.modelSelect.value);}catch{}});
    const pause=el('label','chat-toggle');this.autoPause=el('input');this.autoPause.type='checkbox';this.autoPause.checked=chatAutoPause(localStorage);
    this.autoPause.addEventListener('change',()=>{try{localStorage.setItem(CHAT_AUTOPAUSE_KEY,this.autoPause.checked?'on':'off');}catch{}});
    pause.append(this.autoPause,document.createTextNode('보낼 때 영상 멈추기'));options.append(this.modelSelect,pause);
    this.log=el('div','chat-log');this.log.setAttribute('role','log');this.log.setAttribute('aria-label','대화 내용');this.log.tabIndex=0;
    this.notice=el('p','notice chat-notice');this.notice.setAttribute('role','status');
    this.form=el('form','chat-composer');
    this.input=el('textarea');this.input.rows=1;this.input.maxLength=4000;this.input.placeholder='막힌 점을 바로 물어보세요';this.input.setAttribute('aria-label','질문 입력 (Enter 보내기, Shift+Enter 줄바꿈)');
    this.sendButton=button('보내기',null,'primary');this.sendButton.type='submit';
    this.stopButton=button('멈추기',()=>void this.stop(),'chat-stop');this.stopButton.hidden=true;
    this.form.append(this.input,this.sendButton,this.stopButton);
    this.input.addEventListener('keydown',event=>{if(composerAction(event)==='send'){event.preventDefault();void this.send();}});
    this.input.addEventListener('input',()=>this.fit());
    this.form.addEventListener('submit',event=>{event.preventDefault();void this.send();});
    const hint=el('p','muted chat-context','Enter 보내기 · Shift+Enter 줄바꿈 · 함께 보내는 것: 지금 시점 앞뒤 1분 대본, 이 강의의 내 기록, 이 대화');
    root.append(head,options,this.log,this.notice,this.form,hint);
  }
  fit(){this.input.style.height='auto';this.input.style.height=`${Math.min(this.input.scrollHeight+2,160)}px`;}
  open(){this.sync();void this.loadModels();this.input.focus({preventScroll:true});}
  /** A newly opened lecture, or a panel whose threads just loaded, shows the most recent conversation unless the learner chose 새 대화. */
  sync(){const lectureId=this.capture()?.lectureId;if(lectureId!==this.lectureId){this.lectureId=lectureId;this.startNew=false;this.threadId=null;}if(!this.thread()&&!this.startNew&&!this.streaming)this.threadId=this.threads()[0]?.id||null;this.render();}
  threads(){return lectureThreads(this.getState().chats,this.lectureId);}
  thread(){return this.threads().find(row=>row.id===this.threadId)||null;}
  render(){
    const threads=this.threads();
    this.threadSelect.replaceChildren(new Option(threads.length?'새 대화 (보내면 시작)':'첫 대화 (보내면 시작)',''),...threads.map(row=>new Option(threadLabel(row),row.id)));
    this.threadSelect.value=this.thread()?this.threadId:'';
    const busyNow=!!this.streaming;this.threadSelect.disabled=this.newButton.disabled=busyNow;
    this.sendButton.hidden=busyNow;this.stopButton.hidden=!busyNow;
    this.renderLog();
  }
  renderLog(){
    const thread=this.thread(),live=this.streaming&&this.streaming.threadId===this.threadId?this.streaming:null;
    this.log.replaceChildren();this.streamText=null;
    if(!thread&&!live){
      const empty=el('div','chat-empty');
      empty.append(el('p','','영상을 보다 막히면 바로 물어보세요. 지금 장면의 대본과 내 기록을 함께 보내 답을 받습니다. 답은 AI 제안이니 원문과 함께 확인하세요.'));
      const starters=el('div','chat-starters');for(const text of STARTERS)starters.append(button(text,()=>void this.send(text)));empty.append(starters);this.log.append(empty);return;
    }
    for(const message of thread?.messages||[])this.log.append(this.message(message));
    if(live){
      if(!live.started)this.log.append(this.message({role:'user',text:live.question,seconds:live.seconds}));
      const node=this.message({role:'assistant',text:live.text,seconds:live.seconds,model:live.model},true);this.log.append(node);
    }
    this.log.scrollTop=this.log.scrollHeight;
  }
  modelName(id){return [...this.modelSelect.options].find(option=>option.value===id)?.textContent||id;}
  message(message,streaming=false){
    const user=message.role==='user',node=el('article',`chat-message ${user?'chat-user':'chat-assistant'}`),meta=el('div','chat-meta');
    meta.append(el('strong','',user?'나':'AI 튜터 · 제안'),this.chip(message.seconds,`질문한 시점 ${formatTime(message.seconds)}로 이동`));
    if(!user&&message.model)meta.append(el('span','',this.modelName(message.model)));
    if(STATUS[message.status])meta.append(el('span','chat-status-tag',STATUS[message.status]));
    const text=el('div','chat-text');this.fill(text,message.text);
    if(streaming){if(!message.text)text.textContent='답변을 준비하는 중…';this.streamText=text;node.setAttribute('aria-busy','true');}
    node.append(meta,text);
    if(!user&&!streaming){
      const actions=el('div','chat-actions');
      const copy=button('복사',()=>this.copy(message.text));copy.setAttribute('aria-label','답변 복사');actions.append(copy);
      const saved=message.recordId&&this.getState().records.some(row=>row.id===message.recordId);
      if(saved)actions.append(button('✓ 기록에 저장됨 · 열린 질문 보기',()=>this.openRecords()));
      else{const save=button('기록으로 저장',()=>busy(save,()=>this.saveRecord(message)));actions.append(save);}
      node.append(actions);
    }
    return node;
  }
  chip(seconds,label){const chip=button(formatTime(seconds),()=>this.seek(seconds),'chat-time');chip.setAttribute('aria-label',label);chip.title=label;return chip;}
  fill(node,text){node.replaceChildren(...textSegments(text).map(part=>part.label?this.chip(part.seconds,`${part.label}로 이동`):document.createTextNode(part.text)));}
  async loadModels(){
    if(this.models)return;
    try{
      const {models}=await this.api('/api/learning/chat/models');this.models=models;
      let saved='';try{saved=localStorage.getItem(CHAT_MODEL_KEY)||localStorage.getItem('mit6100-ai-model')||'';}catch{}
      this.modelSelect.replaceChildren(...models.map(row=>new Option(row.name,row.id)));if(models.some(row=>row.id===saved))this.modelSelect.value=saved;
      if(!models.length)this.notice.textContent='이 계정에서 사용할 수 있는 모델이 없습니다.';
      this.renderLog();
    }catch(error){
      this.modelSelect.replaceChildren(new Option('ChatGPT 연결 필요',''));this.notice.textContent=error.message;
      if(error.code==='not_connected'||error.code==='plan_disabled')this.notice.append(' ',button('연결 설정 열기',()=>this.openSettings()));
      else this.notice.append(' ',button('다시 불러오기',()=>{this.notice.textContent='';void this.loadModels();}));
    }
  }
  async send(text=this.input.value){
    const question=text.trim(),context=this.capture();
    if(!question||this.streaming)return;
    if(!context){this.notice.textContent='강의를 먼저 열어 주세요.';return;}
    if(!this.modelSelect.value){this.notice.textContent='ChatGPT에 연결하고 답변 모델을 고른 뒤 질문하세요. 적은 질문은 그대로 있습니다.';await this.loadModels();return;}
    const seconds=this.time(),paused=this.autoPause.checked&&this.isPlaying();if(paused)this.pause();
    const controller=new AbortController();
    this.streaming={threadId:this.threadId,question,seconds,model:this.modelSelect.value,text:'',started:false,controller};
    if(text===this.input.value)this.input.value='';this.fit();
    this.notice.textContent=paused?`영상을 ${formatTime(seconds)}에서 멈췄습니다. 답을 읽고 다시 재생하세요.`:'';this.render();
    try{await this.stream('/api/learning/chat',{threadId:this.threadId,lectureId:context.lectureId,seconds,text:question,model:this.modelSelect.value},{signal:controller.signal,onEvent:(event,data)=>this.onEvent(event,data)});}
    catch(error){
      const started=this.streaming?.started;
      this.notice.textContent=controller.signal.aborted?'답변을 멈췄습니다.':error.message;
      // A question the server never stored goes back into the box instead of being lost.
      if(!started&&!this.input.value)this.input.value=question;this.fit();
      if(error.code==='not_connected'||error.code==='plan_disabled')this.notice.append(' ',button('연결 설정 열기',()=>this.openSettings()));
    }finally{this.streaming=null;this.render();}
  }
  onEvent(event,data){
    const live=this.streaming;if(!live)return;
    if(event==='start'){this.applyThread(data.thread,data.revision);live.started=true;live.threadId=data.thread.id;if(this.lectureId===data.thread.lectureId){this.threadId=data.thread.id;this.startNew=false;}this.render();}
    if(event==='delta'){
      live.text+=data.text;if(!this.streamText)return;
      const stick=this.log.scrollHeight-this.log.scrollTop-this.log.clientHeight<80;this.fill(this.streamText,live.text);if(stick)this.log.scrollTop=this.log.scrollHeight;
    }
    if(event==='done'){this.applyThread(data.thread,data.revision);if(data.status==='stopped')this.notice.textContent='답변을 멈췄습니다. 받은 부분까지 저장했습니다.';}
    if(event==='error'){if(data.thread)this.applyThread(data.thread,data.revision);this.notice.textContent=data.message;}
  }
  async stop(){
    const live=this.streaming;if(!live)return;
    if(!live.started){live.controller.abort();return;}
    try{await this.api('/api/learning/chat/stop',{threadId:live.threadId});}catch(error){this.notice.textContent=error.message;live.controller.abort();}
  }
  async saveRecord(message){
    try{
      const {state}=await this.api('/api/learning/chat/record',{threadId:this.threadId,messageId:message.id});this.applyState(state);this.renderLog();
      this.notice.textContent='질문과 답변을 학습 기록으로 저장했습니다. 열린 질문과 내일 복습에 나타납니다.';this.notice.append(' ',button('열린 질문 보기',()=>this.openRecords()));
    }catch(error){this.notice.textContent=error.message;}
  }
  async copy(text){try{await navigator.clipboard.writeText(text);this.notice.textContent='답변을 복사했습니다.';}catch{this.notice.textContent='복사하지 못했습니다. 답변을 드래그해 직접 복사하세요.';}}
}
