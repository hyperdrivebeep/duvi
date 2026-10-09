import {readFile,readdir,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {parseVtt,sentences} from './core.mjs';
import {atomicJSON} from './vault.mjs';
import {AppError} from './chatgpt-auth.mjs';
const execute=promisify(execFile);
export function validKey(key){return /^(?:[1-9]|1[0-9]|2[0-6]|yt_[A-Za-z0-9_-]{11})$/.test(String(key));}
export function youtubeId(input){
  let url;try{url=new URL(input);}catch{throw new AppError('YouTube 영상 주소를 입력하세요.');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port)throw new AppError('올바른 YouTube 주소가 아닙니다.');
  let id;
  if(url.hostname==='youtu.be')id=url.pathname.slice(1);
  else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname))id=url.pathname==='/watch'?url.searchParams.get('v'):/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})$/.exec(url.pathname)?.[1];
  if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))throw new AppError('재생목록이 아닌 YouTube 영상 한 개의 주소를 입력하세요.');return id;
}
export function normalizeCues(cues){
  const ordered=cues.filter(c=>c.en&&Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start>=0&&c.end>c.start).sort((a,b)=>a.start-b.start);
  const result=[];
  for(const cue of ordered){
    const last=result.at(-1);
    if(last&&last.en===cue.en&&cue.start<=last.end+0.1){last.end=Math.max(last.end,cue.end);continue;}
    if(last&&cue.start<last.end){
      if(cue.start===last.start){if(cue.en.length>last.en.length)result[result.length-1]={...cue};continue;}
      last.end=cue.start;
    }
    result.push({...cue});
  }
  return sentences(result);
}
export function parseJson3(value){
  if(!Array.isArray(value.events))throw new AppError('YouTube 자막 형식을 읽지 못했습니다.');
  return normalizeCues(value.events.filter(e=>Array.isArray(e.segs)).map(e=>({start:e.tStartMs/1000,end:(e.tStartMs+(e.dDurationMs||0))/1000,en:e.segs.map(s=>s.utf8||'').join('').replace(/\s+/g,' ').trim()})));
}
export class LectureLibrary{
  constructor({root,fetcher=fetch,metadata}){this.root=root;this.directory=path.join(root,'library');this.fetch=fetcher;this.pending=new Map();this.metadata=metadata||this.downloadMetadata.bind(this);}
  async get(key){
    if(!validKey(key))throw new AppError('강의 번호가 올바르지 않습니다.');
    try{return JSON.parse(await readFile(path.join(this.root,String(key).startsWith('yt_')?'library':'data',`${key}.json`),'utf8'));}
    catch(error){if(error.code==='ENOENT')throw new AppError('강의를 찾을 수 없습니다.','not_found',404);throw error;}
  }
  async list(){
    const catalog=JSON.parse(await readFile(path.join(this.root,'data/catalog.json'),'utf8'));
    await mkdir(this.directory,{recursive:true});
    const files=(await readdir(this.directory)).filter(name=>/^yt_[A-Za-z0-9_-]{11}\.json$/.test(name));
    const items=await Promise.all(files.map(name=>this.get(name.slice(0,-5))));
    const all=[...await Promise.all(catalog.map(row=>this.get(row.number))),...items.sort((a,b)=>a.createdAt.localeCompare(b.createdAt))];
    return all.map(({number,title,youtubeId,course,cues,player})=>({number,title,youtubeId,course:course||(player==='youtube'?'YouTube':'MIT OpenCourseWare'),duration:cues?.at(-1)?.end,cueCount:cues?.length}));
  }
  async downloadMetadata(id){
    try{
      const {stdout}=await execute(path.join(this.root,'vendor','yt-dlp.exe'),['--ignore-config','--no-playlist','--skip-download','--dump-single-json','--no-warnings','--socket-timeout','15','--retries','0','--extractor-retries','0','--js-runtimes',`node:${process.execPath}`,'--',`https://www.youtube.com/watch?v=${id}`],{windowsHide:true,timeout:75000,maxBuffer:16*1024*1024,encoding:'utf8'});
      return JSON.parse(stdout);
    }catch{throw new AppError('YouTube에서 자막을 가져오지 못했습니다. 영상의 영어 SRT/VTT 파일을 넣어 등록할 수 있습니다.','youtube_unavailable',422);}
  }
  async import({url,subtitleText,title}){
    const id=youtubeId(url),key='yt_'+id;
    if(this.pending.has(key))throw new AppError('이 영상을 이미 가져오고 있습니다.','busy',409);
    this.pending.set(key,true);
    try{
      try{const existing=await this.get(key);return {lecture:existing,existing:true};}catch(e){if(e.code!=='not_found')throw e;}
      const canonical=`https://www.youtube.com/watch?v=${id}`;let cues,captionSource,metadata;
      if(typeof subtitleText==='string'&&subtitleText.trim()){
        if(subtitleText.length>2*1024*1024)throw new AppError('자막 파일은 2MB 이하로 넣어주세요.');
        cues=normalizeCues(parseVtt(subtitleText));captionSource='user-supplied';
        try{const response=await this.fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(canonical),{signal:AbortSignal.timeout(10000)});if(response.ok)metadata=await response.json();}catch{}
      }else{
        metadata=await this.metadata(id);
        const choose=groups=>Object.entries(groups||{}).filter(([lang])=>/^en(?:[-_].*)?$/.test(lang)).sort(([a],[b])=>(a==='en'?-1:b==='en'?1:a.localeCompare(b))).flatMap(([,tracks])=>tracks).find(t=>t.ext==='json3');
        const manual=choose(metadata.subtitles),track=manual||choose(metadata.automatic_captions);
        if(!track)throw new AppError('가져올 수 있는 영어 자막이 없습니다. 영어 SRT/VTT 파일을 넣어주세요.','no_english_captions',422);
        const captionURL=new URL(track.url);
        if(captionURL.protocol!=='https:'||!['www.youtube.com','youtube.com'].includes(captionURL.hostname)||captionURL.pathname!=='/api/timedtext')throw new AppError('자막 제공 주소를 확인하지 못했습니다.','caption_host',422);
        let response;try{response=await this.fetch(captionURL,{redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw new AppError('YouTube 자막을 읽지 못했습니다. 영어 SRT/VTT 파일로 등록하세요.','caption_unavailable',422);}
        if(!response.ok)throw new AppError('YouTube가 자막 요청을 제한했습니다. 영어 SRT/VTT 파일로 등록하세요.','caption_unavailable',422);
        try{cues=parseJson3(await response.json());}catch{throw new AppError('YouTube 자막 응답을 읽지 못했습니다. 영어 SRT/VTT 파일로 등록하세요.','caption_unavailable',422);}
        captionSource=manual?'youtube-captions':'youtube-auto-captions';
      }
      if(!cues?.length||cues.length>20000)throw new AppError('유효한 자막이 없거나 너무 깁니다. SRT/VTT 파일의 시간 표시를 확인하세요.');
      const lecture={number:key,title:typeof title==='string'&&title.trim()?title.trim().slice(0,200):metadata?.title||`YouTube · ${id}`,course:metadata?.channel||metadata?.author_name||'YouTube lecture',youtubeId:id,player:'youtube',pageUrl:canonical,captionSource,cues,createdAt:new Date().toISOString()};
      await atomicJSON(path.join(this.directory,key+'.json'),lecture);return {lecture,existing:false};
    }finally{this.pending.delete(key);}
  }
}
