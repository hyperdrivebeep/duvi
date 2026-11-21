export function parsePositions(value){
  let source;try{source=typeof value==='string'?JSON.parse(value):value;}catch{return {};}
  if(!source||typeof source!=='object'||Array.isArray(source))return {};
  return Object.fromEntries(Object.entries(source).filter(([key,time])=>/^(?:[1-9][0-9]?|yt_[A-Za-z0-9_-]{11})$/.test(key)&&typeof time==='number'&&Number.isFinite(time)&&time>=0));
}
export function mergePositionValues(current,incoming,mode){const local=parsePositions(current),restored=parsePositions(incoming);return mode==='replace'?{...local,...restored}:{...restored,...local};}
export class LearningPlaybackState{
  constructor(positions,storage,now=Date.now){
    Object.assign(this,{positions,storage,now});this.blocked=null;this.lastPaused=true;
    // Keep study-positions numeric for existing library UI, backups and older clients.
    try{this.stamps=JSON.parse(storage.getItem('study-position-stamps'))||{};}catch{this.stamps={};}
  }
  snapshot(){
    return Object.fromEntries(Object.entries(parsePositions(this.positions)).filter(([id,seconds])=>
      /^(?:[1-9]|1[0-9]|2[0-6]|yt_[A-Za-z0-9_-]{11})$/.test(id)&&seconds<=604800).map(([id,seconds])=>{
      const row=this.stamps[id];
      return [id,{seconds,updatedAt:row?.seconds===seconds&&Number.isSafeInteger(row.updatedAt)?row.updatedAt:0}];
    }).sort((a,b)=>b[1].updatedAt-a[1].updatedAt).slice(0,526));
  }
  persist(){
    this.storage.setItem('study-positions',JSON.stringify(this.positions));
    this.storage.setItem('study-position-stamps',JSON.stringify(this.stamps));
  }
  merge(incoming,currentId,paused){
    const local=this.snapshot();let applied=0;
    for(const [id,row] of Object.entries(incoming)){
      if(id===String(currentId)&&!paused)continue;
      if(local[id]&&row.updatedAt<=local[id].updatedAt)continue;
      this.positions[id]=row.seconds;this.stamps[id]=row;applied++;
      if(id===String(currentId)){this.blocked=id;this.lastPaused=paused;}
    }
    if(applied)this.persist();
    return applied;
  }
  restore(currentId,paused){const restored=parsePositions(this.storage.getItem('study-positions'));for(const key of Object.keys(this.positions))delete this.positions[key];Object.assign(this.positions,restored);this.blocked=currentId==null?null:String(currentId);this.lastPaused=paused;}
  beginLecture(){this.blocked=null;}
  allowWrite(id){if(this.blocked===String(id))this.blocked=null;}
  observePlayback(id,paused){if(this.blocked===String(id)&&this.lastPaused&&!paused)this.allowWrite(id);this.lastPaused=paused;}
  save(id,seconds){
    if(this.blocked===String(id)||!Number.isFinite(seconds)||seconds<0||(this.positions[id]??0)===seconds)return false;
    this.positions[id]=seconds;this.stamps[id]={seconds,updatedAt:this.now()};this.persist();return true;
  }
}
