import * as v from './learning-validation.mjs';

const lectureFields=['number','title','course','youtubeId','player','pageUrl','videoUrl','captionUrl','captionSource','captionStatus','captionError','unavailable','duration','createdAt','cues'];
const cacheFields=['version','lecture','sourceHash','promptVersion','alignmentVersion','alignmentRevision','timing','cues','translations','updatedAt'];
export const lectureKey=v.lectureId;
function url(value,hosts){v.text(value,2048);let parsed;try{parsed=new URL(value);}catch{v.invalid();}if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||!hosts.includes(parsed.hostname))v.invalid('지원하지 않는 미디어 출처입니다.');return value;}
function pick(value,fields,project){v.object(value);if(!project)v.keys(value,fields);return Object.fromEntries(fields.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));}
function cues(value,project){return v.array(value,20000).map(row=>{const result=pick(row,['start','end','en'],project);v.number(result.start);v.number(result.end);v.text(result.en);if(result.start>=result.end)v.invalid();return result;});}
function lecture(value,project){
  const result=pick(value,lectureFields,project);lectureKey(result.number);v.text(result.title,1000);result.cues=cues(result.cues,project);
  for(const key of ['course','captionSource','captionStatus','captionError'])if(result[key]!==undefined)v.text(result[key],1000);
  if(result.youtubeId!==undefined&&!/^[A-Za-z0-9_-]{11}$/.test(result.youtubeId))v.invalid();
  const youtubeKey=String(result.number).startsWith('yt_');
  if(youtubeKey&&(result.youtubeId!==String(result.number).slice(3)||result.player!=='youtube'))v.invalid('YouTube 강의의 영상 식별자와 재생기 정보가 필요합니다.');
  if(result.player!==undefined)v.choice(result.player,['youtube','native']);
  if(youtubeKey||result.createdAt!==undefined)result.createdAt=v.date(result.createdAt);
  if(result.player==='youtube'){
    if(typeof result.youtubeId!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(result.youtubeId))v.invalid('YouTube 영상 식별자가 필요합니다.');
  }else url(result.videoUrl,['ocw.mit.edu']);
  if(result.duration!==undefined)v.number(result.duration);
  if(result.unavailable!==undefined&&typeof result.unavailable!=='boolean')v.invalid();
  for(const key of ['pageUrl','videoUrl','captionUrl'])if(result[key]!==undefined)url(result[key],['ocw.mit.edu','www.youtube.com','youtube.com','youtu.be']);
  return result;
}
function folder(value,project){
  const result=pick(value,['id','name','lectureIds','sourcePlaylistId'],project);v.id(result.id);v.text(result.name,120);
  result.lectureIds=v.unique(v.array(result.lectureIds,2000).map(lectureKey),key=>key);
  if(result.sourcePlaylistId!==undefined)v.id(result.sourcePlaylistId);return result;
}
export function cache(value,project=false){
  const result=pick(value,cacheFields,project);if(result.version!==1)v.invalid();lectureKey(result.lecture);
  if(typeof result.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(result.sourceHash))v.invalid();v.text(result.promptVersion,120);
  for(const key of ['alignmentVersion','alignmentRevision','timing'])if(result[key]!==undefined)v.text(result[key],160);
  if(result.cues!==undefined)result.cues=cues(result.cues,project);
  if(result.updatedAt!==undefined)result.updatedAt=v.date(result.updatedAt);
  v.object(result.translations);if(Object.keys(result.translations).length>20000)v.invalid();
  result.translations=Object.fromEntries(Object.entries(result.translations).map(([key,row])=>{
    if(!/^(0|[1-9][0-9]{0,4})$/.test(key)||Number(key)>=20000)v.invalid();
    const entry=pick(row,['ko','model','updatedAt'],project);v.text(entry.ko,12000);v.text(entry.model,200);entry.updatedAt=v.date(entry.updatedAt);return [key,entry];
  }));return result;
}
export function backup(value,{project=false}={}){
  v.bounded(value);v.keys(value,['schemaVersion','exportedAt','learning','library','folders','translations']);if(value.schemaVersion!==1)v.invalid('지원하지 않는 백업 버전입니다.');
  const result={schemaVersion:1,exportedAt:v.date(value.exportedAt),learning:v.state(value.learning),library:v.unique(v.array(value.library,526).map(row=>lecture(row,project)),row=>String(row.number)),folders:v.unique(v.array(value.folders,1000).map(row=>folder(row,project)),row=>row.id),translations:v.unique(v.array(value.translations,526).map(row=>cache(row,project)),row=>String(row.lecture))};
  const available=new Set(result.library.map(row=>String(row.number)));
  for(const row of result.folders)if(row.lectureIds.some(key=>!available.has(key)))v.invalid('백업에 폴더의 강의가 누락되었습니다.');
  for(const row of result.translations)if(!available.has(String(row.lecture)))v.invalid('백업에 번역의 강의가 누락되었습니다.');
  return v.bounded(result);
}
