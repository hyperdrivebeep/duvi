export function setupStudyView({onTranscriptOpen}){
  const $=id=>document.getElementById(id),stage=$('stage'),toolbar=$('studyToolbar');
  let opener=$('fullscreen'),hideTimer,entered=false;
  const outside=[];
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
    if(entered)showControls();
  });
  stage.addEventListener('pointermove',showControls,{passive:true});
  stage.addEventListener('pointerdown',showControls,{passive:true});
  toolbar.addEventListener('focusin',showControls);
  toolbar.addEventListener('focusout',showControls);
  toolbar.addEventListener('pointerleave',showControls);
  $('showStudyControls').onclick=()=>{showControls();$('captionPlacement').focus();};
  const size=stored('duvi-fullscreen-caption-size',22);
  $('captionSize').value=String([18,22,26,30].includes(size)?size:22);
  const updateSize=()=>{stage.style.setProperty('--fullscreen-caption-size',$('captionSize').value+'px');persist('duvi-fullscreen-caption-size',Number($('captionSize').value));};
  $('captionSize').onchange=updateSize;updateSize();
  const placement=stored('duvi-caption-placement','dock');
  $('captionPlacement').value=['dock','bottom','top'].includes(placement)?placement:'dock';
  const updatePlacement=()=>{stage.dataset.captionPlacement=$('captionPlacement').value;persist('duvi-caption-placement',$('captionPlacement').value);};
  $('captionPlacement').onchange=updatePlacement;updatePlacement();
  function transcript(open){
    $('transcriptPanel').hidden=!open;stage.classList.toggle('has-transcript',open);
    for(const id of ['toggleTranscript','studyTranscript'])$(id).setAttribute('aria-expanded',String(open));
    if(open)onTranscriptOpen();
  }
  for(const id of ['toggleTranscript','studyTranscript'])$(id).onclick=()=>transcript($('transcriptPanel').hidden);
  $('closeTranscript').onclick=()=>{transcript(false);showControls();$(entered?'studyTranscript':'toggleTranscript').focus();};
}
