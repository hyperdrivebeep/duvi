import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJSON} from './vault.mjs';
import {AppError} from './chatgpt-auth.mjs';
import * as v from './learning-validation.mjs';

const queues=new Map();
export class LearningStore{
  constructor({root,writer=atomicJSON,now=()=>Date.now()}){this.root=path.resolve(root);this.file=path.join(this.root,'learning','state.json');this.writer=writer;this.now=now;}
  exclusive(callback){
    const operation=(queues.get(this.file)||Promise.resolve()).then(callback);
    const settled=operation.catch(()=>{});queues.set(this.file,settled);
    settled.finally(()=>{if(queues.get(this.file)===settled)queues.delete(this.file);});return operation;
  }
  async read(){
    try{return v.state(JSON.parse(await readFile(this.file,'utf8')));}
    catch(error){if(error.code==='ENOENT')return {schemaVersion:1,revision:0,records:[],progress:{},settings:{}};throw error;}
  }
  get(){return this.exclusive(()=>this.read());}
  checkRevision(current,revision){v.integer(revision);if(current.revision!==revision)throw new AppError('다른 창에서 학습 기록이 변경되었습니다. 새로고침 후 변경 내용을 확인하세요.','revision_conflict',409,{revision:current.revision});}
  change(revision,callback){
    return this.exclusive(async()=>{
      const current=await this.read();this.checkRevision(current,revision);
      await callback(current);current.revision++;const next=v.state(current);
      await this.writer(this.file,next);return next;
    });
  }
  saveRecord(body){
    v.keys(body,['revision','recordRevision','record']);const input=v.recordInput(body.record);
    const recordRevision=input.id?v.integer(body.recordRevision,1):undefined;
    if(!input.id&&body.recordRevision!==undefined)v.invalid('새 기록에는 기존 기록 버전을 지정할 수 없습니다.');
    return this.change(body.revision,current=>{
      const at=new Date(this.now()).toISOString();
      const previous=input.id?current.records.find(row=>row.id===input.id):null;
      if(input.id&&!previous)throw new AppError('학습 기록을 찾을 수 없습니다.','not_found',404);
      if(previous){
        if(previous.revision!==recordRevision)throw new AppError('편집을 시작한 뒤 이 기록이 변경되었습니다. 최신 저장본과 초안을 비교하세요.','revision_conflict',409,{recordId:previous.id,recordRevision:previous.revision});
        if(previous.history.length>=500)v.invalid('수정 이력이 가득 찼습니다. 새 기록을 만들어 주세요.');
        const history=[...previous.history,{revision:previous.revision,at:previous.updatedAt,record:v.snapshot(previous)}];
        Object.assign(previous,input,{revision:previous.revision+1,updatedAt:at,history});
      }else current.records.push({...input,id:randomUUID(),schemaVersion:1,revision:1,createdAt:at,updatedAt:at,originalExplanation:input.explanation,history:[],reviews:[]});
    });
  }
  setProgress(body){
    v.keys(body,['revision','resourceId','status']);v.id(body.resourceId);v.choice(body.status,v.STATUSES);
    return this.change(body.revision,current=>{current.progress[body.resourceId]={status:body.status,revision:(current.progress[body.resourceId]?.revision||0)+1,updatedAt:new Date(this.now()).toISOString()};});
  }
  review(body){
    v.keys(body,['revision','id','reflection','intervalDays','help']);v.id(body.id);v.text(body.reflection);v.integer(body.intervalDays,1,3650);v.choice(body.help,v.HELP);
    return this.change(body.revision,current=>{
      const record=current.records.find(row=>row.id===body.id);if(!record)throw new AppError('학습 기록을 찾을 수 없습니다.','not_found',404);
      if(record.reviews.length>=500)v.invalid('복습 이력이 가득 찼습니다. 새 기록을 만들어 주세요.');
      const now=this.now(),at=new Date(now).toISOString(),nextDueAt=new Date(now+body.intervalDays*86400000).toISOString();
      record.reviews.push({id:randomUUID(),at,reflection:body.reflection,intervalDays:body.intervalDays,help:body.help,nextDueAt});
      record.reviewDueAt=nextDueAt;record.updatedAt=at;record.revision++;
    });
  }
}
