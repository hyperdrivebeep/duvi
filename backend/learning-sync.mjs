import {readFile,readdir,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {atomicJSON} from './vault.mjs';
import {AppError} from './chatgpt-auth.mjs';
import * as v from './learning-validation.mjs';

// Lightweight learning-state sync through a folder the learner chooses (for example OneDrive).
// Each PC writes only its own file; lectures, translations, drafts and credentials are never included.
export const SYNC_FORMAT='duvi-learning-sync';
const FILE=/^duvi-sync-([A-Za-z0-9-]{1,64})\.json$/;
const deviceId=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9-]{1,64}$/.test(value))v.invalid('기기 식별자 형식을 확인하세요.');return value;};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const time=value=>Date.parse(value)||0;
async function read(file,fallback){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
async function exists(file){try{await stat(file);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}

/** Text and anchor of a record; the review schedule is compared separately through reviews. */
function content(record){const {reviewDueAt,...rest}=v.snapshot(record);return JSON.stringify(rest);}
/** True when `newer` already contains every edit and review of `older` (copied from it, then changed). */
export function descends(newer,older){
  if(newer.revision<older.revision)return false;
  const reviews=new Set(newer.reviews.map(row=>row.id));if(!older.reviews.every(row=>reviews.has(row.id)))return false;
  const base=content(older);
  return content(newer)===base||newer.history.some(entry=>entry.revision>=older.revision&&content(entry.record)===base);
}
const later=(a,b)=>!a?b:!b?a:time(a)>=time(b)?a:b;
export function mergeRecord(local,incoming,{localDevice,incomingDevice}){
  if(JSON.stringify(local)===JSON.stringify(incoming))return {record:local,result:'same'};
  if(descends(incoming,local))return {record:{...incoming,revision:Math.max(incoming.revision,local.revision+1)},result:'updated'};
  if(descends(local,incoming))return {record:local,result:'kept'};
  // Both PCs changed the record: keep the later edit as current and the other edit as a labelled history entry.
  const incomingWins=time(incoming.updatedAt)>time(local.updatedAt),winner=incomingWins?incoming:local,loser=incomingWins?local:incoming;
  const top=Math.max(local.revision,incoming.revision,...winner.history.map(entry=>entry.revision));
  const history=[...winner.history,{revision:top+1,at:loser.updatedAt,record:v.snapshot(loser),device:incomingWins?localDevice:incomingDevice}].slice(-500);
  const reviews=[...new Map([...local.reviews,...incoming.reviews].map(row=>[row.id,row])).values()].sort((a,b)=>time(a.at)-time(b.at)).slice(-500);
  const first=time(local.createdAt)<=time(incoming.createdAt)?local:incoming;
  return {record:{...winner,revision:top+2,history,reviews,reviewDueAt:later(local.reviewDueAt,incoming.reviewDueAt),createdAt:first.createdAt,originalExplanation:first.originalExplanation},result:'conflict'};
}
export function mergeLearning(current,incoming,devices){
  const summary={added:0,updated:0,kept:0,same:0,conflicts:[],progressAdded:0,progressUpdated:0};
  const records=new Map(current.records.map(row=>[row.id,row]));
  for(const row of incoming.records){
    const local=records.get(row.id);if(!local){records.set(row.id,row);summary.added++;continue;}
    const {record,result}=mergeRecord(local,row,devices);records.set(row.id,record);
    if(result==='conflict')summary.conflicts.push({id:row.id,question:record.question||record.title||record.explanation.slice(0,80)});else summary[result]++;
  }
  const progress={...current.progress};
  for(const [key,row]of Object.entries(incoming.progress)){
    const local=progress[key];
    if(!local){progress[key]=row;summary.progressAdded++;}
    else if(time(row.updatedAt)>time(local.updatedAt)){progress[key]={...row,revision:Math.max(local.revision,row.revision)};summary.progressUpdated++;}
  }
  return {learning:{...current,records:[...records.values()],progress},summary};
}

export class LearningSync{
  constructor({store,now=()=>Date.now(),hostname=os.hostname(),writer=atomicJSON}){
    Object.assign(this,{store,now,hostname,writer});this.file=path.join(store.root,'learning','sync-state.json');this.before=path.join(store.root,'learning','before-sync.json');this.tokens=new Map();
  }
  async settings(){
    const saved=await read(this.file,null);
    if(saved){v.keys(saved,['schemaVersion','deviceId','deviceName','folder']);deviceId(saved.deviceId);return saved;}
    const created={schemaVersion:1,deviceId:randomUUID(),deviceName:String(this.hostname||'PC').slice(0,80),folder:null};await this.writer(this.file,created);return created;
  }
  async checkFolder(value){
    v.text(value,1000);if(!path.isAbsolute(value))v.invalid('동기화 폴더는 C:\\Users\\…처럼 전체 경로로 적어 주세요.');
    let folder;try{folder=await realpath(value);if(!(await stat(folder)).isDirectory())throw new Error();}catch{v.invalid('폴더를 찾을 수 없습니다. 클라우드 폴더 안에 Duvi-sync 같은 폴더를 먼저 만드세요.');}
    const inside=(parent,child)=>{const relative=path.relative(parent,child);return relative===''||(!relative.startsWith('..')&&!path.isAbsolute(relative));};
    if(inside(await realpath(this.store.root),folder))v.invalid('Duvi 데이터 폴더 안은 동기화 폴더로 쓸 수 없습니다.');
    // Personal learning data must never land in a Git work tree such as the public Duvi repository.
    for(let directory=folder;;directory=path.dirname(directory)){
      if(await exists(path.join(directory,'.git')))v.invalid('Git 저장소 안의 폴더는 동기화 폴더로 쓸 수 없습니다. 개인 기록이 공개될 수 있습니다.');
      if(path.dirname(directory)===directory)break;
    }
    return folder;
  }
  setFolder(body){
    v.keys(body,['folder']);
    return this.store.exclusive(async()=>{const settings=await this.settings();settings.folder=body.folder===''||body.folder===null?null:await this.checkFolder(body.folder);await this.writer(this.file,settings);return this.status(settings);});
  }
  async status(settings){
    settings??=await this.settings();const peers=[];
    if(settings.folder){
      let names=[];try{names=await readdir(settings.folder);}catch{return {...settings,peers,folderError:'동기화 폴더를 읽을 수 없습니다. 폴더가 있는지 확인하세요.'};}
      for(const name of names.sort()){
        const match=name.match(FILE);if(!match||match[1]===settings.deviceId)continue;
        try{const peer=this.parse(await read(path.join(settings.folder,name),null),match[1]);peers.push({deviceId:peer.deviceId,deviceName:peer.deviceName,exportedAt:peer.exportedAt,records:peer.learning.records.length});}
        catch{peers.push({deviceId:match[1],error:'읽을 수 없는 동기화 파일입니다.'});}
      }
    }
    return {...settings,peers};
  }
  get(){return this.store.exclusive(()=>this.status());}
  parse(value,expectedDevice){
    v.bounded(value);v.keys(value,['format','schemaVersion','deviceId','deviceName','exportedAt','learning']);
    if(value.format!==SYNC_FORMAT||value.schemaVersion!==1)v.invalid('지원하지 않는 동기화 파일입니다.');
    if(deviceId(value.deviceId)!==expectedDevice)v.invalid('파일 이름과 기기 식별자가 다릅니다.');
    return {deviceId:value.deviceId,deviceName:v.text(value.deviceName,80),exportedAt:v.date(value.exportedAt),learning:v.state(value.learning)};
  }
  export(){
    return this.store.exclusive(async()=>{
      const settings=await this.settings();if(!settings.folder)throw new AppError('먼저 동기화 폴더를 정하세요.','sync_folder_required',409);
      const learning=await this.store.read(),exportedAt=new Date(this.now()).toISOString(),name=`duvi-sync-${settings.deviceId}.json`;
      await this.writer(path.join(settings.folder,name),{format:SYNC_FORMAT,schemaVersion:1,deviceId:settings.deviceId,deviceName:settings.deviceName,exportedAt,learning});
      return {file:name,exportedAt,records:learning.records.length,progress:Object.keys(learning.progress).length};
    });
  }
  preview(body){
    v.keys(body,['deviceId']);deviceId(body.deviceId);
    return this.store.exclusive(async()=>{
      const settings=await this.settings();if(!settings.folder)throw new AppError('먼저 동기화 폴더를 정하세요.','sync_folder_required',409);
      if(body.deviceId===settings.deviceId)v.invalid('이 PC의 파일은 가져올 수 없습니다.');
      const raw=await read(path.join(settings.folder,`duvi-sync-${body.deviceId}.json`),null);if(!raw)throw new AppError('다른 PC의 동기화 파일을 찾을 수 없습니다.','not_found',404);
      const peer=this.parse(raw,body.deviceId),current=await this.store.read(),{summary}=mergeLearning(current,peer.learning,{localDevice:settings.deviceName,incomingDevice:peer.deviceName});
      const now=this.now();for(const [key,entry]of this.tokens)if(entry.expires<=now)this.tokens.delete(key);
      if(this.tokens.size>=8)this.tokens.delete(this.tokens.keys().next().value);
      const token=randomBytes(32).toString('base64url');this.tokens.set(token,{peer,fingerprint:hash(current),expires:now+600000,localDevice:settings.deviceName});
      return {token,revision:current.revision,deviceName:peer.deviceName,exportedAt:peer.exportedAt,summary};
    });
  }
  commit(body){
    v.keys(body,['revision','token']);v.text(body.token,100);const entry=this.tokens.get(body.token);
    let summary;
    return this.store.change(body.revision,async current=>{
      if(!entry||entry.expires<=this.now())throw new AppError('동기화 미리보기가 만료되었습니다. 다시 확인하세요.','invalid_preview',409);
      if(entry.fingerprint!==hash(current))throw new AppError('미리보기 이후 기록이 바뀌었습니다. 다시 확인하세요.','import_conflict',409);
      const merged=mergeLearning(current,entry.peer.learning,{localDevice:entry.localDevice,incomingDevice:entry.peer.deviceName});summary=merged.summary;
      // Recovery copy of the state right before this explicitly confirmed merge.
      await this.writer(this.before,structuredClone(current));
      current.records=merged.learning.records;current.progress=merged.learning.progress;
    }).then(state=>{this.tokens.delete(body.token);return {state,summary};});
  }
}
