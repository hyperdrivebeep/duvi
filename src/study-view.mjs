/** Typing a note, or clicking and pointing in the notes panel beside the video, must not pop the toolbar over the video. */
export function revealsControls(event){return !event.target?.closest?.('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable=true],.transcript-panel');}
export function setupStudyView({onTranscriptOpen,onChatOpen=()=>{},onQuestionOpen=()=>{},onLearningOpen=()=>{}}){
  const $=id=>document.getElementById(id),stage=$('stage'),toolbar=$('studyToolbar');
  let opener=$('fullscreen'),hideTimer,entered=false;
  const outside=[];
  const captionRows=[...stage.querySelectorAll('.captions .caption-row')];
  // Docked captions keep the tallest height seen in the current layout, so the video does not jump between sentences.
  function holdCaptions(){
    if(!entered||stage.dataset.captionPlacement!=='dock')return;
    for(const row of captionRows){const height=row.getBoundingClientRect().height;if(height>parseFloat(row.style.minHeight||'0'))row.style.minHeight=`${height}px`;}
  }
  function resetCaptions(){for(const row of captionRows)row.style.minHeight='';requestAnimationFrame(holdCaptions);}
  new MutationObserver(holdCaptions).observe(stage.querySelector('.captions'),{childList:true,characterData:true,subtree:true});
  addEventListener('resize',resetCaptions);
  function isolate(active){
    if(active){
      for(let branch=stage;branch.parentElement;branch=branch.parentElement){
        for(const sibling of branch.parentElement.children){
          if(sibling===branch)continue;
          outside.push([sibling,sibling.inert]);sibling.inert=true;
        }
        if(branch.parentElement===document.body)break;
      }
    }else for(const [element,inert] of outside.splice(0))element.inert=inert;
  }
  const stored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
  const persist=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
  function showControls(){
    clearTimeout(hideTimer);stage.classList.remove('controls-hidden');
    $('showStudyControls').setAttribute('aria-expanded','true');
    if(entered)hideTimer=setTimeout(()=>{
      if(toolbar.contains(document.activeElement)||toolbar.matches(':hover'))return;
      stage.classList.add('controls-hidden');$('showStudyControls').setAttribute('aria-expanded','false');
    },2500);
  }
  function setActive(active){
    if(active===entered)return;
    isolate(active);
    entered=active;stage.classList.toggle('study-focus',active);
    document.body.classList.toggle('study-focused',active);
    $('exitFullscreen').hidden=!active;
    $('fullscreen').setAttribute('aria-label',active?'전체화면 종료':'자막 포함 전체화면');
    if(active){stage.focus({preventScroll:true});showControls();}
    else{clearTimeout(hideTimer);stage.classList.remove('controls-hidden');opener.focus({preventScroll:true});}
    resetCaptions();
  }
  async function exit(){
    if(document.fullscreenElement===stage)await document.exitFullscreen();
    else setActive(false);
  }
  async function enter(event){
    if(entered){await exit();return;}
    opener=event.currentTarget;setActive(true);
    try{await stage.requestFullscreen();}catch{
      // Keep the same viewport-filling player when native fullscreen is unavailable.
    }
  }
  $('videoFullscreen').onclick=$('fullscreen').onclick=enter;
  $('exitFullscreen').onclick=exit;
  document.addEventListener('fullscreenchange',()=>{
    if(document.fullscreenElement===stage){if(!entered)setActive(true);}
    else if(entered)setActive(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&entered&&!document.fullscreenElement){event.preventDefault();exit();}
    if(entered&&revealsControls(event))showControls();
  });
  const revealFromPointer=event=>{if(revealsControls(event))showControls();};
  stage.addEventListener('pointermove',revealFromPointer,{passive:true});
  stage.addEventListener('pointerdown',revealFromPointer,{passive:true});
  toolbar.addEventListener('focusin',showControls);
  toolbar.addEventListener('focusout',showControls);
  toolbar.addEventListener('pointerleave',showControls);
  $('showStudyControls').onclick=()=>{showControls();$('captionPlacement').focus();};
  const size=stored('duvi-fullscreen-caption-size',22);
  $('captionSize').value=String([18,22,26,30].includes(size)?size:22);
  const updateSize=()=>{stage.style.setProperty('--fullscreen-caption-size',$('captionSize').value+'px');persist('duvi-fullscreen-caption-size',Number($('captionSize').value));resetCaptions();};
  $('captionSize').onchange=updateSize;updateSize();
  const placement=stored('duvi-caption-placement','dock');
  $('captionPlacement').value=['dock','bottom','top'].includes(placement)?placement:'dock';
  const updatePlacement=()=>{stage.dataset.captionPlacement=$('captionPlacement').value;persist('duvi-caption-placement',$('captionPlacement').value);resetCaptions();};
  $('captionPlacement').onchange=updatePlacement;updatePlacement();
  function transcript(open){
    $('transcriptPanel').hidden=!open;stage.classList.toggle('has-transcript',open);resetCaptions();
    for(const id of ['toggleTranscript','studyTranscript'])$(id).setAttribute('aria-expanded',String(open));
    if(open)selectTab('transcript');
  }
  function selectTab(name){
    for(const tab of document.querySelectorAll('[data-stage-tab]')){const selected=tab.dataset.stageTab===name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
    for(const panel of document.querySelectorAll('[data-stage-panel]'))panel.hidden=panel.dataset.stagePanel!==name;
    if(name==='transcript')onTranscriptOpen();
    if(name==='chat')onChatOpen();
    if(name==='question')onQuestionOpen();
    if(name==='learning')onLearningOpen();
  }
  function openPanel(name){$('transcriptPanel').hidden=false;stage.classList.add('has-transcript');resetCaptions();for(const id of ['toggleTranscript','studyTranscript'])$(id).setAttribute('aria-expanded','true');selectTab(name);}
  const tabs=[...document.querySelectorAll('[data-stage-tab]')];
  tabs.forEach((tab,index)=>{tab.onclick=()=>{selectTab(tab.dataset.stageTab);tab.focus();};tab.onkeydown=event=>{const target=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;if(target!==null){event.preventDefault();selectTab(tabs[target].dataset.stageTab);tabs[target].focus();}};});
  $('openQuestion').onclick=()=>openPanel('chat');
  for(const id of ['toggleTranscript','studyTranscript'])$(id).onclick=()=>transcript($('transcriptPanel').hidden);
  $('closeTranscript').onclick=()=>{transcript(false);showControls();$(entered?'studyTranscript':'toggleTranscript').focus();};
  return {openPanel,exit};
}
