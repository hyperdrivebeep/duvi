export function parsePositions(value){
  let source;try{source=typeof value==='string'?JSON.parse(value):value;}catch{return {};}
  if(!source||typeof source!=='object'||Array.isArray(source))return {};
  return Object.fromEntries(Object.entries(source).filter(([key,time])=>/^(?:[1-9][0-9]?|yt_[A-Za-z0-9_-]{11})$/.test(key)&&typeof time==='number'&&Number.isFinite(time)&&time>=0));
}
export function mergePositionValues(current,incoming,mode){const local=parsePositions(current),restored=parsePositions(incoming);return mode==='replace'?{...local,...restored}:{...restored,...local};}
export class LearningPlaybackState{
  constructor(positions,storage){this.positions=positions;this.storage=storage;this.blocked=null;this.lastPaused=true;}
  restore(currentId,paused){const restored=parsePositions(this.storage.getItem('study-positions'));for(const key of Object.keys(this.positions))delete this.positions[key];Object.assign(this.positions,restored);this.blocked=currentId==null?null:String(currentId);this.lastPaused=paused;}
  beginLecture(){this.blocked=null;}
  allowWrite(id){if(this.blocked===String(id))this.blocked=null;}
  observePlayback(id,paused){if(this.blocked===String(id)&&this.lastPaused&&!paused)this.allowWrite(id);this.lastPaused=paused;}
  save(id,seconds){if(this.blocked===String(id)||!Number.isFinite(seconds))return false;this.positions[id]=seconds;this.storage.setItem('study-positions',JSON.stringify(this.positions));return true;}
}
