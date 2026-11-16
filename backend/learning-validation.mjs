import {AppError} from './chatgpt-auth.mjs';
import {validKey} from './library.mjs';

export const MAX_BYTES=16*1024*1024;
export const TEXT_FIELDS=['title','question','explanation','observation','assumptions','alternative','prediction','result','revisionNote'];
export const HELP=['none','hint','partial','full'];
export const STATUSES=['not_started','watching','practicing','explained','reviewed'];
export function invalid(message='학습 데이터 형식을 확인하세요.'){throw new AppError(message,'invalid_learning',400);}
export function object(value){if(!value||Array.isArray(value)||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))invalid();return value;}
export function keys(value,allowed){object(value);if(Object.keys(value).some(key=>!allowed.includes(key)))invalid('허용되지 않은 학습 데이터 필드가 있습니다.');return value;}
export function text(value,max=12000){if(typeof value!=='string'||value.length>max)invalid();return value;}
export function id(value){if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value)||['constructor','prototype','__proto__'].includes(value))invalid('식별자 형식을 확인하세요.');return value;}
export function lectureId(value){if(!['string','number'].includes(typeof value)||!validKey(value))invalid('강의 식별자가 올바르지 않습니다.');return String(value);}
export function integer(value,min=0,max=Number.MAX_SAFE_INTEGER){if(!Number.isSafeInteger(value)||value<min||value>max)invalid();return value;}
export function number(value,min=0,max=604800){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)invalid();return value;}
export function choice(value,allowed){if(!allowed.includes(value))invalid();return value;}
export function date(value,nullable=false){if(nullable&&(value===null||value===''))return null;if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))invalid('시간대가 포함된 날짜가 필요합니다.');return new Date(value).toISOString();}
export function array(value,max=2000){if(!Array.isArray(value)||value.length>max)invalid();return value;}
export function unique(rows,key){const seen=new Set();for(const row of rows){const value=key(row);if(seen.has(value))invalid('중복 식별자가 있습니다.');seen.add(value);}return rows;}
export function bounded(value){if(Buffer.byteLength(JSON.stringify(value))>MAX_BYTES)throw new AppError('학습 백업은 16MB 이하로 나누어 보관하세요.','too_large',413);return value;}
export function anchor(value){
  if(value===null||value===undefined)return null;
  keys(value,['lectureId','seconds','sourceText','translation','alignmentRevision','cueStart','cueEnd']);
  const result={lectureId:lectureId(value.lectureId),seconds:number(value.seconds),sourceText:text(value.sourceText??''),translation:text(value.translation??''),alignmentRevision:value.alignmentRevision==null?null:text(value.alignmentRevision,160),cueStart:value.cueStart==null?null:number(value.cueStart),cueEnd:value.cueEnd==null?null:number(value.cueEnd)};
  if(result.cueStart!==null&&result.cueEnd!==null&&result.cueStart>=result.cueEnd)invalid();return result;
}
export function recordInput(value){
  keys(value,['id','resourceId','lectureId',...TEXT_FIELDS,'help','anchor','reviewDueAt']);
  const result={resourceId:id(value.resourceId),lectureId:value.lectureId==null?null:lectureId(value.lectureId)};
  if(value.id!==undefined)result.id=id(value.id);
  for(const field of TEXT_FIELDS)result[field]=text(value[field]??'',field==='title'?300:12000);
  result.help=choice(value.help??'none',HELP);result.anchor=anchor(value.anchor);result.reviewDueAt=date(value.reviewDueAt??null,true);
  if(result.anchor&&result.lectureId&&result.anchor.lectureId!==result.lectureId)invalid('강의와 출처 구간이 일치하지 않습니다.');
  return result;
}
export function snapshot(record){return Object.fromEntries(['resourceId','lectureId',...TEXT_FIELDS,'help','anchor','reviewDueAt'].map(key=>[key,record[key]]));}
export function storedRecord(value){
  keys(value,['id','resourceId','lectureId',...TEXT_FIELDS,'help','anchor','reviewDueAt','schemaVersion','revision','createdAt','updatedAt','originalExplanation','history','reviews']);
  if(value.schemaVersion!==1)invalid();
  const result={...recordInput({...snapshot(value),id:value.id}),schemaVersion:1,revision:integer(value.revision,1),createdAt:date(value.createdAt),updatedAt:date(value.updatedAt),originalExplanation:text(value.originalExplanation)};
  result.history=unique(array(value.history,500).map(entry=>{
    keys(entry,['revision','at','record']);
    return {revision:integer(entry.revision,1,result.revision-1),at:date(entry.at),record:recordInput(entry.record)};
  }),row=>row.revision);
  result.reviews=unique(array(value.reviews,500).map(entry=>{
    keys(entry,['id','at','reflection','intervalDays','help','nextDueAt']);
    return {id:id(entry.id),at:date(entry.at),reflection:text(entry.reflection),intervalDays:integer(entry.intervalDays,1,3650),help:choice(entry.help,HELP),nextDueAt:date(entry.nextDueAt)};
  }),row=>row.id);
  return result;
}
export function state(value){
  keys(value,['schemaVersion','revision','records','progress','settings']);if(value.schemaVersion!==1)invalid('지원하지 않는 학습 데이터 버전입니다.');
  const progress={};object(value.progress);if(Object.keys(value.progress).length>2000)invalid();
  for(const [key,row]of Object.entries(value.progress)){
    id(key);keys(row,['status','updatedAt','revision']);progress[key]={status:choice(row.status,STATUSES),updatedAt:date(row.updatedAt),revision:integer(row.revision,1)};
  }
  // Version 1 has no writable global preferences; browser playback settings stay local.
  keys(value.settings,[]);
  return bounded({schemaVersion:1,revision:integer(value.revision),records:unique(array(value.records).map(storedRecord),row=>row.id),progress,settings:{}});
}
