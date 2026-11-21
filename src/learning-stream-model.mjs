// Pure helpers for the lecture's time-ordered stream (이 강의 · 시간순) and the time strip under the video.
import {isOpenQuestion,formatTime} from './learning-model.mjs';

const sameLecture=(record,id)=>String(record.lectureId??record.anchor?.lectureId)===id;
/**
 * One lecture's questions in lecture-time order: each chat question with the answers that followed it,
 * plus records written outside the chat. A chat answer saved as a record carries that record, so the
 * learner's own explanation stays separate from the AI answer.
 */
export function lectureStream({chats=[],records=[]},lectureId){
  const id=String(lectureId),local=new Map(records.filter(row=>sameLecture(row,id)).map(row=>[row.id,row])),linked=new Set(),items=[];
  for(const thread of chats.filter(row=>row.lectureId===id)){
    let group=null;
    for(const message of thread.messages){
      if(message.role==='user'){group={kind:'qa',key:`${thread.id}:${message.id}`,threadId:thread.id,seconds:message.seconds,at:message.at,question:message,answers:[],record:null};items.push(group);continue;}
      if(!group)continue;
      group.answers.push(message);
      const record=message.recordId&&local.get(message.recordId);
      if(record){group.record=record;linked.add(record.id);}
    }
  }
  for(const record of local.values())if(!linked.has(record.id))items.push({kind:'record',key:`record:${record.id}`,seconds:record.anchor?.seconds??0,at:record.createdAt,record});
  for(const item of items){item.explained=!!item.record?.explanation?.trim();item.open=item.record?isOpenQuestion(item.record):true;}
  return items.sort((a,b)=>a.seconds-b.seconds||String(a.at).localeCompare(String(b.at)));
}
export function streamCounts(items){return {all:items.length,open:items.filter(item=>item.open).length};}
export function filterStream(items,filter){return filter==='open'?items.filter(item=>item.open):items;}
/** Where the "지금 mm:ss" line goes: before the first item asked after the playback time. */
export function nowIndex(items,seconds){const index=items.findIndex(item=>item.seconds>seconds);return index<0?items.length:index;}
export function itemTitle(item){return item.question?.text||item.record?.question||item.record?.title||'내 설명';}

export const STRIP_WINDOW=600;
const lastStart=(duration,size)=>duration>0?Math.floor((duration-1)/size)*size:0;
/** The ten-minute span of the time strip that contains the given time; the last span stops at the lecture's end. */
export function stripWindow(seconds,duration,size=STRIP_WINDOW){
  const start=Math.min(Math.floor(Math.max(0,seconds||0)/size)*size,lastStart(duration,size));
  return {start,end:duration>0?Math.min(start+size,duration):start+size};
}
export function stripWindows(duration,size=STRIP_WINDOW){
  const rows=[];
  for(let start=0;start<=lastStart(duration,size);start+=size){const {end}=stripWindow(start,duration,size);rows.push({start,end,label:`${formatTime(start)}–${formatTime(end)}`});}
  return rows;
}
/** Markers on the strip: filled when the learner wrote an explanation, hollow for a question still open. */
export function stripMarkers(items,{start,end}){
  return items.filter(item=>item.seconds>=start&&item.seconds<=end).map(item=>({key:item.key,seconds:item.seconds,filled:item.explained,left:(item.seconds-start)/Math.max(1,end-start),label:`${formatTime(item.seconds)} · ${item.explained?'내 설명 있음':'열린 질문'} · ${itemTitle(item)}`}));
}
