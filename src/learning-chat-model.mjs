// Pure helpers for the 질문하기 side chat; the DOM panel lives in learning-chat.mjs.
export const CHAT_AUTOPAUSE_KEY='duvi-chat-autopause';
export const CHAT_MODEL_KEY='duvi-chat-model';
export function chatAutoPause(storage){try{return storage.getItem(CHAT_AUTOPAUSE_KEY)!=='off';}catch{return true;}}
/** Splits complete server-sent events off the buffer; the unfinished tail is returned as rest. */
export function parseEvents(buffer){
  const events=[];let rest=buffer,index;
  while((index=rest.indexOf('\n\n'))>=0){
    const block=rest.slice(0,index);rest=rest.slice(index+2);let event='message';const data=[];
    for(const line of block.split('\n')){if(line.startsWith('event:'))event=line.slice(6).trim();else if(line.startsWith('data:'))data.push(line.slice(5).trimStart());}
    if(data.length)events.push({event,data:JSON.parse(data.join('\n'))});
  }
  return {events,rest};
}
export function parseClock(label){return label.split(':').map(Number).reduce((sum,part)=>sum*60+part,0);}
/** Text with [mm:ss] / [h:mm:ss] references split out, so each reference can become a seek button. */
export function textSegments(text){
  const segments=[],pattern=/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g;let last=0,match;
  while((match=pattern.exec(text))){if(match.index>last)segments.push({text:text.slice(last,match.index)});segments.push({label:match[1],seconds:parseClock(match[1])});last=match.index+match[0].length;}
  if(last<text.length)segments.push({text:text.slice(last)});
  return segments;
}
/** Enter sends and Shift+Enter breaks the line; Enter that confirms a Korean IME syllable does neither. */
export function composerAction(event){
  if(event.key!=='Enter'||event.isComposing||event.keyCode===229)return null;
  return event.shiftKey?'newline':'send';
}
export function lectureThreads(chats,lectureId){return (chats||[]).filter(row=>row.lectureId===String(lectureId)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
/** Applies one server-written thread when it is the only change since this state; otherwise the caller reloads. */
export function withThread(state,thread,revision){
  if(revision!==state.revision+1)return null;
  return {...state,revision,chats:[...(state.chats||[]).filter(row=>row.id!==thread.id),thread]};
}
export function threadLabel(thread){
  const date=new Date(thread.updatedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  return `${thread.title||'제목 없는 대화'} · ${date}`;
}
