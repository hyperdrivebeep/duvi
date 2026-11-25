// App shell A (user decision 2026-11-24): a narrow rail in the same place on every screen, and the 내 강의
// library as a panel opened from the lecture header instead of a permanent sidebar.
export const VIEWS=Object.freeze(['lecture','map','quiz','review']);
/** The element each rail destination shows. The lecture view is the existing #study; the others are mount points. */
export function viewElementId(view){return view==='lecture'?'study':`view-${view}`;}
/** Unknown names keep the current view, so a stale link cannot hide every screen. */
export function nextView(current,requested){return VIEWS.includes(requested)?requested:current;}

export function setupShell({onShow=()=>{}}={}){
  const $=id=>document.getElementById(id),items=[...document.querySelectorAll('.rail [data-view]')],library=$('libraryPanel'),toggle=$('openLibrary');
  let current='lecture';
  /** Closing moves focus back to the header button only when focus was inside the panel. */
  function setLibrary(open){
    const inside=library.contains(document.activeElement);
    library.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
    if(open)$('librarySearch').focus();else if(inside&&toggle.getClientRects().length)toggle.focus();
  }
  function show(requested){
    const view=nextView(current,requested),previous=current;current=view;
    if(view!=='lecture'&&!library.hidden)setLibrary(false);
    for(const name of VIEWS)$(viewElementId(name)).hidden=name!==view;
    for(const item of items)if(item.dataset.view===view)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
    if(view!==previous)onShow(view,previous);
  }
  toggle.onclick=()=>setLibrary(library.hidden);
  $('closeLibrary').onclick=()=>setLibrary(false);
  library.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setLibrary(false);}});
  for(const item of items)item.onclick=()=>show(item.dataset.view);
  return {show,current:()=>current,closeLibrary:()=>setLibrary(false)};
}

/** Lecture keys: ← → sentence, R repeat, F fullscreen. Fields, tabs, sliders and radios keep their own keys.
 * The listener runs in the capture phase and stops a handled key there: the video's native controls (closed shadow
 * DOM) also seek on ← →, so a bubble-phase handler made one press move twice (sentence + 1% of the video). */
export const LECTURE_KEYS=Object.freeze({ArrowLeft:'back',ArrowRight:'next',r:'repeat',f:'fullscreen'});
export function installLectureKeys(target,{active,press}){
  const handler=event=>{
    if(!active()||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
    if(event.target?.closest?.('input,textarea,select,[contenteditable=true],[role=tab],[role=slider],[role=radio]'))return;
    const id=LECTURE_KEYS[event.key];if(!id)return;
    event.preventDefault();event.stopPropagation();press(id);
  };
  target.addEventListener('keydown',handler,true);return handler;
}
