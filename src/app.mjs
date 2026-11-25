import {cueAt} from './core.mjs';
import {MediaPlayer} from './media.mjs';
import {LibraryUI} from './library-ui.mjs';
import {setupStudyView} from './study-view.mjs';
import {setupShell,installLectureKeys} from './app-shell.mjs';
import {LearningUI} from './learning-ui.mjs';
import {makeAnchor,anchorState} from './learning-model.mjs';
import {LearningPlaybackState} from './learning-playback-state.mjs';
import {parseEvents} from './learning-chat-model.mjs';
import {createLearningViewApi} from './quiz-api.mjs';
import {renderQuizScreen,renderLectureQuizTab} from './quiz-view.mjs';
import {renderReviewScreen} from './review-view.mjs';
import {renderSourcesSettings} from './sources-settings.mjs';
import {routeTarget,segmentIdAt} from './app-routes.mjs';
import mapData from './concept-map-data.json';
import {renderConceptMap,renderLectureConcepts} from './concept-map-view.mjs';
import {lectureConcepts,attemptsByConcept,evidenceByConcept} from './concept-map-model.mjs';
import './library.css';
import './study-view.css';
import './learning.css';
import './quiz-view.css';
import './review-view.css';
// After the app's own CSS so the map's button reset wins over the global button rule of the same specificity.
import './concept-map.css';
import {createIcons, Search, Plus, Settings, X, PanelLeft, SkipBack, SkipForward, RotateCcw, Maximize, Minimize, Languages, ChevronRight, ChevronDown, Play} from 'lucide';
const $=id=>document.getElementById(id),video=new MediaPlayer($('video'),$('youtubeWrap'));
createIcons({icons:{Search,Plus,Settings,X,PanelLeft,SkipBack,SkipForward,RotateCcw,Maximize,Minimize,Languages,ChevronRight,ChevronDown,Play},attrs:{'aria-hidden':'true'}});
let follow=true,resumeSaved=0,lectureReady=false,captionLoadingKey='',cacheRequest=0;
function readStored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
const playPositions=readStored('study-positions',{});
const positionState=new LearningPlaybackState(playPositions,localStorage);
let lecture,translator,generation=0,current=-1,working=false,repeat=false,chromeTranslations={},aiTranslations={},nodes=[],savedAt=0,lastTime=0,translationError='';
let session,modelKey='',polling=false,job=null,lastJobVersion='',accountBusy=false,aiNotice='',connectError='';
const fmt=seconds=>{seconds=Math.max(0,Math.floor(seconds||0));return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;};
const chromeMode=()=>$('provider').value==='chrome';
const translated=i=>chromeMode()?chromeTranslations[i]:aiTranslations[i]?.ko;
function setText(id,text){const node=$(id);if(node.textContent!==text)node.textContent=text;}
function chromeCacheKey(){return `mit6100-ko-${lecture.number}${lecture.alignmentRevision?'-'+lecture.alignmentRevision:''}`;}
function save(){if(!lecture)return;try{localStorage.setItem(chromeCacheKey(),JSON.stringify(chromeTranslations));}catch{}savedAt=Date.now();}
async function request(route,body,signal){
  let response;try{response=await fetch(route,body===undefined?{signal}:{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session?.csrf||''},body:JSON.stringify(body),signal});}catch(error){if(signal?.aborted)throw error;throw new Error('플레이어 서버에 연결할 수 없습니다. 시작 파일을 다시 실행하세요.');}
  if(!response.ok){const value=await response.json().catch(()=>({}));const error=new Error(value.error?.message||'요청에 실패했습니다.');error.status=response.status;error.code=value.error?.code;error.details=value.error?.details;throw error;}
  return response;
}
async function api(route,body){return (await request(route,body)).json();}
/** POST answered with server-sent events (the 질문하기 chat); errors before the stream starts arrive as JSON. */
async function streamApi(route,body,{signal,onEvent}){
  const reader=(await request(route,body,signal)).body.getReader(),decoder=new TextDecoder();let buffer='';
  while(true){const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});const parsed=parseEvents(buffer);buffer=parsed.rest;for(const {event,data}of parsed.events)onEvent(event,data);if(done)break;}
}
function progress(){
  if(!lecture)return;const n=Object.keys(chromeMode()?chromeTranslations:aiTranslations).length;
  $('count').textContent=`${n} / ${lecture.cues.length}`;
  $('status').textContent=video.lastError||translationError;
  const ownJob=job&&String(job.number)===String(lecture.number);
  const state=!lecture.cues.length?'영어 자막 준비 필요':ownJob&&job.status==='running'?'번역 중':n===lecture.cues.length?'번역 완료':n?'저장된 번역':'번역 준비';
  setText('translationSummary',`${state} · ${n} / ${lecture.cues.length}문장`);
  setText('translationLecture',lecture.title);
  setText('savedTranslation',`${lecture.cues.length}문장 중 ${n}문장 저장됨`);
  $('captionSource').textContent=chromeMode()?'ENGLISH + CHROME 번역':`ENGLISH + ${aiTranslations[current]?.model||'ChatGPT 저장 자막'}`;
}
async function loadAICache(number=lecture?.number){
  if(!number)return;const version=generation,request=++cacheRequest;const cache=await api(`/api/translations/${number}`);
  if(version!==generation||request!==cacheRequest||String(number)!==String(lecture?.number))return;
  aiTranslations=cache.translations||{};
  if(cache.cues&&cache.alignmentRevision&&lecture.alignmentRevision!==cache.alignmentRevision){
    save();lecture={...lecture,cues:cache.cues,alignmentRevision:cache.alignmentRevision};current=-1;
    chromeTranslations=readStored(chromeCacheKey(),{});renderTranscript();renderCaptionNotice();
  }
  paintTranslations();
}
function paintTranslations(){nodes.forEach((node,i)=>node.querySelector('.ko').textContent=translated(i)||'');update();progress();}
async function load(number){
  savePosition();save();lectureReady=false;positionState.beginLecture();const requestGeneration=++generation;video.pause();lecture=null;current=-1;repeat=false;follow=true;translationError='';$('repeatLabel').textContent='다시';$('repeat').setAttribute('aria-pressed','false');
  $('status').textContent='강의와 자막을 불러오는 중…';$('captionNotice').hidden=true;
  const incoming=await api(`/api/lectures/${encodeURIComponent(number)}`);if(requestGeneration!==generation)return;lecture=incoming;
  try{chromeTranslations=JSON.parse(localStorage.getItem(`mit6100-ko-${number}`)||'{}');}catch{chromeTranslations={};}aiTranslations={};
  $('source').href=lecture.pageUrl;$('source').textContent=lecture.player==='youtube'?'강의 원본 ↗':'MIT 강의 자료 ↗';$('youtube').href=`https://www.youtube.com/watch?v=${lecture.youtubeId}`;
  $('lectureTitle').textContent=lecture.title.split(' | ')[0];$('lectureTitle').title=lecture.title;$('courseLabel').textContent=(lecture.course||'MIT OpenCourseWare')+(lecture.title.includes(' | ')?' · '+lecture.title.split(' | ').slice(1).join(' | '):'');
  $('sourceNote').textContent=lecture.player==='youtube'?'영어: '+(lecture.captionSource==='youtube-auto-captions'?'YouTube 자동 생성 자막':lecture.captionSource==='user-supplied'?'직접 가져온 자막':'YouTube 제공 자막'):'영어: MIT 공식 자막';
  const mediaLoading=video.load(lecture).catch(error=>{if(requestGeneration===generation){video.lastError=error.message;progress();}});
  $('english').textContent=lecture.title;$('korean').textContent='재생하면 두 언어의 자막이 함께 표시됩니다.';
  renderTranscript();renderCaptionNotice();
  localStorage.setItem('mit6100-lecture',String(number));history.replaceState(null,'',`?lecture=${encodeURIComponent(number)}`);renderLibrary();progress();
  if(!lecture.cues.length&&lecture.captionStatus==='pending'&&!lecture.unavailable)void prepareCaptions();
  await loadAICache(number);await mediaLoading;if(requestGeneration!==generation)return;video.playbackRate=Number($('speed').value);const resume=Number(playPositions[number]);if(Number.isFinite(resume)&&resume>0)video.currentTime=Math.min(resume,lecture.duration||lecture.cues.at(-1)?.end||resume);lectureReady=true;update();if(translator&&chromeMode())void translateAhead();renderAI();learningUI.lectureChanged();lectureQuizChanged();
}
function renderTranscript(){
  $('transcript').replaceChildren();nodes=lecture.cues.map((cue,i)=>{const b=document.createElement('button');b.className='cue';const t=document.createElement('time');t.textContent=fmt(cue.start);const e=document.createElement('span');e.className='en';e.textContent=cue.en;const k=document.createElement('span');k.className='ko';k.textContent=translated(i)||'';b.append(t,e,k);b.onclick=()=>seek(i);$('transcript').append(b);return b;});
}
function renderCaptionNotice(){
  const missing=lecture&&!lecture.cues.length,busy=String(lecture?.number)===captionLoadingKey;
  $('captionNotice').hidden=!missing;
  for(const id of ['back','next','repeat','autoPause'])$(id).disabled=!lecture?.cues.length;
  $('retryCaptions').disabled=$('captionFile').disabled=busy||!!lecture?.unavailable;
  if(missing){
    $('captionNoticeText').textContent=lecture.unavailable?'이 영상은 비공개이거나 재생이 제한되어 있습니다. 강의 원본에서 확인하세요.':busy?'영어 자막을 준비하고 있습니다. 영상은 바로 재생할 수 있습니다.':lecture.captionError||'아직 영어 자막이 없습니다. 다시 가져오거나 SRT/VTT 파일을 추가할 수 있습니다.';
    $('english').textContent=busy?'영어 자막을 준비하고 있습니다.':'영어 자막이 아직 없습니다.';
    $('korean').textContent='영어 자막이 준비되면 한국어 번역을 시작할 수 있습니다.';
  }
}
async function prepareCaptions(subtitleText){
  if(!lecture||lecture.cues.length||lecture.unavailable)return;
  const number=String(lecture.number),version=generation;captionLoadingKey=number;renderCaptionNotice();
  try{
    const result=await api('/api/library/captions',{lectureId:number,subtitleText});
    if(version===generation){lecture=result.lecture;current=-1;$('sourceNote').textContent='영어: '+(lecture.captionSource==='youtube-auto-captions'?'YouTube 자동 생성 자막':lecture.captionSource==='user-supplied'?'직접 가져온 자막':'YouTube 제공 자막');renderTranscript();await loadAICache(number);renderAI();update();}
    await refreshLibrary($('lecture').value);
  }catch(error){
    if(version===generation){lecture.captionStatus='failed';lecture.captionError=error.message;}
    await refreshLibrary($('lecture').value).catch(()=>{});
  }finally{if(captionLoadingKey===number)captionLoadingKey='';if(version===generation){renderCaptionNotice();renderAI();}}
}
$('retryCaptions').onclick=()=>prepareCaptions();
$('captionFile').onchange=async()=>{
  const file=$('captionFile').files[0];if(!file)return;
  if(file.size>2*1024*1024){$('captionNoticeText').textContent='자막 파일은 2MB 이하로 넣어주세요.';return;}
  const version=generation,text=await file.text();if(version===generation)await prepareCaptions(text);$('captionFile').value='';
};
function seekTime(seconds){if(!lecture)return;positionState.allowWrite(lecture.number);lastTime=seconds;video.currentTime=seconds;update();}
function seek(i){if(!lecture?.cues.length)return;positionState.allowWrite(lecture.number);i=Math.max(0,Math.min(i,lecture.cues.length-1));lastTime=lecture.cues[i].start+0.02;video.currentTime=lastTime;update();void translateAhead();}
function update(){
  if(!lecture)return;
  learningUI.tick(video.currentTime);
  positionState.observePlayback(lecture.number,video.paused);
  if(!lecture.cues.length){setText('clock',`${fmt(video.currentTime)} / ${fmt(video.duration||lecture.duration)}`);if(Date.now()-resumeSaved>4000)savePosition();return;}
  const t=video.currentTime,next=t<lecture.cues[0].start?0:cueAt(lecture.cues,t),old=current;
  setText('clock',`${fmt(t)} / ${fmt(video.duration||lecture.cues.at(-1).end)}`);
  if(!video.seeking&&current>=0&&t>=lecture.cues[current].end&&t-lastTime<1&&t>=lastTime){
    if(repeat){video.currentTime=lecture.cues[current].start+0.02;lastTime=video.currentTime;return;}
    if($('autoPause').checked&&!video.paused)video.pause();
  }
  lastTime=t;
  if(next!==current){nodes[current]?.classList.remove('active');current=next;if(current>=0){nodes[current].classList.add('active');if(follow&&!$('transcriptPanel').hidden)scrollToCue();}}
  setText('english',current>=0?lecture.cues[current].en:'…');
  setText('korean',current>=0?(translated(current)||(chromeMode()?(translator?'한국어 번역 중…':'재생·자막 정보에서 자막 시작을 눌러주세요.'):'아직 번역하지 않은 구간입니다. 아래 번역 상태에서 번역을 시작하세요.')):'…');
  if(Date.now()-resumeSaved>4000)savePosition();
  if(next!==old){document.querySelectorAll('.caption-row').forEach(row=>row.scrollTop=0);progress();if(chromeMode())void translateAhead();}
}
async function translateAhead(){
  if(working||!translator||!lecture||!chromeMode())return;working=true;
  try{while(translator&&lecture&&chromeMode()){
    const activeGeneration=generation,cues=lecture.cues,focus=Math.max(0,cueAt(cues,video.currentTime));let index=-1;
    for(let k=focus;k<cues.length;k++)if(!chromeTranslations[k]){index=k;break;}
    if(index<0)for(let k=0;k<focus;k++)if(!chromeTranslations[k]){index=k;break;}
    if(index<0)break;
    const result=await translator.translate(cues[index].en);if(activeGeneration!==generation||cues!==lecture?.cues)continue;
    chromeTranslations[index]=result;if(chromeMode()){nodes[index].querySelector('.ko').textContent=result;if(index===current)$('korean').textContent=result;}
    if(Date.now()-savedAt>2000)save();progress();await new Promise(resolve=>setTimeout(resolve,15));
  }}catch(error){translationError=`Chrome 번역이 멈췄습니다: ${error.message}`;}finally{working=false;save();progress();}
}
$('start').onclick=async()=>{
  $('start').disabled=true;translationError='';
  try{
    if(chromeMode()){
      if(!('Translator'in self))throw new Error('이 Chrome에서 기기 내 번역을 사용할 수 없습니다.');
      if(!translator){$('status').textContent='한국어 번역 모델 준비 중…';translator=await Translator.create({sourceLanguage:'en',targetLanguage:'ko',monitor(m){m.addEventListener('downloadprogress',e=>$('status').textContent=`한국어 모델 다운로드 ${Math.round(e.loaded*100)}%`);}});}
      void translateAhead();
    }
    positionState.allowWrite(lecture?.number);await video.play();$('start').textContent='한영 자막 재생';
  }catch(error){$('status').textContent=error.message;}finally{$('start').disabled=false;}
};
function renderAI(){
  const active=session?.accounts?.find(a=>a.id===session.activeId),running=job?.status==='running';
  $('aiControls').hidden=chromeMode();$('account').disabled=running||accountBusy;$('connect').disabled=running||accountBusy;
  $('signout').hidden=!active?.connected;$('signout').disabled=accountBusy;$('refreshModels').disabled=!active?.planEnabled||running||accountBusy;
  $('model').disabled=!active?.planEnabled||running||accountBusy;
  $('sample').disabled=$('translateAll').disabled=!active?.planEnabled||!$('model').value||running||accountBusy||!lecture?.cues.length;
  $('stopJob').hidden=!running;$('aiProgress').hidden=!job;
  if(job){$('aiProgress').max=Math.max(1,job.total);$('aiProgress').value=job.done;}
  const connectionMessage=connectError||session?.authMessage||'';
  $('aiStatus').textContent=aiNotice||(job?`${job.title||job.number} · ${job.message}${job.error?.code?' ('+job.error.code+')':''}`:connectionMessage);
  const accountMessage=connectionMessage||(active?.planEnabled?'ChatGPT 구독 사용 중':active?.connected?'구독 사용 동의가 필요합니다.':'로그인하면 ChatGPT 구독으로 번역할 수 있습니다.');
  if($('accountStatus').textContent!==accountMessage)$('accountStatus').textContent=accountMessage;
  learningUI.chat.setConnectionNotice(connectError||(session?.authConnectFailed?connectionMessage:''));
  $('chromeHelp').hidden=!chromeMode();progress();
}
async function refreshModels(){
  aiNotice='';$('model').replaceChildren(new Option('모델 목록을 불러오는 중…',''));renderAI();
  try{const {models}=await api('/api/models');const selected=localStorage.getItem('mit6100-ai-model');$('model').replaceChildren(...models.map(m=>new Option(m.name,m.id)));if(models.some(m=>m.id===selected))$('model').value=selected;if(!models.length)throw new Error('이 계정에서 사용할 수 있는 모델이 없습니다.');}
  catch(error){$('model').replaceChildren(new Option('모델을 불러오지 못했습니다.',''));aiNotice=error.message;}
  renderAI();
}
async function refreshSession(){
  const incoming=await api('/api/session');session=incoming;job=incoming.job;
  const choice=$('account').value,previousOptions=Array.from($('account').options).map(o=>o.value).join(',');
  const ids=incoming.accounts.map(a=>a.id).join(',');
  if(previousOptions!==','+ids){$('account').replaceChildren(new Option('새 계정 연결',''),...incoming.accounts.map(a=>new Option(`${a.label} · ${a.shortId}`,a.id)));}
  if(incoming.accounts.some(a=>a.id===choice))$('account').value=choice;else $('account').value=incoming.activeId||'';
  const active=incoming.accounts.find(a=>a.id===incoming.activeId),key=`${incoming.activeId}/${active?.connected}/${active?.planEnabled}`;
  if(key!==modelKey){modelKey=key;$('account').value=incoming.activeId||'';if(active?.planEnabled)await refreshModels();else $('model').replaceChildren(new Option('로그인 후 선택',''));}
  if(active?.needsWelcome&&!$('welcome').open)$('welcome').showModal();
  const version=job?`${job.id}/${job.done}/${job.status}`:'';
  if(version!==lastJobVersion){lastJobVersion=version;if(lecture)await loadAICache();}renderAI();
}
$('provider').value=localStorage.getItem('mit6100-provider')==='chrome'?'chrome':'chatgpt';
$('provider').onchange=()=>{localStorage.setItem('mit6100-provider',$('provider').value);paintTranslations();renderAI();void translateAhead();};
$('connect').onclick=async()=>{
  connectError='';accountBusy=true;renderAI();
  try{const {path}=await api('/api/auth/start',{accountId:$('account').value||null});location.assign(path);}
  catch(error){connectError=error.message;accountBusy=false;renderAI();}
};
$('account').onchange=async()=>{
  if(!$('account').value){$('accountStatus').textContent='Continue with ChatGPT로 새 계정을 연결하세요.';return;}
  accountBusy=true;renderAI();try{await api('/api/auth/select',{accountId:$('account').value});await refreshSession();}catch(e){aiNotice=e.message;}finally{accountBusy=false;renderAI();}
};
$('signout').onclick=async()=>{
  accountBusy=true;renderAI();try{const result=await api('/api/auth/signout',{});await refreshSession();aiNotice=result.revoked?'ChatGPT 연결을 해제했습니다. 저장한 번역은 계속 볼 수 있습니다.':'PC의 로그인 정보는 지웠습니다. 서버 측 해제는 확인하지 못했으므로 ChatGPT 설정에서 앱 연결을 해제하세요.';}catch(e){aiNotice=e.message;}finally{accountBusy=false;renderAI();}
};
$('ackWelcome').onclick=async()=>{try{await api('/api/auth/ack',{});$('welcome').close();}catch(e){$('aiStatus').textContent=e.message;}};
$('refreshModels').onclick=refreshModels;$('model').onchange=()=>localStorage.setItem('mit6100-ai-model',$('model').value);
async function startJob(scope){
  accountBusy=true;aiNotice='';renderAI();try{({job}=await api('/api/translate',{lecture:lecture.number,model:$('model').value,scope,start:video.currentTime,sentenceAligned:scope==='lecture'}));renderAI();await refreshSession();}
  catch(error){aiNotice=error.message;}finally{accountBusy=false;renderAI();}
}
$('sample').onclick=()=>startJob('sample');$('translateAll').onclick=()=>startJob('lecture');
$('stopJob').onclick=async()=>{try{({job}=await api('/api/translate/stop',{}));await loadAICache();renderAI();}catch(e){$('aiStatus').textContent=e.message;}};
$('lecture').onchange=()=>load($('lecture').value).catch(e=>$('status').textContent=e.message);
$('pause').onclick=()=>video.pause();
$('speed').onchange=()=>video.playbackRate=Number($('speed').value);$('back').onclick=()=>seek(current>0?current-1:0);$('next').onclick=()=>seek(current>=0?current+1:0);
$('repeat').onclick=()=>{repeat=!repeat;$('repeatLabel').textContent=repeat?'반복 중':'다시';$('repeat').setAttribute('aria-pressed',String(repeat));if(repeat)seek(Math.max(current,0));};
const studyView=setupStudyView({onTranscriptOpen:()=>{follow=true;scrollToCue();},onChatOpen:focus=>learningUI.chat.open(focus),onQuizOpen:()=>showLectureQuiz(),onConceptsOpen:()=>showLectureConcepts()});
// Leaving the lecture pauses it, so 개념 지도·확인 문제·돌아보기 return to the same time; the media instance is only hidden, never rebuilt.
const shell=setupShell({onShow:(view,previous)=>{
  if(previous==='lecture')video.pause();
  if(view==='review')showReview();
  if(view==='map'){showMap(mapTarget||{}).catch(error=>{$('status').textContent=error.message;});mapTarget=null;}
  if(view==='quiz'){showQuiz(quizTarget||{lectureId:lecture?String(lecture.number):'',segmentId:segmentIdAt(video.currentTime)});quizTarget=null;}
  if(view==='lecture')lectureQuizChanged({keep:true});
}});
video.addEventListener('timeupdate',update);video.addEventListener('seeked',()=>{positionState.allowWrite(lecture?.number);lastTime=video.currentTime;update();void translateAhead();});
video.addEventListener('error',()=>{$('status').textContent=video.lastError||'영상을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.';});
window.addEventListener('beforeunload',()=>{save();savePosition();});
async function refreshLibrary(selected){return libraryUI.refresh(selected);}
function savePosition(){if(!lecture||!lectureReady||video.lastError||!Number.isFinite(video.currentTime))return;try{positionState.save(lecture.number,video.currentTime);}catch{}resumeSaved=Date.now();}
function renderLibrary(){libraryUI.render();}
const dialogOpeners=new Map();
function openDialog(id,opener=document.activeElement){dialogOpeners.set(id,opener);$(id).showModal();if(id==='importDialog')$('youtubeUrl').focus();if(id==='settingsDialog')void sourcesUI.reload();}
function closeDialog(id){if($(id).open)$(id).close();}
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDialog(b.dataset.open,b));
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{
  const opener=dialogOpeners.get(d.id),key=opener?.dataset.libraryFocus;
  const target=opener?.isConnected?opener:key?[...document.querySelectorAll('[data-library-focus]')].find(node=>node.dataset.libraryFocus===key):null;
  if(target?.getClientRects().length)target.focus();else $(shell.current()==='lecture'?'openLibrary':'study').focus();
}));
$('translationToSettings').onclick=()=>{closeDialog('translationDialog');openDialog('settingsDialog',document.querySelector('[data-open="translationDialog"]'));};
function scrollToCue(){const node=nodes[current];if(node)$('transcript').scrollTop=node.offsetTop-20;}
$('followTranscript').onclick=()=>{follow=true;scrollToCue();};
for(const event of ['wheel','touchstart','pointerdown'])$('transcript').addEventListener(event,()=>{follow=false;},{passive:true});
$('transcript').addEventListener('keydown',e=>{if(['PageUp','PageDown','Home','End','ArrowUp','ArrowDown'].includes(e.key))follow=false;});
installLectureKeys(window,{active:()=>shell.current()==='lecture'&&!document.querySelector('dialog[open]'),press:id=>$(id).click()});
const libraryUI=new LibraryUI({api,load,openDialog,closeDialog,closeLibrary:()=>shell.closeLibrary(),playPositions,format:fmt});
const learningUI=new LearningUI({api,stream:streamApi,onChatCount:count=>tabLabel('stageChatTab','질문',count),player:{time:()=>video.currentTime,seek:seekTime,pause:()=>video.pause(),isPlaying:()=>!video.paused,duration:()=>video.duration||lecture?.duration||lecture?.cues.at(-1)?.end||0,openSettings:async()=>{await studyView.exit();openDialog('settingsDialog',$('openQuestion'));}},openPanel:name=>studyView.openPanel(name),closeLibrary:()=>shell.closeLibrary(),showView:view=>shell.show(view),getModel:()=>$('model').value,
  onStateChange:(roadmap,progress)=>libraryUI.setLearning({roadmap,progress,onComplete:resource=>learningUI.complete(resource),onPhase:id=>learningUI.openPhase(id)}),
  onRestorePositions:()=>positionState.restore(lecture?.number,video.paused),
  resumeSync:{
    snapshot:()=>{savePosition();return positionState.snapshot();},
    merge:positions=>positionState.merge(positions,lecture?.number,video.paused)
  },
  cueAt:seconds=>{const i=lecture?.cues.length?cueAt(lecture.cues,seconds):-1;return i>=0?{en:lecture.cues[i].en,ko:translated(i)||''}:null;},
  capture:()=>lecture?{lectureId:String(lecture.number),title:lecture.title,anchor:makeAnchor({lecture,seconds:video.currentTime,cue:lecture.cues[Math.max(current,0)],translation:translated(Math.max(current,0))||''})}:null,
  onOpen:async resource=>{shell.show('lecture');await refreshLibrary(resource.lectureId);if(!libraryUI.rows.some(row=>String(row.number)===String(resource.lectureId)))throw new Error('이 강의는 아직 준비되지 않았습니다. “순서대로 강의 폴더 준비”를 먼저 눌러주세요.');$('lecture').value=resource.lectureId;await load(resource.lectureId);if(resource.start!==undefined)video.currentTime=resource.start;},
  onPrepare:()=>refreshLibrary($('lecture').value),
  onJump:async anchor=>{if(!anchor)throw new Error('저장한 원문 연결이 없습니다.');const target=await api(`/api/lectures/${encodeURIComponent(anchor.lectureId)}`),cache=await api(`/api/translations/${encodeURIComponent(anchor.lectureId)}`);const aligned=cache.cues&&cache.alignmentRevision?{...target,cues:cache.cues,alignmentRevision:cache.alignmentRevision}:target,result=anchorState(anchor,aligned);if(result.status!=='matched')return result;shell.show('lecture');if(String(lecture?.number)!==String(anchor.lectureId)){$('lecture').value=anchor.lectureId;await load(anchor.lectureId);}video.currentTime=anchor.seconds;update();return result;}
});
// 확인 문제 and 돌아보기 (quiz-view.mjs, review-view.mjs). Each screen is mounted once and reloaded when shown again;
// their links come back through openTarget. None of this touches the lecture stage, so playback and drafts survive.
const views=createLearningViewApi(api,{open:target=>void openTarget(target).catch(error=>{$('status').textContent=error.message;}),lectureName:id=>learningUI.lectureName(id)});
const mounts={quiz:null,lectureQuiz:null,review:null,map:null},sourcesUI=renderSourcesSettings($('sourcesSettings'),views);
let quizTarget=null;
function tabLabel(id,label,count){const text=count?`${label} ${count}`:label;if($(id).textContent!==text)$(id).textContent=text;}
/** 확인 문제 n on the lecture panel tab; the count is left off until the quiz list has loaded for this lecture. */
async function refreshQuizCount(lectureId){
  let sets;try{({sets}=await views.quizzes());}catch(error){$('status').textContent=error.message;return;}
  const set=sets.find(row=>String(row.lectureId)===lectureId&&!row.error);
  if(String(lecture?.number)===lectureId)tabLabel('stageQuizTab','확인 문제',set?set.items-(set.counts.retired||0):0);
}
function showLectureQuiz(){
  const lectureId=lecture?String(lecture.number):'';if(!lectureId)return;
  if(mounts.lectureQuiz?.lectureId===lectureId)void mounts.lectureQuiz.reload();
  else mounts.lectureQuiz={lectureId,...renderLectureQuizTab($('lectureQuiz'),views,{lectureId})};
}
/** A newly loaded lecture, or a return to the lecture view after solving questions: refresh the tab and its count. */
function lectureQuizChanged({keep=false}={}){
  const lectureId=lecture?String(lecture.number):'';if(!lectureId)return;
  if(!keep)tabLabel('stageQuizTab','확인 문제',0);
  tabLabel('stageConceptTab','개념',lectureConcepts(mapData,lectureId).length);
  void refreshQuizCount(lectureId);if(studyView.selectedTab()==='quiz')showLectureQuiz();if(studyView.selectedTab()==='concepts')showLectureConcepts();
}
function showQuiz({lectureId,segmentId}={}){
  lectureId=String(lectureId||'');
  const select=$('quizLecture'),rows=libraryUI.rows;
  select.replaceChildren(new Option('강의를 고르세요',''),...rows.map(row=>new Option(row.title.split(' | ')[0],String(row.number))));
  select.value=rows.some(row=>String(row.number)===lectureId)?lectureId:'';
  if(!select.value){
    mounts.quiz=null;const head=document.createElement('div'),title=document.createElement('h1'),empty=document.createElement('p');
    head.className='quiz-head';title.textContent='확인 문제';head.append(title,$('quizPicker'));empty.className='quiz-muted';empty.textContent='강의를 고르면 그 강의의 10분 구간마다 확인 문제를 만들고 풀 수 있습니다.';
    const page=document.createElement('div');page.className='quiz-page';page.append(head,empty);const screen=document.createElement('section');screen.className='quiz-screen';screen.append(page);$('quizRoot').replaceChildren(screen);return;
  }
  const mounted=mounts.quiz;
  if(mounted?.lectureId===lectureId&&(!segmentId||mounted.view.segmentId===segmentId)){void mounted.reload();return;}
  mounts.quiz={lectureId,...renderQuizScreen($('quizRoot'),views,{lectureId,segmentId,lecturePicker:$('quizPicker')})};
}
$('quizLecture').onchange=()=>showQuiz({lectureId:$('quizLecture').value,segmentId:String(lecture?.number)===$('quizLecture').value?segmentIdAt(video.currentTime):undefined});
function showReview(){if(mounts.review)void mounts.review.reload();else mounts.review=renderReviewScreen($('reviewRoot'),views);}
// 개념 지도 (concept-map-view.mjs): mounted again each time it is shown, with the latest learning state, quiz attempts and
// repository evidence, keeping the chosen view (그래프/표) and selection. Opening a lecture from it only switches views.
let mapTarget=null;
const currentConcepts=()=>lecture?lectureConcepts(mapData,String(lecture.number)).map(concept=>concept.id):[];
async function showMap({conceptId}={}){
  const previous=mounts.map,loading=document.createElement('p');loading.className='view-empty';loading.textContent='개념 지도를 불러오는 중…';
  if(!previous)$('mapRoot').replaceChildren(loading);
  let state,evidence;
  try{state=await views.learning();}catch(error){loading.textContent='✕ '+error.message;$('mapRoot').replaceChildren(loading);return;}
  // Without readable repositories the 커밋·테스트 column says '아직 증거 없음' rather than failing the whole map.
  try{evidence=evidenceByConcept(mapData,await views.evidence());}catch{evidence=undefined;}
  if(shell.current()!=='map')return;
  mounts.map=renderConceptMap($('mapRoot'),{data:mapData,state:{progress:state.progress,records:state.records,attempts:attemptsByConcept(mapData,state.attempts||[])},evidence,
    focusConceptIds:currentConcepts(),view:previous?.view||'graph',selected:conceptId||previous?.selected||null,
    onOpenLecture:resource=>void openTarget({kind:'lecture',lectureId:resource.lectureId}).catch(error=>{$('status').textContent=error.message;})});
}
async function openMap(conceptId){
  if(document.body.classList.contains('study-focused'))await studyView.exit();
  if(shell.current()==='map')await showMap({conceptId});else{mapTarget={conceptId};shell.show('map');}
}
function showLectureConcepts(){
  if(!lecture)return;
  renderLectureConcepts($('lectureConcepts'),{data:mapData,state:learningUI.state,lectureId:String(lecture.number),onOpenConcept:id=>void openMap(id)});
}
function openSources(target){openDialog('settingsDialog');void sourcesUI.reload(target);$('sourcesHeading').focus();}
/** open(target) from the quiz and review modules. Screens outside the lecture first leave fullscreen, which only holds the stage. */
async function openTarget(target){
  if(['quiz','settings','sources','repo'].includes(target?.kind)&&document.body.classList.contains('study-focused'))await studyView.exit();
  const opened=await routeTarget(target,{
    lecture:async({lectureId,seconds})=>{
      shell.show('lecture');lectureId=String(lectureId);
      if(String(lecture?.number)!==lectureId){await refreshLibrary(lectureId);if($('lecture').value!==lectureId)throw new Error('이 강의를 내 강의에서 찾을 수 없습니다.');await load(lectureId);}
      if(Number.isFinite(seconds))seekTime(seconds);
    },
    quiz:({lectureId,segmentId})=>{if(shell.current()==='quiz')showQuiz({lectureId,segmentId});else{quizTarget={lectureId,segmentId};shell.show('quiz');}},
    records:()=>{learningUI.recordFilter='all';return learningUI.open('records');},
    review:()=>learningUI.open('review'),roadmap:()=>learningUI.open('roadmap'),backup:()=>learningUI.open('backup'),
    settings:()=>openDialog('settingsDialog'),sources:()=>openSources(),repo:target=>openSources(target),
    resource:({resource})=>learningUI.openResource(resource),
    note:()=>learningUI.question(),
  });
  if(!opened)$('status').textContent='이 링크는 열 수 없습니다.';
}
try{
  await refreshSession();const wanted=new URLSearchParams(location.search).get('lecture')||localStorage.getItem('mit6100-lecture')||'1';await refreshLibrary(wanted);await load($('lecture').value);
}catch(error){$('aiStatus').textContent=error.message;$('status').textContent=error.message;}
studyView.openPanel('chat',{focus:false});
void learningUI.init();
setInterval(async()=>{if(polling||accountBusy)return;polling=true;try{await refreshSession();}catch(error){$('aiStatus').textContent=error.message;}finally{polling=false;}},3000);
