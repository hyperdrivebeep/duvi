import {el,button,busy} from './learning-dom.mjs';
import {formatTime,HELP,apiErrorMessage} from './learning-model.mjs';
import {CHAT_AUTOPAUSE_KEY,CHAT_MODEL_KEY,CHAT_CONTEXT_KEY,chatAutoPause,chatContextChoice,textSegments,composerAction,lectureThreads,typingAnchor,questionSeconds,contextRange,lectureNoteCount} from './learning-chat-model.mjs';
import {lectureStream,filterStream,streamCounts,nowIndex,unanswered} from './learning-stream-model.mjs';

const STARTERS=['방금 부분을 쉬운 비유로 설명해 줘','지금 코드가 한 줄씩 무슨 일을 하는지 알려 줘','이 개념을 확인할 작은 문제 하나 내 줘'];
const STATUS={stopped:'멈춤 · 받은 부분까지',interrupted:'중간에 끊김'};
const DRAFTS_KEY='duvi-explanation-drafts-v1';
const dayText=value=>new Date(value).toLocaleDateString('ko-KR',{month:'long',day:'numeric'});
/**
 * 질문하기 · 이 강의 · 시간순: this lecture's questions, AI answers and the learner's own explanations in lecture-time
 * order, with a "지금" line, a composer that keeps the time the learner started typing, and answers streamed live.
 */
export class ChatPanel{
  constructor(root,{api,stream,capture,time,getState,applyThread,seek,pause,isPlaying,openDetails=()=>{},openSettings,openTranscript,cueAt,saveExplanation,latestExplanation}){
    Object.assign(this,{root,api,stream,capture,time,getState,applyThread,seek,pause,isPlaying,openDetails,openSettings,openTranscript,cueAt,saveExplanation,latestExplanation});
    this.threadId=null;this.lectureId=undefined;this.streaming=null;this.models=null;this.filter='all';this.anchor=null;
    this.nodes=new Map();this.editing=new Set();this.clock='';this.questions=new Map();
    try{this.drafts=JSON.parse(localStorage.getItem(DRAFTS_KEY)||'{}')||{};}catch{this.drafts={};}
    this.build();
  }
  build(){
    const root=this.root;root.classList.add('learning-chat');
    const head=el('div','chat-head');
    this.filters=el('div','chat-filters');this.filters.setAttribute('role','group');this.filters.setAttribute('aria-label','흐름 보기');
    this.allButton=button('전체',()=>this.setFilter('all'));this.openButton=button('열린 질문',()=>this.setFilter('open'));
    this.filters.append(this.allButton,this.openButton,button('대본',()=>this.openTranscript()));
    head.append(el('h3','chat-title','이 강의 · 시간순'),this.filters);
    const options=el('div','chat-options');
    this.modelSelect=el('select');this.modelSelect.setAttribute('aria-label','답변 모델');this.modelSelect.append(new Option('모델 불러오는 중…',''));
    this.modelSelect.addEventListener('change',()=>{try{localStorage.setItem(CHAT_MODEL_KEY,this.modelSelect.value);}catch{}});
    const pause=el('label','chat-toggle');this.autoPause=el('input');this.autoPause.type='checkbox';this.autoPause.checked=chatAutoPause(localStorage);
    this.autoPause.addEventListener('change',()=>{try{localStorage.setItem(CHAT_AUTOPAUSE_KEY,this.autoPause.checked?'on':'off');}catch{}});
    pause.append(this.autoPause,document.createTextNode('보낼 때 멈추기'));
    this.newButton=button('새 대화',()=>{this.startNew=!this.startNew;this.threadId=this.startNew?null:this.threads()[0]?.id||null;this.notice.textContent='';this.render();this.input.focus();},'chat-new');
    this.newButton.title='다음 질문을 이전 대화와 따로 시작합니다';
    options.append(this.modelSelect,pause,this.newButton);
    this.log=el('div','chat-log');this.log.setAttribute('role','log');this.log.setAttribute('aria-label','이 강의의 질문과 답, 내 설명');this.log.tabIndex=0;
    this.log.addEventListener('scroll',()=>this.hideCite(),{passive:true});
    this.cite=el('div','cite-preview');this.cite.id='chatCitePreview';this.cite.setAttribute('role','tooltip');this.cite.hidden=true;
    this.notice=el('p','notice chat-notice');this.notice.setAttribute('role','status');
    this.form=el('form','chat-composer');
    this.anchorChip=el('div','chat-anchor');this.anchorTime=el('strong');
    const detach=button('×',()=>{this.anchor='detached';this.renderComposer();this.input.focus();},'chat-anchor-detach');detach.setAttribute('aria-label','질문 시각 떼기 · 보낼 때의 재생 시점으로 보냄');detach.title='시각 떼기';
    this.anchorChip.append(this.anchorTime,el('span','',' 에서 질문 중 · 쓰기 시작한 장면'),detach);
    this.input=el('textarea');this.input.rows=2;this.input.maxLength=4000;this.input.placeholder='막힌 점을 바로 물어보세요';this.input.setAttribute('aria-label','질문 입력 (Enter 보내기, Shift+Enter 줄바꿈)');
    this.sendButton=button('보내기',null,'primary');this.sendButton.type='submit';
    this.stopButton=button('멈추기',()=>void this.stop(),'chat-stop');this.stopButton.hidden=true;
    this.form.append(this.anchorChip,this.input,this.sendButton,this.stopButton);
    this.input.addEventListener('keydown',event=>{if(composerAction(event)==='send'){event.preventDefault();void this.send();}});
    // An edited question is a new question; only an unchanged one sent again keeps its id (and so its record).
    this.input.addEventListener('input',()=>{this.fit();this.questionId=null;this.anchor=typingAnchor(this.anchor,this.input.value,this.time());this.renderComposer();});
    this.form.addEventListener('submit',event=>{event.preventDefault();void this.send();});
    const sendContext=el('div','chat-send-context');sendContext.setAttribute('role','group');sendContext.setAttribute('aria-label','보낼 자료');
    const choice=chatContextChoice(localStorage),check=(name,checked)=>{const label=el('label'),input=el('input'),text=el('span');input.type='checkbox';input.checked=checked;input.addEventListener('change',()=>this.saveContextChoice());label.append(input,text);this[name]={input,text};return label;};
    sendContext.append(el('span','chat-send-title','보낼 자료'),check('sendTranscript',choice.transcript),check('sendNotes',choice.notes));
    const hint=el('p','muted chat-context','보내면 이 시각의 질문 기록으로 자동 저장됩니다. AI 답은 제안이며 내 ChatGPT 연결로 받습니다. Enter 보내기 · Shift+Enter 줄바꿈');
    root.append(head,options,this.log,this.cite,this.notice,this.form,sendContext,hint);
  }
  fit(){this.input.style.height='auto';this.input.style.height=`${Math.min(this.input.scrollHeight+2,160)}px`;}
  saveContextChoice(){try{localStorage.setItem(CHAT_CONTEXT_KEY,JSON.stringify({transcript:this.sendTranscript.input.checked,notes:this.sendNotes.input.checked}));}catch{}}
  open(focus=true){this.sync();this.reveal(this.nodes.get('now')?.node,'center');void this.loadModels();if(focus)this.input.focus({preventScroll:true});}
  /** A newly opened lecture, or a panel whose threads just loaded, continues the most recent conversation unless the learner chose 새 대화. */
  sync(){
    const lectureId=this.capture()?.lectureId;
    if(lectureId!==this.lectureId){
      if(this.input.value)this.questions.set(this.lectureId,{text:this.input.value,anchor:this.anchor,unsent:this.unsent,questionId:this.questionId});
      else this.questions.delete(this.lectureId);
      const draft=this.questions.get(lectureId);
      this.lectureId=lectureId;this.input.value=draft?.text||'';this.anchor=draft?.anchor??null;
      this.unsent=!!draft?.unsent;this.questionId=draft?.questionId||null;this.fit();this.startNew=false;this.threadId=null;this.editing.clear();this.hideCite();
      this.notice.textContent=this.unsent?'전송되지 않음 · 질문을 확인하고 다시 보내세요.':'';
    }
    if(!this.thread()&&!this.startNew&&!this.streaming)this.threadId=this.threads()[0]?.id||null;
    this.render();
  }
  threads(){return lectureThreads(this.getState().chats,this.lectureId);}
  thread(){return this.threads().find(row=>row.id===this.threadId)||null;}
  setFilter(filter){this.filter=filter;this.renderLog();}
  render(){
    const busyNow=!!this.streaming;this.newButton.disabled=busyNow;this.newButton.setAttribute('aria-pressed',String(!!this.startNew));
    this.sendButton.hidden=busyNow;this.stopButton.hidden=!busyNow;
    this.renderLog();this.renderComposer();
  }
  /** Called as the video plays: moves the 지금 line and the transcript span at most once a second. */
  tick(seconds){const clock=formatTime(seconds);if(clock===this.clock)return;this.clock=clock;if(this.lectureId!==undefined){this.renderLog();this.renderComposer();}}
  renderComposer(){
    const seconds=questionSeconds(this.anchor,this.time());
    this.anchorChip.hidden=typeof this.anchor!=='number';this.anchorTime.textContent=formatTime(seconds);
    this.sendTranscript.text.textContent=`${contextRange(seconds)} 대본`;
    const notes=lectureNoteCount(this.getState().records,this.lectureId,this.getState().chats);
    this.sendNotes.text.textContent=`이 강의 내 노트 ${notes}`;this.sendNotes.input.disabled=!notes;
  }
  items(){
    const items=this.lectureId===undefined?[]:lectureStream(this.getState(),this.lectureId),live=this.streaming;
    if(live&&String(live.lectureId)===String(this.lectureId)){
      const own=(live.started||live.retry)&&items.find(item=>item.question?.id===live.messageId);
      if(own)own.live=live;
      else if(!live.started)items.push({kind:'qa',key:'live',seconds:live.seconds,question:{role:'user',text:live.question,seconds:live.seconds},answers:[],open:true,explained:false,live});
      items.sort((a,b)=>a.seconds-b.seconds);
    }
    return items;
  }
  renderLog(){
    const items=this.items(),shown=filterStream(items,this.filter),counts=streamCounts(items);
    this.allButton.textContent=`전체 ${counts.all}`;this.openButton.textContent=`열린 질문 ${counts.open}`;
    this.allButton.setAttribute('aria-pressed',String(this.filter==='all'));this.openButton.setAttribute('aria-pressed',String(this.filter==='open'));
    if(!items.length||!shown.length){
      const key=items.length?'empty-filter':'empty-lecture';this.reconcile([{key,sig:key,build:()=>this.empty(!items.length)}]);return;
    }
    const entries=[],now=nowIndex(shown,this.time()),nowEntry={key:'now',sig:this.clock,build:()=>{const line=el('div','chat-now');line.append(el('span','',`지금 ${formatTime(this.time())}`));return line;}};
    shown.forEach((item,index)=>{
      if(index===now)entries.push(nowEntry);
      entries.push({key:item.key,sig:this.groupSig(item),build:()=>this.group(item)});
      if(!item.live&&(item.kind==='record'||item.answers.length||item.record))entries.push({key:`${item.key}:mine`,sig:this.editing.has(item.key)?'edit':JSON.stringify([item.record?.explanation,item.record?.reviewDueAt,item.record?.id,unanswered(item)]),build:()=>this.mine(item)});
    });
    if(now>=shown.length)entries.push(nowEntry);
    this.reconcile(entries);
  }
  /** Keeps unchanged nodes in place so an explanation being written is neither rebuilt nor moved when an answer streams in. */
  reconcile(entries){
    const keys=new Set(entries.map(entry=>entry.key)),next=new Map();
    for(const [key,{node}] of this.nodes)if(!keys.has(key))node.remove();
    let ref=this.log.firstChild;
    for(const entry of entries){
      let current=this.nodes.get(entry.key);
      if(!current||current.sig!==entry.sig){
        const node=entry.build();
        if(current){if(current.node===ref)ref=ref.nextSibling;current.node.remove();}
        current={node,sig:entry.sig};
      }
      next.set(entry.key,current);
      if(current.node===ref)ref=ref.nextSibling;else this.log.insertBefore(current.node,ref);
    }
    this.nodes=next;
  }
  empty(none){
    const empty=el('div','chat-empty');
    if(!none){empty.append(el('p','','열린 질문이 없습니다. 남긴 질문마다 내 설명을 적었습니다.'));return empty;}
    empty.append(el('p','','영상을 보다 막히면 바로 물어보세요. 지금 장면의 대본과 내 기록을 함께 보내 답을 받습니다. 답은 AI 제안이니 원문과 함께 확인하세요.'));
    const starters=el('div','chat-starters');for(const text of STARTERS)starters.append(button(text,()=>void this.send(text)));empty.append(starters);return empty;
  }
  groupSig(item){
    if(item.live)return `live:${item.key}`;
    return JSON.stringify([item.kind,item.question?.text,item.question?.recordId,item.answers?.map(row=>[row.id,row.text,row.status,row.recordId,row.model]),item.record?.id,item.record?.question,item.explained,item.open,this.models?.length]);
  }
  group(item){
    const node=el('div','chat-group');
    if(item.kind==='record'){
      const record=item.record,card=el('article','chat-record'),meta=el('div','chat-meta');
      meta.append(this.chip(item.seconds,`기록한 시점 ${formatTime(item.seconds)}로 이동`),el('span',item.explained?'chat-state done':'chat-state',item.explained?'내 설명 있음':item.open?'열린 질문 · 내 설명 아직 없음':'질문만 저장 · 복습 기록 있음'));
      card.append(meta,el('p','chat-record-question',record.question||record.title||'내 설명'));node.append(card);return node;
    }
    if(!item.explained&&item.open&&!item.live){const state=el('div','chat-meta');state.append(el('span','chat-state','열린 질문 · 내 설명 아직 없음'));node.append(state);}
    node.append(this.message(item.question));
    for(const answer of item.answers)node.append(this.message(answer));
    if(item.live){const live=item.live;node.append(this.message({role:'assistant',text:live.text,seconds:live.seconds,model:live.model},true));}
    return node;
  }
  modelName(id){return [...this.modelSelect.options].find(option=>option.value===id)?.textContent||id;}
  message(message,streaming=false){
    const user=message.role==='user',node=el('article',`chat-message ${user?'chat-user':'chat-assistant'}`),meta=el('div','chat-meta');
    meta.append(this.chip(message.seconds,`질문한 시점 ${formatTime(message.seconds)}로 이동`),el('strong','',user?'나':'AI 제안'));
    if(user&&message.recordId&&this.getState().records.some(row=>row.id===message.recordId))meta.append(el('span','chat-recorded','자동 기록됨'));
    if(!user&&message.model)meta.append(el('span','',this.modelName(message.model)));
    if(STATUS[message.status])meta.append(el('span','chat-status-tag',STATUS[message.status]));
    const text=el('div','chat-text');this.fill(text,message.text,!user);
    if(streaming){if(!message.text)text.textContent='답변을 준비하는 중…';this.streamText=text;node.setAttribute('aria-busy','true');}
    node.append(meta,text);
    if(!user&&!streaming){
      const actions=el('div','chat-actions');
      const copy=button('복사',()=>this.copy(message.text),'chat-link');copy.setAttribute('aria-label','답변 복사');actions.append(copy);
      node.append(actions);
    }
    return node;
  }
  /**
   * 내 설명: written right under its question and answer, saved as the learner's own explanation apart from the AI answer.
   * 자세히 opens the full record (evidence, history, Markdown, tutor); 다시 묻기 resends a question that has no complete answer.
   */
  mine(item){
    const node=el('div','chat-mine'),record=item.record,at=formatTime(item.seconds);
    if(!this.editing.has(item.key)){
      const links=el('div','chat-mine-links');
      if(!item.explained){const write=button('내 설명 쓰기',()=>this.edit(item),'chat-link');write.setAttribute('aria-label',`내 설명 쓰기 · ${at} 질문`);links.append(write);}
      else{
        const view=el('div','chat-mine-view');
        view.append(el('p','chat-mine-label',`내 설명${record.reviewDueAt?` · 복습 ${dayText(record.reviewDueAt)}`:''}`),el('p','chat-mine-text',record.explanation));node.append(view);
        const fix=button('고치기',()=>this.edit(item),'chat-link');fix.setAttribute('aria-label',`내 설명 고치기 · ${at} 질문`);links.append(fix);
      }
      if(record){const details=button('자세히',()=>this.openDetails(record),'chat-link');details.setAttribute('aria-label',`자세히 · ${at} 질문 기록 (근거·이력·Markdown)`);links.append(details);}
      if(unanswered(item)){const retry=button('다시 묻기',()=>void this.send(item.question.text,{id:item.question.id,threadId:item.threadId,seconds:item.seconds}),'chat-link');retry.setAttribute('aria-label',`다시 묻기 · ${at} 질문`);links.append(retry);}
      node.append(links);return node;
    }
    const form=el('form','chat-mine-edit'),id=`mine-${item.key.replace(/[^A-Za-z0-9_-]/g,'-')}`,label=el('label','chat-mine-label');
    label.htmlFor=id;label.append('내 설명 ',el('span','muted','AI 답과 따로 저장돼요'));
    const draft=this.drafts[item.key],text=el('textarea');text.id=id;text.rows=3;text.maxLength=12000;text.value=(typeof draft==='string'?draft:draft?.text)??record?.explanation??'';text.placeholder='내 말로 한두 문장';
    let base=record,revision=draft===undefined||typeof draft==='string'?record?.revision:draft.revision;
    const help=el('select');help.setAttribute('aria-label','이 설명의 AI 도움 정도');for(const [value,name] of Object.entries(HELP))help.append(new Option(name,value));help.value=draft?.help||(record?.explanation?record.help:item.answers?.length?'full':record?.help||'none');
    const stash=()=>{this.drafts[item.key]={text:text.value,help:help.value,revision:revision??1};this.saveDrafts();};
    text.addEventListener('input',stash);help.addEventListener('change',stash);
    const notice=el('p','notice chat-mine-notice');notice.setAttribute('role','status');
    const row=el('div','chat-mine-row'),save=button('저장',null,'primary');save.type='submit';
    row.append(help,el('span','muted',record?.reviewDueAt?`복습 ${dayText(record.reviewDueAt)}`:'저장하면 내일 복습에 나와요'),button('닫기',()=>{this.editing.delete(item.key);this.renderLog();this.focusMine(item.key);}),save);
    form.append(label,text,row,notice);
    form.addEventListener('submit',event=>{event.preventDefault();if(!text.value.trim()){notice.textContent='한 문장이라도 내 말로 적어 주세요.';return;}
      void busy(save,async()=>{text.readOnly=true;help.disabled=true;try{await this.saveExplanation({...item,record:base},text.value,help.value,revision);delete this.drafts[item.key];this.saveDrafts();this.editing.delete(item.key);this.renderLog();this.focusMine(item.key);this.notice.textContent='내 설명을 저장했습니다. AI 답과 따로 보관하고 복습에 나옵니다.';}
        catch(error){notice.textContent=apiErrorMessage(error);
          if(error.status===409){const compare=button('최신 저장본 확인',async()=>{try{
            const latest=await this.latestExplanation(item.key);if(!latest)throw new Error('기록을 찾을 수 없습니다. 초안은 유지했습니다.');
            notice.replaceChildren(document.createTextNode(`최신 설명: ${latest.explanation||'(아직 없음)'} `),button('비교했어요 · 이 초안으로 저장 준비',()=>{base=latest;revision=latest.revision;stash();notice.textContent='초안을 확인한 뒤 저장하세요.';}));
          }catch(err){notice.textContent=err.message;}});notice.append(' ',compare);}
        }finally{text.readOnly=false;help.disabled=false;}});});
    node.append(form);return node;
  }
  edit(item){this.editing.add(item.key);this.renderLog();const text=this.nodes.get(`${item.key}:mine`)?.node.querySelector('textarea');if(text){this.reveal(text.closest('.chat-mine'),'nearest');text.focus({preventScroll:true});}}
  focusMine(key){this.nodes.get(`${key}:mine`)?.node.querySelector('button')?.focus({preventScroll:true});}
  saveDrafts(){try{localStorage.setItem(DRAFTS_KEY,JSON.stringify(this.drafts));}catch{}}
  chip(seconds,label){const chip=button(formatTime(seconds),()=>this.seek(seconds),'chat-time');chip.setAttribute('aria-label',label);chip.title=label;return chip;}
  /** Time references inside an AI answer preview that moment's English and Korean sentence on hover or focus. */
  fill(node,text,cite=false){
    node.replaceChildren(...textSegments(text).map(part=>{
      if(!part.label)return document.createTextNode(part.text);
      const chip=this.chip(part.seconds,`${part.label}로 이동`);
      if(cite){chip.removeAttribute('title');const show=()=>this.showCite(chip,part.seconds),hide=()=>this.hideCite(chip);chip.addEventListener('pointerenter',show);chip.addEventListener('focus',show);chip.addEventListener('pointerleave',hide);chip.addEventListener('blur',hide);chip.addEventListener('keydown',event=>{if(event.key==='Escape'&&!this.cite.hidden){event.stopPropagation();hide();}});}
      return chip;
    }));
  }
  showCite(chip,seconds){
    const cue=this.cueAt(seconds),card=this.cite;
    const head=el('p','cite-head',`${formatTime(seconds)} · 강의 원문`),en=el('p','cite-en',cue?.en||'이 시각에는 영어 자막이 없습니다.');en.lang='en';
    card.replaceChildren(head,en,el('p','cite-ko',cue?.ko||'이 문장의 한국어 번역은 아직 없습니다.'),el('p','cite-hint','눌러서 이 장면으로 이동'));
    card.hidden=false;chip.setAttribute('aria-describedby',card.id);chip.classList.add('citing');this.citing=chip;
    const box=this.root.getBoundingClientRect(),at=chip.getBoundingClientRect(),height=card.offsetHeight;
    let top=at.bottom-box.top+6;if(top+height>this.root.clientHeight-8)top=Math.max(8,at.top-box.top-height-6);
    card.style.top=`${top}px`;
  }
  hideCite(chip=this.citing){if(!chip||chip!==this.citing)return;this.cite.hidden=true;chip.removeAttribute('aria-describedby');chip.classList.remove('citing');this.citing=null;}
  /** Scrolls only the log, never the page or the fullscreen stage. */
  reveal(node,align='nearest'){
    if(!node||!this.log.contains(node))return;
    const box=this.log.getBoundingClientRect(),at=node.getBoundingClientRect();
    if(align==='center')this.log.scrollTop+=at.top-box.top-(box.height-at.height)/2;
    else if(at.bottom>box.bottom)this.log.scrollTop+=Math.min(at.bottom-box.bottom,at.top-box.top);
    else if(at.top<box.top)this.log.scrollTop-=box.top-at.top;
  }
  writing(){const active=document.activeElement;return this.log.contains(active)&&active.matches('textarea');}
  liveNode(){const live=this.streaming;if(!live)return null;const item=this.items().find(row=>row.live===live);return item&&this.nodes.get(item.key)?.node;}
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
  /** retry: {id, threadId, seconds} of a stored question to ask again; the server then reuses that question and its record. */
  async send(text=this.input.value,retry=null){
    const question=text.trim(),context=this.capture();
    if(!question||this.streaming)return;
    if(!context||context.lectureId!==this.lectureId){this.notice.textContent='강의가 열리면 다시 보내 주세요.';return;}
    if(!this.modelSelect.value){this.notice.textContent='ChatGPT에 연결하고 답변 모델을 고른 뒤 질문하세요. 적은 질문은 그대로 있습니다.';await this.loadModels();return;}
    const fromBox=!retry&&text===this.input.value,seconds=retry?retry.seconds:questionSeconds(fromBox?this.anchor:null,this.time()),paused=this.autoPause.checked&&this.isPlaying();if(paused)this.pause();
    const controller=new AbortController(),withTranscript=this.sendTranscript.input.checked,withNotes=this.sendNotes.input.checked&&!this.sendNotes.input.disabled;
    // The id is kept while a question waits in the box after a failed send, so sending it again cannot record it twice.
    const questionId=retry?.id||(fromBox&&this.questionId)||crypto.randomUUID(),threadId=retry?retry.threadId:this.threadId;
    this.streaming={threadId,lectureId:context.lectureId,question,seconds,model:this.modelSelect.value,text:'',started:false,retry:!!retry,messageId:questionId,controller};
    if(fromBox){this.input.value='';this.anchor=null;this.unsent=false;this.questionId=null;}this.fit();
    this.notice.textContent=paused?`영상을 ${formatTime(this.time())}에서 멈췄습니다. 답을 읽고 다시 재생하세요.`:'';this.render();this.reveal(this.liveNode());
    try{await this.stream('/api/learning/chat',{threadId,questionId,lectureId:context.lectureId,seconds,text:question,model:this.modelSelect.value,transcript:withTranscript,notes:withNotes},{signal:controller.signal,onEvent:(event,data)=>this.onEvent(event,data)});}
    catch(error){
      const started=this.streaming?.started;
      const here=context.lectureId===this.lectureId;
      if(here)this.notice.textContent=controller.signal.aborted?'답변을 멈췄습니다.':error.message;
      // A question the server never stored goes back into the box, still tied to the time it was asked at.
      if(!started&&!retry){
        if(here&&!this.input.value){this.input.value=question;this.anchor=fromBox?seconds:null;this.unsent=true;this.questionId=questionId;this.fit();}
        if(!here&&!this.questions.has(context.lectureId))this.questions.set(context.lectureId,{text:question,anchor:fromBox?seconds:null,unsent:true,questionId});
      }
      if(here&&(error.code==='not_connected'||error.code==='plan_disabled'))this.notice.append(' ',button('연결 설정 열기',()=>this.openSettings()));
    }finally{this.streaming=null;this.render();}
  }
  onEvent(event,data){
    const live=this.streaming;if(!live)return;
    if(event==='start'){
      this.applyThread(data.thread,data.revision,data.record);live.started=true;live.threadId=data.thread.id;live.messageId=data.questionId;
      if(this.lectureId===data.thread.lectureId){this.threadId=data.thread.id;this.startNew=false;}this.render();if(!this.writing())this.reveal(this.liveNode());
    }
    if(event==='delta'){
      live.text+=data.text;if(!this.streamText?.isConnected)return;
      // Follow the answer only while its end is in view and the learner is not writing an explanation.
      const node=this.liveNode(),box=this.log.getBoundingClientRect(),follow=node&&!this.writing()&&node.getBoundingClientRect().bottom<=box.bottom+80;
      this.fill(this.streamText,live.text,true);if(follow)this.reveal(node);
    }
    if(event==='done'){this.applyThread(data.thread,data.revision,data.record);if(live.lectureId===this.lectureId&&data.status==='stopped')this.notice.textContent='답변을 멈췄습니다. 받은 부분까지 저장했습니다.';}
    if(event==='error'){if(data.thread)this.applyThread(data.thread,data.revision,data.record);if(live.lectureId===this.lectureId)this.notice.textContent=data.message;}
  }
  async stop(){
    const live=this.streaming;if(!live)return;
    if(!live.started){live.controller.abort();return;}
    try{await this.api('/api/learning/chat/stop',{threadId:live.threadId});}catch(error){this.notice.textContent=error.message;live.controller.abort();}
  }

  async copy(text){try{await navigator.clipboard.writeText(text);this.notice.textContent='답변을 복사했습니다.';}catch{this.notice.textContent='복사하지 못했습니다. 답변을 드래그해 직접 복사하세요.';}}
}
