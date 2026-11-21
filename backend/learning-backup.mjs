import {readFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {atomicJSON} from './vault.mjs';
import {AppError} from './chatgpt-auth.mjs';
import {backup,lectureKey} from './learning-backup-schema.mjs';
import * as v from './learning-validation.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function read(file,fallback){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
// Numeric file order keeps lectures 1, 2, ... 10 in sequence, so a fallback folder built from it matches the sidebar.
const byName=(a,b)=>a.localeCompare(b,'en',{numeric:true});
async function names(directory){try{return await readdir(directory);}catch(error){if(error.code==='ENOENT')return [];throw error;}}
function merge(local,incoming,key,replace){const rows=new Map(local.map(row=>[key(row),row]));for(const row of incoming)if(replace||!rows.has(key(row)))rows.set(key(row),row);return [...rows.values()];}
export function checkAssetJobs(library,translations){
  if(translations?.starting||translations?.job?.status==='running'||library?.playlistPending||library?.pending?.size||library?.captionRequests?.size)
    throw new AppError('강의 또는 번역 작업이 끝난 뒤 다시 시도하세요.','busy',409);
}
export class LearningBackup{
  constructor({store,library,translations,writer=atomicJSON,now=()=>Date.now()}){Object.assign(this,{store,library,translations,writer,now});this.root=store.root;this.tokens=new Map();this.journal=path.join(this.root,'learning','import-journal.json');}
  async recover(){
    const journal=await read(this.journal,null);if(!journal)return;
    v.keys(journal,['entries']);v.array(journal.entries,1100);
    for(const entry of journal.entries){v.keys(entry,['file','before']);this.target(entry.file);}
    for(const entry of [...journal.entries].reverse()){
      const file=this.target(entry.file);if(entry.before===null)await rm(file,{force:true});else await atomicJSON(file,entry.before);
    }
    await rm(this.journal,{force:true});
  }
  target(relative){
    if(typeof relative!=='string'||! /^(?:learning\/state\.json|data\/(?:catalog|[1-9]|1[0-9]|2[0-6])\.json|library\/(?:folders|yt_[A-Za-z0-9_-]{11})\.json|translations\/(?:[1-9]|1[0-9]|2[0-6]|yt_[A-Za-z0-9_-]{11})\.json)$/.test(relative))v.invalid('백업 경로가 올바르지 않습니다.');
    return path.join(this.root,relative);
  }
  busy(){checkAssetJobs(this.library,this.translations);}
  async capture(){
    this.busy();const learning=await this.store.read(),library=[],translations=[];
    for(const directory of ['data','library'])for(const name of (await names(path.join(this.root,directory))).sort(byName)){
      if(!/\.json$/.test(name))continue;const key=name.slice(0,-5);
      if((directory==='data'&&/^(?:[1-9]|1[0-9]|2[0-6])$/.test(key))||(directory==='library'&&/^yt_[A-Za-z0-9_-]{11}$/.test(key)))library.push(await read(path.join(this.root,directory,name),null));
    }
    for(const name of (await names(path.join(this.root,'translations'))).sort(byName))if(/^(?:[1-9]|1[0-9]|2[0-6]|yt_[A-Za-z0-9_-]{11})\.json$/.test(name))translations.push(await read(path.join(this.root,'translations',name),null));
    const mitIds=library.filter(row=>!String(row.number).startsWith('yt_')).map(row=>String(row.number));
    const folders=(await read(path.join(this.root,'library','folders.json'),{folders:mitIds.length?[{id:'mit-python',name:'MIT Python 기초',lectureIds:mitIds}]:[]})).folders;
    return backup({schemaVersion:1,exportedAt:new Date(this.now()).toISOString(),learning,library,folders,translations},{project:true});
  }
  fingerprint(value){return hash({...value,exportedAt:''});}
  export(){return this.store.exclusive(async()=>{await this.recover();return this.capture();});}
  preview(body){
    v.keys(body,['backup']);const incoming=backup(body.backup);
    return this.store.exclusive(async()=>{
      await this.recover();const current=await this.capture(),counts={},conflicts={};
      const groups={records:[current.learning.records,incoming.learning.records,row=>row.id],chats:[current.learning.chats,incoming.learning.chats,row=>row.id],progress:[Object.keys(current.learning.progress),Object.keys(incoming.learning.progress),row=>row],lectures:[current.library,incoming.library,row=>String(row.number)],folders:[current.folders,incoming.folders,row=>row.id],translations:[current.translations,incoming.translations,row=>String(row.lecture)]};
      for(const [name,[local,rows,key]]of Object.entries(groups)){const ids=new Set(local.map(key));counts[name]=rows.length;conflicts[name]=rows.map(key).filter(id=>ids.has(id));}
      const now=this.now();for(const [key,entry]of this.tokens)if(entry.expires<=now)this.tokens.delete(key);
      if(this.tokens.size>=8)this.tokens.delete(this.tokens.keys().next().value);
      const token=randomBytes(32).toString('base64url'),expires=now+600000;
      this.tokens.set(token,{incoming,fingerprint:this.fingerprint(current),revision:current.learning.revision,expires});
      return {token,revision:current.learning.revision,expiresAt:new Date(expires).toISOString(),counts,conflicts,modes:['merge','replace']};
    });
  }
  commit(body){
    v.keys(body,['revision','token','mode']);v.text(body.token,100);v.choice(body.mode,['merge','replace']);
    return this.store.exclusive(async()=>{
      await this.recover();const entry=this.tokens.get(body.token);
      if(!entry||entry.expires<=this.now())throw new AppError('가져오기 미리보기가 만료되었습니다. 다시 확인하세요.','invalid_preview',409);
      const current=await this.capture();this.store.checkRevision(current.learning,body.revision);
      if(entry.revision!==body.revision||entry.fingerprint!==this.fingerprint(current))throw new AppError('미리보기 이후 데이터가 변경되었습니다. 다시 확인하세요.','import_conflict',409);
      const incoming=backup(entry.incoming),replace=body.mode==='replace';
      if(replace){
        const localRecords=new Map(current.learning.records.map(row=>[row.id,row]));
        incoming.learning.records=incoming.learning.records.map(row=>localRecords.has(row.id)?{...row,revision:Math.max(row.revision,localRecords.get(row.id).revision)+1}:row);
      }
      const learning=v.state({...current.learning,revision:current.learning.revision+1,records:merge(current.learning.records,incoming.learning.records,row=>row.id,replace),chats:merge(current.learning.chats,incoming.learning.chats,row=>row.id,replace),progress:replace?{...current.learning.progress,...incoming.learning.progress}:{...incoming.learning.progress,...current.learning.progress}});
      const combined=backup({schemaVersion:1,exportedAt:new Date(this.now()).toISOString(),learning,library:merge(current.library,incoming.library,row=>String(row.number),replace),folders:merge(current.folders,incoming.folders,row=>row.id,replace),translations:merge(current.translations,incoming.translations,row=>String(row.lecture),replace)});
      const files=[];
      const existingLectures=new Set(current.library.map(row=>String(row.number)));
      const selectedLectures=incoming.library.filter(row=>replace||!existingLectures.has(String(row.number)));
      for(const row of selectedLectures){const key=lectureKey(row.number);files.push({file:`${key.startsWith('yt_')?'library':'data'}/${key}.json`,after:row});}
      const catalog=await read(path.join(this.root,'data','catalog.json'),[]);
      const catalogRows=combined.library.filter(row=>!String(row.number).startsWith('yt_')).map(row=>({number:row.number,title:row.title,duration:row.duration??row.cues.at(-1)?.end??0,cueCount:row.cues.length}));
      files.push({file:'data/catalog.json',after:merge(catalog,catalogRows,row=>String(row.number),replace).sort((a,b)=>Number(a.number)-Number(b.number))});
      files.push({file:'library/folders.json',after:{version:1,folders:combined.folders}});
      const existingTranslations=new Set(current.translations.map(row=>String(row.lecture)));
      for(const row of incoming.translations)if(replace||!existingTranslations.has(String(row.lecture)))files.push({file:`translations/${lectureKey(row.lecture)}.json`,after:row});
      files.push({file:'learning/state.json',after:learning});
      const entries=await Promise.all(files.map(async row=>({file:row.file,before:await read(this.target(row.file),null)})));
      // The fixed recovery snapshot is replaced only by the next explicitly committed import.
      await atomicJSON(path.join(this.root,'learning','before-import.json'),current);
      await atomicJSON(this.journal,{entries});
      try{for(const row of files)await this.writer(this.target(row.file),row.after);await rm(this.journal,{force:true});}
      catch(error){await this.recover();throw error;}
      this.tokens.delete(body.token);return learning;
    });
  }
}
