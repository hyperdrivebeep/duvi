// Pure helpers for the 질문하기 side chat; the DOM panel lives in learning-chat.mjs.
import {formatTime} from './learning-model.mjs';
export const CHAT_AUTOPAUSE_KEY='duvi-chat-autopause';
export const CHAT_MODEL_KEY='duvi-chat-model';
export const CHAT_CONTEXT_KEY='duvi-chat-context';
/** Seconds of transcript on each side of the question time that the server sends with a question. */
export const CONTEXT_SECONDS=60;
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
/**
 * The playback time a question is tied to: taken when the learner starts typing, kept while they write,
 * dropped with the text. 'detached' (the × on the time chip) means the time at sending is used instead.
 */
export function typingAnchor(anchor,value,now){if(!value.trim())return null;return anchor??now;}
export function questionSeconds(anchor,now){return typeof anchor==='number'?anchor:now;}
export function contextRange(seconds,span=CONTEXT_SECONDS){return `${formatTime(Math.max(0,seconds-span))}–${formatTime(seconds+span)}`;}
/** Which extra material goes with a question; both are on unless the learner turned one off. */
export function chatContextChoice(storage){let saved={};try{saved=JSON.parse(storage.getItem(CHAT_CONTEXT_KEY)||'{}')||{};}catch{}return {transcript:saved.transcript!==false,notes:saved.notes!==false};}
/**
 * The same bounded set supplies the check-box count and the tutor's request. A question recorded from the chat is
 * already part of the conversation, so it becomes a note only once the learner has written an explanation for it.
 */
export function lectureNotes(records,lectureId,chats=[],budget=4000){
  const rows=[],asked=new Set((chats||[]).flatMap(thread=>thread.messages.map(row=>row.recordId)).filter(Boolean));let used=0;
  for(const record of (records||[]).filter(row=>String(row.lectureId??row.anchor?.lectureId)===String(lectureId)&&(row.explanation?.trim()||!asked.has(row.id))).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))){
    const row={at:formatTime(record.anchor?.seconds||0),question:record.question||'',explanation:record.explanation||''},size=row.question.length+row.explanation.length;
    if(!size)continue;if(used+size>budget)break;used+=size;rows.push(row);
  }
  return rows;
}
export function lectureNoteCount(records,lectureId,chats=[]){return lectureNotes(records,lectureId,chats).length;}
export function lectureThreads(chats,lectureId){return (chats||[]).filter(row=>row.lectureId===String(lectureId)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
/**
 * Applies one server write (a chat turn and the question's record, when it carries one) when it is the only change
 * since this state; otherwise the caller reloads.
 */
export function withThread(state,thread,revision,record=null){
  if(revision!==state.revision+1)return null;
  const records=record?[...(state.records||[]).filter(row=>row.id!==record.id),record]:state.records;
  return {...state,revision,records,chats:[...(state.chats||[]).filter(row=>row.id!==thread.id),thread]};
}
export function threadLabel(thread){
  const date=new Date(thread.updatedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
  return `${thread.title||'제목 없는 대화'} · ${date}`;
}
