/** Typing a note, or clicking and pointing in the notes panel beside the video, must not pop the toolbar over the video. */
export function revealsControls(event){return !event.target?.closest?.('input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea,[contenteditable=true],.transcript-panel');}
/** Keyboard focus in the toolbar holds fullscreen controls open; focus a mouse click leaves on a toolbar button (대본, 질문하기) does not. */
export function holdsControls(active){return !!active&&(active.matches(':focus-visible')||!active.matches('button'));}
/** Hiding the toolbar would drop the focus a click left on its button, and that focusout reveals the toolbar again; move focus to the stage first. */
export function hideControls(stage,toolbar,handle){
  if(toolbar.contains(document.activeElement))stage.focus({preventScroll:true});
  stage.classList.add('controls-hidden');handle.setAttribute('aria-expanded','false');
}
/**
 * The lecture stage: one media instance, captions, the side panel (질문 / 개념 / 확인 문제 / 대본) and fullscreen.
 * The panel is always beside the lecture in the normal view; only fullscreen can close it.
 */
export function setupStudyView({onTranscriptOpen,onChatOpen=()=>{},onQuizOpen=()=>{},onConceptsOpen=()=>{}}){
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
      if((toolbar.contains(document.activeElement)&&holdsControls(document.activeElement))||toolbar.matches(':hover')||!settings.hidden)return;
      hideControls(stage,toolbar,$('showStudyControls'));
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
    else{clearTimeout(hideTimer);stage.classList.remove('controls-hidden');showPanel(true);opener.focus({preventScroll:true});}
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
  // ⚙ holds the settings that do not need to be on screen while watching (speed, auto pause, caption place and size,
  // and in fullscreen 강의 완료), so the controls stay one row above the video.
  const settings=$('studySettingsPanel'),settingsButton=$('studySettings');
  function setSettings(open,{focus=false}={}){
    settings.hidden=!open;settingsButton.setAttribute('aria-expanded',String(open));
    if(open&&focus)$('speed').focus();
    if(!open&&settings.contains(document.activeElement))settingsButton.focus({preventScroll:true});
  }
  settingsButton.onclick=()=>setSettings(settings.hidden);
  // Escape closes it from the ⚙ button or inside it. (In native fullscreen the browser's own Escape also leaves fullscreen.)
  settings.parentElement.addEventListener('keydown',event=>{if(event.key==='Escape'&&!settings.hidden){event.preventDefault();event.stopPropagation();setSettings(false);}});
  document.addEventListener('pointerdown',event=>{if(!settings.hidden&&!settings.parentElement.contains(event.target))setSettings(false);});
  const speedLabel=()=>{$('studySettingsLabel').textContent=$('speed').selectedOptions[0]?.textContent||'';};
  $('speed').addEventListener('change',speedLabel);speedLabel();
  $('showStudyControls').onclick=()=>{showControls();setSettings(true,{focus:true});};
  const size=stored('duvi-fullscreen-caption-size',22);
  $('captionSize').value=String([18,22,26,30].includes(size)?size:22);
  const updateSize=()=>{stage.style.setProperty('--fullscreen-caption-size',$('captionSize').value+'px');persist('duvi-fullscreen-caption-size',Number($('captionSize').value));resetCaptions();};
  $('captionSize').onchange=updateSize;updateSize();
  const placement=stored('duvi-caption-placement','dock');
  $('captionPlacement').value=['dock','bottom','top'].includes(placement)?placement:'dock';
  const updatePlacement=()=>{stage.dataset.captionPlacement=$('captionPlacement').value;persist('duvi-caption-placement',$('captionPlacement').value);resetCaptions();};
  $('captionPlacement').onchange=updatePlacement;updatePlacement();
  function showPanel(open){
    $('transcriptPanel').hidden=!open;stage.classList.toggle('has-transcript',open);resetCaptions();
    $('studyTranscript').setAttribute('aria-expanded',String(open));
  }
  /** focus:false selects a tab without moving the keyboard into it (the first paint, a click on the tab itself). */
  function selectTab(name,{focus=true}={}){
    for(const tab of document.querySelectorAll('[data-stage-tab]')){const selected=tab.dataset.stageTab===name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
    for(const panel of document.querySelectorAll('[data-stage-panel]'))panel.hidden=panel.dataset.stagePanel!==name;
    if(name==='transcript')onTranscriptOpen();
    if(name==='chat')onChatOpen(focus);
    if(name==='quiz')onQuizOpen();
    if(name==='concepts')onConceptsOpen();
  }
  function openPanel(name,options){showPanel(true);selectTab(name,options);}
  const tabs=[...document.querySelectorAll('[data-stage-tab]')];
  tabs.forEach((tab,index)=>{tab.onclick=()=>{selectTab(tab.dataset.stageTab,{focus:false});tab.focus();};tab.onkeydown=event=>{const target=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;if(target!==null){event.preventDefault();selectTab(tabs[target].dataset.stageTab,{focus:false});tabs[target].focus();}};});
  $('openQuestion').onclick=()=>openPanel('chat');
  $('studyTranscript').onclick=()=>{if($('transcriptPanel').hidden)openPanel('transcript');else showPanel(false);};
  $('closeTranscript').onclick=()=>{showPanel(false);showControls();$('studyTranscript').focus();};
  return {openPanel,exit,selectedTab:()=>document.querySelector('[data-stage-tab][aria-selected=true]')?.dataset.stageTab};
}
