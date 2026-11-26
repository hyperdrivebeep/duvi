import {readFile,readdir,mkdir} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {parseVtt,sentences} from './core.mjs';
import {atomicJSON} from './vault.mjs';
import {AppError} from './chatgpt-auth.mjs';
import {FolderStore} from './folders.mjs';
const execute=promisify(execFile);
export const PLAYLIST_LIMIT=500;
export function youtubePlaylistId(input){
  let url;try{url=new URL(input);}catch{throw new AppError('YouTube 재생목록 주소를 입력하세요.');}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(url.hostname))throw new AppError('올바른 YouTube 재생목록 주소가 아닙니다.');
  const id=url.searchParams.get('list');
  if(!/^[A-Za-z0-9_-]{10,100}$/.test(id||''))throw new AppError('list=가 포함된 YouTube 재생목록 주소를 입력하세요.');
  return id;
}
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
  constructor({root,fetcher=fetch,metadata,playlistMetadata}){
    this.root=root;this.directory=path.join(root,'library');this.fetch=fetcher;
    this.pending=new Map();this.captionRequests=new Map();this.playlistPending=false;
    this.metadata=metadata||this.downloadMetadata.bind(this);
    this.playlistMetadata=playlistMetadata||this.downloadPlaylist.bind(this);
    this.folders=new FolderStore(this);
  }
  mutateLecture(key,callback){
    const previous=this.pending.get(key)||Promise.resolve();
    const operation=previous.catch(()=>{}).then(callback);this.pending.set(key,operation);
    return operation.finally(()=>{if(this.pending.get(key)===operation)this.pending.delete(key);});
  }
  async get(key){
    if(!validKey(key))throw new AppError('강의 번호가 올바르지 않습니다.');
    try{return JSON.parse(await readFile(path.join(this.root,String(key).startsWith('yt_')?'library':'data',`${key}.json`),'utf8'));}
    catch(error){if(error.code==='ENOENT')throw new AppError('강의를 찾을 수 없습니다.','not_found',404);throw error;}
  }
  checkLocalASR(key,lecture){
    if(String(key).startsWith('yt_')||lecture.player==='youtube')throw new AppError('YouTube 강의의 음성을 다운로드하거나 추출하지 않습니다. 권한이 있는 SRT/VTT 자막 파일을 추가하세요.','asr_youtube',422);
    if(lecture.cues?.length)throw new AppError('이 강의에 이미 자막이 있습니다. 기존 자막은 변경하지 않습니다.','asr_existing',409);
    if(lecture.unavailable)throw new AppError('재생할 수 있는 강의를 선택하세요.','asr_unavailable',422);
  }
  saveLocalASR(key,raw,model,{signal,onCommit}){
    return this.mutateLecture(key,async()=>{
      const lecture=await this.get(key);
      this.checkLocalASR(key,lecture);
      if(raw.length>20000||raw.some(c=>!c||typeof c.en!=='string'||c.en.length>4000||!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<0||c.end<=c.start||c.end>7201))throw new AppError('음성 인식 결과의 형식이 올바르지 않습니다.','asr_engine',500);
      const cues=normalizeCues(raw.map(({start,end,en})=>({start,end,en:en.trim()})));
      if(!cues.length)throw new AppError('말소리가 감지되지 않았습니다.','asr_silence',422);
      const saved={...lecture,cues,captionSource:'local-asr',captionProvenance:{source:'local-asr',model,savedAt:new Date().toISOString()},captionStatus:'ready',captionError:undefined};
      signal.throwIfAborted();
      onCommit();
      await atomicJSON(path.join(this.root,'data',key+'.json'),saved);
    });
  }
  async list(){
    const catalog=JSON.parse(await readFile(path.join(this.root,'data/catalog.json'),'utf8'));
    await mkdir(this.directory,{recursive:true});
    const files=(await readdir(this.directory)).filter(name=>/^yt_[A-Za-z0-9_-]{11}\.json$/.test(name));
    const items=await Promise.all(files.map(name=>this.get(name.slice(0,-5))));
    const all=[...await Promise.all(catalog.map(row=>this.get(row.number))),...items.sort((a,b)=>a.createdAt.localeCompare(b.createdAt))];
    return all.map(({number,title,youtubeId,course,cues,player,duration,captionStatus,unavailable})=>({number,title,youtubeId,course:course||(player==='youtube'?'YouTube':'MIT OpenCourseWare'),duration:duration||cues?.at(-1)?.end,cueCount:cues?.length||0,captionStatus:captionStatus||(cues?.length?'ready':'pending'),unavailable:!!unavailable}));
  }
  async downloadPlaylist(id){
    try{
      const {stdout}=await execute(path.join(this.root,'vendor','yt-dlp.exe'),['--ignore-config','--flat-playlist','--skip-download','--dump-single-json','--ignore-errors','--no-warnings','--socket-timeout','15','--retries','0','--extractor-retries','0','--playlist-end',String(PLAYLIST_LIMIT+1),'--',`https://www.youtube.com/playlist?list=${id}`],{windowsHide:true,timeout:90000,maxBuffer:16*1024*1024,encoding:'utf8'});
      const data=JSON.parse(stdout);
      if(!Array.isArray(data.entries))throw new Error('Missing playlist');
      return data;
    }catch{throw new AppError('재생목록을 읽지 못했습니다. 공개 또는 일부 공개 재생목록의 공유 주소를 확인하고 다시 시도하세요.','playlist_unavailable',422);}
  }
  async importPlaylist({url,folderId}){
    const id=youtubePlaylistId(url);await this.folders.check(folderId);
    if(this.playlistPending)throw new AppError('다른 재생목록을 가져오는 중입니다. 완료 후 다시 시도하세요.','busy',409);
    this.playlistPending=true;
    try{
      const data=await this.playlistMetadata(id);
      if(!Array.isArray(data?.entries)||!data.entries.length)throw new AppError('재생목록에 가져올 영상이 없습니다.','empty_playlist',422);
      if(data.entries.length>PLAYLIST_LIMIT)throw new AppError(`한 번에 ${PLAYLIST_LIMIT}개 이하의 재생목록을 가져올 수 있습니다. 더 작은 재생목록으로 나눠주세요.`,'playlist_too_large',422);
      const keys=[],skipped=[];let added=0,reused=0;
      for(const [index,entry]of data.entries.entries()){
        if(!/^[A-Za-z0-9_-]{11}$/.test(entry?.id||'')){skipped.push({position:index+1,title:String(entry?.title||'접근할 수 없는 영상').slice(0,200)});continue;}
        const key='yt_'+entry.id;if(keys.includes(key))continue;
        await this.mutateLecture(key,async()=>{
          try{await this.get(key);reused++;return;}catch(error){if(error.code!=='not_found')throw error;}
          const unavailable=['private','premium_only','subscriber_only','needs_auth'].includes(entry.availability)||/^\[(?:private|deleted) video\]$/i.test(entry.title||'');
          const item={number:key,title:String(entry.title||`YouTube · ${entry.id}`).slice(0,200),course:String(entry.channel||entry.uploader||data.channel||data.uploader||'YouTube').slice(0,200),youtubeId:entry.id,player:'youtube',pageUrl:`https://www.youtube.com/watch?v=${entry.id}`,duration:Number.isFinite(entry.duration)?entry.duration:undefined,cues:[],captionStatus:unavailable?'unavailable':'pending',unavailable,createdAt:new Date().toISOString()};
          await atomicJSON(path.join(this.directory,key+'.json'),item);added++;
        });
        keys.push(key);
      }
      if(!keys.length)throw new AppError('재생목록의 영상을 가져올 수 없습니다. 공개 상태를 확인하세요.','empty_playlist',422);
      const folder=await this.folders.addPlaylist({id,title:data.title,keys,folderId});
      return {folder,added,reused,skipped,total:keys.length,firstLectureId:keys[0]};
    }finally{this.playlistPending=false;}
  }
  async importIntoFolder(body){
    await this.folders.check(body.folderId);
    const result=await this.import(body);
    if(body.folderId)await this.folders.attach(body.folderId,[result.lecture.number]);
    return result;
  }
  prepareCaptions({lectureId,subtitleText}){
    const key=String(lectureId);
    if(!key.startsWith('yt_')||!validKey(key))throw new AppError('YouTube 강의를 선택하세요.');
    // Multiple tabs opening the same lecture share one caption request.
    if(this.captionRequests.has(key)){
      if(typeof subtitleText==='string'&&subtitleText.trim())throw new AppError('다른 창에서 이 강의의 자막을 준비하고 있습니다. 완료 후 파일을 다시 추가하세요.','busy',409);
      return this.captionRequests.get(key);
    }
    const request=(async()=>{
      try{return await this.import({url:`https://www.youtube.com/watch?v=${key.slice(3)}`,subtitleText});}
      catch(error){
        if(error instanceof AppError)await this.mutateLecture(key,async()=>{
          const item=await this.get(key);if(item.cues.length)return;
          item.captionStatus='failed';item.captionError=error.message;
          await atomicJSON(path.join(this.directory,key+'.json'),item);
        });
        throw error;
      }
    })();
    this.captionRequests.set(key,request);
    return request.finally(()=>{this.captionRequests.delete(key);});
  }
  async downloadMetadata(id){
    try{
      const {stdout}=await execute(path.join(this.root,'vendor','yt-dlp.exe'),['--ignore-config','--no-playlist','--skip-download','--dump-single-json','--no-warnings','--socket-timeout','15','--retries','0','--extractor-retries','0','--js-runtimes',`node:${process.execPath}`,'--',`https://www.youtube.com/watch?v=${id}`],{windowsHide:true,timeout:75000,maxBuffer:16*1024*1024,encoding:'utf8'});
      return JSON.parse(stdout);
    }catch{throw new AppError('YouTube에서 자막을 가져오지 못했습니다. 영상의 영어 SRT/VTT 파일을 넣어 등록할 수 있습니다.','youtube_unavailable',422);}
  }
  async import({url,subtitleText,title}){
    const id=youtubeId(url),key='yt_'+id;
    return this.mutateLecture(key,async()=>{
      let existing;
      try{existing=await this.get(key);if(existing.cues?.length)return {lecture:existing,existing:true};}catch(e){if(e.code!=='not_found')throw e;}
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
      const lecture={...existing,number:key,title:typeof title==='string'&&title.trim()?title.trim().slice(0,200):existing?.title||metadata?.title||`YouTube · ${id}`,course:existing?.course||metadata?.channel||metadata?.author_name||'YouTube lecture',youtubeId:id,player:'youtube',pageUrl:canonical,captionSource,cues,captionStatus:'ready',captionError:undefined,createdAt:existing?.createdAt||new Date().toISOString()};
      await atomicJSON(path.join(this.directory,key+'.json'),lecture);return {lecture,existing:false};
    });
  }
}
