import {cueAt} from './core.mjs';
import {MediaPlayer} from './media.mjs';
import './library.css';
import {createIcons, Search, Plus, Settings, X, PanelLeft, SkipBack, SkipForward, RotateCcw, Maximize, Minimize, Languages, ChevronRight, ChevronDown, Play} from 'lucide';
const $=id=>document.getElementById(id),video=new MediaPlayer($('video'),$('youtubeWrap'));
createIcons({icons:{Search,Plus,Settings,X,PanelLeft,SkipBack,SkipForward,RotateCcw,Maximize,Minimize,Languages,ChevronRight,ChevronDown,Play},attrs:{'aria-hidden':'true'}});
let catalogRows=[],follow=true,resumeSaved=0,lectureReady=false;
function readStored(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
const playPositions=readStored('study-positions',{});
let lecture,translator,generation=0,current=-1,working=false,repeat=false,chromeTranslations={},aiTranslations={},nodes=[],savedAt=0,lastTime=0,translationError='';
let session,modelKey='',polling=false,job=null,lastJobVersion='',accountBusy=false,aiNotice='',lastAuthMessage='';
const fmt=seconds=>{seconds=Math.max(0,Math.floor(seconds||0));return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;};
const chromeMode=()=>$('provider').value==='chrome';
const translated=i=>chromeMode()?chromeTranslations[i]:aiTranslations[i]?.ko;
function setText(id,text){const node=$(id);if(node.textContent!==text)node.textContent=text;}
function save(){if(!lecture)return;try{localStorage.setItem(`mit6100-ko-${lecture.number}`,JSON.stringify(chromeTranslations));}catch{}savedAt=Date.now();}
async function api(route,body){
  let response;try{response=await fetch(route,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session?.csrf||''},body:JSON.stringify(body)});}catch{throw new Error('플레이어 서버에 연결할 수 없습니다. 시작 파일을 다시 실행하세요.');}
  const value=await response.json();if(!response.ok)throw new Error(value.error?.message||'요청에 실패했습니다.');return value;
}
function progress(){
  if(!lecture)return;const n=Object.keys(chromeMode()?chromeTranslations:aiTranslations).length;
  $('count').textContent=`${n} / ${lecture.cues.length}`;
  $('status').textContent=video.lastError||translationError;
  const ownJob=job&&String(job.number)===String(lecture.number);
  const state=ownJob&&job.status==='running'?'번역 중':n===lecture.cues.length?'번역 완료':n?'저장된 번역':'번역 준비';
  setText('translationSummary',`${state} · ${n} / ${lecture.cues.length}문장`);
  setText('translationLecture',lecture.title);
  setText('savedTranslation',`${lecture.cues.length}문장 중 ${n}문장 저장됨`);
  $('captionSource').textContent=chromeMode()?'ENGLISH + CHROME 번역':`ENGLISH + ${aiTranslations[current]?.model||'ChatGPT 저장 자막'}`;
}
async function loadAICache(number=lecture?.number){
  if(!number)return;const version=generation;const cache=await api(`/api/translations/${number}`);
  if(version!==generation||String(number)!==String(lecture?.number))return;aiTranslations=cache.translations||{};paintTranslations();
}
function paintTranslations(){nodes.forEach((node,i)=>node.querySelector('.ko').textContent=translated(i)||'');update();progress();}
async function load(number){
  savePosition();save();lectureReady=false;const requestGeneration=++generation;video.pause();lecture=null;current=-1;repeat=false;follow=true;translationError='';$('repeatLabel').textContent='다시 듣기';$('repeat').setAttribute('aria-pressed','false');
  $('status').textContent='공식 강의와 자막을 불러오는 중…';
  const incoming=await api(`/api/lectures/${encodeURIComponent(number)}`);if(requestGeneration!==generation)return;lecture=incoming;
  try{chromeTranslations=JSON.parse(localStorage.getItem(`mit6100-ko-${number}`)||'{}');}catch{chromeTranslations={};}aiTranslations={};
  $('source').href=lecture.pageUrl;$('source').textContent=lecture.player==='youtube'?'강의 원본 ↗':'MIT 강의 자료 ↗';$('youtube').href=`https://www.youtube.com/watch?v=${lecture.youtubeId}`;
  $('lectureTitle').textContent=lecture.title.split(' | ')[0];$('lectureTitle').title=lecture.title;$('courseLabel').textContent=(lecture.course||'MIT OpenCourseWare')+(lecture.title.includes(' | ')?' · '+lecture.title.split(' | ').slice(1).join(' | '):'');
  $('sourceNote').textContent=lecture.player==='youtube'?'영어: '+(lecture.captionSource==='youtube-auto-captions'?'YouTube 자동 생성 자막':lecture.captionSource==='user-supplied'?'직접 가져온 자막':'YouTube 제공 자막'):'영어: MIT 공식 자막';
  const mediaLoading=video.load(lecture).catch(error=>{if(requestGeneration===generation){video.lastError=error.message;progress();}});
  $('english').textContent=lecture.title;$('korean').textContent='재생하면 두 언어의 자막이 함께 표시됩니다.';
  $('transcript').replaceChildren();nodes=lecture.cues.map((cue,i)=>{const b=document.createElement('button');b.className='cue';const t=document.createElement('time');t.textContent=fmt(cue.start);const e=document.createElement('span');e.className='en';e.textContent=cue.en;const k=document.createElement('span');k.className='ko';k.textContent=translated(i)||'';b.append(t,e,k);b.onclick=()=>seek(i);$('transcript').append(b);return b;});
  localStorage.setItem('mit6100-lecture',String(number));history.replaceState(null,'',`?lecture=${encodeURIComponent(number)}`);renderLibrary();progress();
  await loadAICache(number);await mediaLoading;if(requestGeneration!==generation)return;video.playbackRate=Number($('speed').value);const resume=Number(playPositions[number]);if(Number.isFinite(resume)&&resume>0)video.currentTime=Math.min(resume,lecture.cues.at(-1).end);lectureReady=true;update();if(translator&&chromeMode())void translateAhead();renderAI();
}
function seek(i){if(!lecture)return;i=Math.max(0,Math.min(i,lecture.cues.length-1));lastTime=lecture.cues[i].start+0.02;video.currentTime=lastTime;update();void translateAhead();}
function update(){
  if(!lecture)return;const t=video.currentTime,next=t<lecture.cues[0].start?0:cueAt(lecture.cues,t),old=current;
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
    const result=await translator.translate(cues[index].en);if(activeGeneration!==generation)continue;
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
    await video.play();$('start').textContent='한영 자막 재생';
  }catch(error){$('status').textContent=error.message;}finally{$('start').disabled=false;}
};
function renderAI(){
  const active=session?.accounts?.find(a=>a.id===session.activeId),running=job?.status==='running';
  $('aiControls').hidden=chromeMode();$('account').disabled=running||accountBusy;$('connect').disabled=running||accountBusy;
  $('signout').hidden=!active?.connected;$('signout').disabled=accountBusy;$('refreshModels').disabled=!active?.planEnabled||running||accountBusy;
  $('model').disabled=!active?.planEnabled||running||accountBusy;
  $('sample').disabled=$('translateAll').disabled=!active?.planEnabled||!$('model').value||running||accountBusy||!lecture;
  $('stopJob').hidden=!running;$('aiProgress').hidden=!job;
  if(job){$('aiProgress').max=Math.max(1,job.total);$('aiProgress').value=job.done;}
  if(aiNotice)$('aiStatus').textContent=aiNotice;else if(job)$('aiStatus').textContent=`${job.title||job.number} · ${job.message}${job.error?.code?' ('+job.error.code+')':''}`;
  $('accountStatus').textContent=active?.planEnabled?'ChatGPT 구독 사용 중':active?.connected?'구독 사용 동의가 필요합니다.':'로그인하면 ChatGPT 구독으로 번역할 수 있습니다.';
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
  if(incoming.authMessage&&incoming.authMessage!==lastAuthMessage){lastAuthMessage=incoming.authMessage;if(!job&&!aiNotice)aiNotice=incoming.authMessage;}
  const version=job?`${job.id}/${job.done}/${job.status}`:'';
  if(version!==lastJobVersion){lastJobVersion=version;if(lecture)await loadAICache();}renderAI();
}
$('provider').value=localStorage.getItem('mit6100-provider')==='chrome'?'chrome':'chatgpt';
$('provider').onchange=()=>{localStorage.setItem('mit6100-provider',$('provider').value);paintTranslations();renderAI();void translateAhead();};
$('connect').onclick=async()=>{
  accountBusy=true;renderAI();
  try{const {path}=await api('/api/auth/start',{accountId:$('account').value||null});location.assign(path);}
  catch(error){aiNotice=error.message;accountBusy=false;renderAI();}
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
  accountBusy=true;aiNotice='';renderAI();try{({job}=await api('/api/translate',{lecture:lecture.number,model:$('model').value,scope,start:video.currentTime}));renderAI();await refreshSession();}
  catch(error){aiNotice=error.message;}finally{accountBusy=false;renderAI();}
}
$('sample').onclick=()=>startJob('sample');$('translateAll').onclick=()=>startJob('lecture');
$('stopJob').onclick=async()=>{try{({job}=await api('/api/translate/stop',{}));await loadAICache();renderAI();}catch(e){$('aiStatus').textContent=e.message;}};
$('lecture').onchange=()=>load($('lecture').value).catch(e=>$('status').textContent=e.message);
$('pause').onclick=()=>video.pause();
$('speed').onchange=()=>video.playbackRate=Number($('speed').value);$('back').onclick=()=>seek(current>0?current-1:0);$('next').onclick=()=>seek(current>=0?current+1:0);
$('repeat').onclick=()=>{repeat=!repeat;$('repeatLabel').textContent=repeat?'반복 중':'다시 듣기';$('repeat').setAttribute('aria-pressed',String(repeat));if(repeat)seek(Math.max(current,0));};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch(e){$('status').textContent=e.message;}};
$('exitFullscreen').onclick=async()=>{try{await document.exitFullscreen();}catch(e){$('status').textContent=e.message;}};
document.addEventListener('fullscreenchange',()=>{$('exitFullscreen').hidden=document.fullscreenElement!==$('stage');$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'전체화면 종료':'자막 포함 전체화면');if(!document.fullscreenElement)$('fullscreen').focus();});
video.addEventListener('timeupdate',update);video.addEventListener('seeked',()=>{lastTime=video.currentTime;update();void translateAhead();});
video.addEventListener('error',()=>{$('status').textContent=video.lastError||'영상을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침하세요.';});
window.addEventListener('beforeunload',()=>{save();savePosition();});
async function refreshLibrary(selected){catalogRows=await api('/api/library');catalogRows.sort((a,b)=>(a.youtubeId==='aircAruvnKk'?-1:b.youtubeId==='aircAruvnKk'?1:0)||(Number(String(b.number).startsWith('yt_'))-Number(String(a.number).startsWith('yt_'))));$('lecture').replaceChildren(...catalogRows.map(row=>new Option(row.title,String(row.number))));$('lecture').value=catalogRows.some(x=>String(x.number)===String(selected))?String(selected):String(catalogRows[0]?.number||'1');renderLibrary();return catalogRows;}
$('importForm').onsubmit=async event=>{
  event.preventDefault();
  $('importYoutube').disabled=true;$('importStatus').textContent='YouTube 제목과 영어 자막을 가져오는 중…';
  try{const file=$('subtitleFile').files[0];if(file&&file.size>2*1024*1024)throw new Error('자막 파일은 2MB 이하로 넣어주세요.');const result=await api('/api/library/import',{url:$('youtubeUrl').value,subtitleText:file?await file.text():undefined,title:$('customTitle').value});$('librarySearch').value='';await refreshLibrary(result.lecture.number);await load(result.lecture.number);$('importStatus').textContent='';closeDialog('importDialog');$('study').focus();$('status').textContent=result.existing?'이미 등록된 강의를 열었습니다.':`${result.lecture.cues.length}개 영어 자막을 가져왔습니다.`;}
  catch(error){$('importStatus').textContent=error.message;$('importOptions').open=true;}finally{$('importYoutube').disabled=false;}
};
function savePosition(){if(!lecture||!lectureReady||video.lastError||!Number.isFinite(video.currentTime))return;playPositions[lecture.number]=video.currentTime;try{localStorage.setItem('study-positions',JSON.stringify(playPositions));}catch{}resumeSaved=Date.now();}
function renderLibrary(){
  const search=$('librarySearch').value.trim().toLocaleLowerCase(),list=$('libraryList');list.replaceChildren();
  const rows=catalogRows.filter(row=>(row.title+' '+(row.course||'MIT OpenCourseWare')).toLocaleLowerCase().includes(search));
  $('libraryCount').textContent=`${rows.length}개 강의`;
  if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='일치하는 강의가 없습니다. 다른 제목이나 채널로 검색해 보세요.';list.append(p);return;}
  for(const row of rows){const button=document.createElement('button');button.className='lecture-row';button.dataset.key=String(row.number);button.setAttribute('aria-current',String(String(row.number)===$('lecture').value));button.title=row.title;
    const thumb=document.createElement('span');thumb.className='thumbnail';if(row.youtubeId){const img=document.createElement('img');img.src=`https://i.ytimg.com/vi/${row.youtubeId}/mqdefault.jpg`;img.alt='';img.loading='lazy';img.onerror=()=>{thumb.hidden=true;button.classList.add('no-thumbnail');};thumb.append(img);}else thumb.hidden=true;
    if(row.duration){const duration=document.createElement('span');duration.className='duration';duration.textContent=fmt(row.duration);thumb.append(duration);}
    const text=document.createElement('span'),title=document.createElement('span'),course=document.createElement('span');title.className='lecture-name';title.textContent=row.title.split(' | ')[0];course.className='lecture-course';const duplicateSource=catalogRows.some(other=>other.number!==row.number&&other.youtubeId&&other.youtubeId===row.youtubeId);course.textContent=(row.course||'MIT OpenCourseWare')+(duplicateSource?(String(row.number).startsWith('yt_')?' · YouTube':' · MIT 원본'):'');text.append(title,course);
    if(playPositions[row.number]>5){const resume=document.createElement('span');resume.className='resume-time';resume.textContent=fmt(playPositions[row.number])+'부터 이어보기';text.append(resume);}
    button.append(thumb,text);button.onclick=()=>{closeDialog('mobileLibrary');$('lecture').value=String(row.number);renderLibrary();load(row.number).catch(e=>$('status').textContent=e.message);};list.append(button);
  }
}
$('librarySearch').oninput=renderLibrary;
const dialogOpeners=new Map();
function openDialog(id,opener=document.activeElement){if($('mobileLibrary').open&&id!=='mobileLibrary')closeDialog('mobileLibrary');dialogOpeners.set(id,opener);$(id).showModal();if(id==='importDialog')$('youtubeUrl').focus();}
function closeDialog(id){if($(id).open)$(id).close();}
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDialog(b.dataset.open,b));
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{if(d.id==='mobileLibrary')$('shell').prepend($('libraryPanel'));const opener=dialogOpeners.get(d.id);if(opener?.isConnected&&opener.getClientRects().length)opener.focus();else if(matchMedia('(max-width:960px)').matches)$('openLibrary').focus();}));
$('openLibrary').onclick=()=>{$('mobileLibrary').append($('libraryPanel'));openDialog('mobileLibrary',$('openLibrary'));$('librarySearch').focus();};
matchMedia('(max-width:960px)').addEventListener('change',e=>{if(!e.matches)closeDialog('mobileLibrary');});
$('translationToSettings').onclick=()=>{closeDialog('translationDialog');openDialog('settingsDialog',document.querySelector('[data-open="translationDialog"]'));};
function scrollToCue(){const node=nodes[current];if(node)$('transcript').scrollTop=node.offsetTop-20;}
$('toggleTranscript').onclick=()=>{const open=$('transcriptPanel').hidden;$('transcriptPanel').hidden=!open;$('toggleTranscript').setAttribute('aria-expanded',String(open));if(open){follow=true;scrollToCue();}};
$('followTranscript').onclick=()=>{follow=true;scrollToCue();};
for(const event of ['wheel','touchstart','pointerdown'])$('transcript').addEventListener(event,()=>{follow=false;},{passive:true});
$('transcript').addEventListener('keydown',e=>{if(['PageUp','PageDown','Home','End','ArrowUp','ArrowDown'].includes(e.key))follow=false;});
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,button,a,[contenteditable=true]'))return;const button={ArrowLeft:'back',ArrowRight:'next',r:'repeat',f:'fullscreen'}[e.key];if(button){e.preventDefault();$(button).click();}});
try{
  await refreshSession();const wanted=new URLSearchParams(location.search).get('lecture')||localStorage.getItem('mit6100-lecture')||'yt_aircAruvnKk';await refreshLibrary(wanted);await load($('lecture').value);
}catch(error){$('aiStatus').textContent=error.message;$('status').textContent=error.message;}
setInterval(async()=>{if(polling||accountBusy)return;polling=true;try{await refreshSession();}catch(error){$('aiStatus').textContent=error.message;}finally{polling=false;}},3000);
