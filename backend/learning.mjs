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
    catch(error){if(error.code==='ENOENT')return v.emptyState();throw error;}
  }
  get(){return this.exclusive(()=>this.read());}
  checkRevision(current,revision){v.integer(revision);if(current.revision!==revision)throw new AppError('다른 창에서 학습 기록이 변경되었습니다. 새로고침 후 변경 내용을 확인하세요.','revision_conflict',409,{revision:current.revision});}
  change(revision,callback){return this.write(async current=>{this.checkRevision(current,revision);await callback(current);}).then(({state})=>state);}
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
      }else current.records.push(this.newRecord(input,at));
    });
  }
  newRecord(input,at){return {...input,id:randomUUID(),schemaVersion:1,revision:1,createdAt:at,updatedAt:at,originalExplanation:input.explanation,history:[],reviews:[]};}
  /** Server-side writes (chat turns) do not carry the browser's revision: the server owns their order. */
  write(callback){
    return this.exclusive(async()=>{
      const current=await this.read(),result=await callback(current);current.revision++;const next=v.state(current);
      await this.writer(this.file,next);return {state:next,result};
    });
  }
  /** Appends chat messages to a lecture thread, creating the thread when it does not exist yet. */
  async appendChat({threadId,lectureId,messages}){
    const {state,result:id}=await this.write(current=>{
      const at=new Date(this.now()).toISOString();let thread=threadId?current.chats.find(row=>row.id===threadId):null;
      if(thread&&thread.lectureId!==String(lectureId))v.invalid('다른 강의의 대화입니다.');
      if(!thread){
        if(current.chats.length>=v.CHAT_LIMITS.threads)throw new AppError('저장한 대화가 너무 많습니다. 백업한 뒤 오래된 대화를 정리하세요.','chat_full',409);
        thread={id:threadId||randomUUID(),lectureId:String(lectureId),title:'',createdAt:at,updatedAt:at,messages:[]};current.chats.push(thread);
      }
      if(thread.messages.length+messages.length>v.CHAT_LIMITS.messages)throw new AppError('이 대화가 가득 찼습니다. 새 대화를 시작하세요.','chat_full',409);
      thread.messages.push(...messages);thread.updatedAt=at;
      thread.title||=(messages.find(row=>row.role==='user')?.text||'').replace(/\s+/g,' ').trim().slice(0,60);
      return thread.id;
    });
    return {thread:state.chats.find(row=>row.id===id),revision:state.revision};
  }
  /** Turns a question and the tutor answer into one learning record and links the answer to it. */
  saveChatRecord({threadId,messageId,record}){
    return this.write(current=>{
      const thread=current.chats.find(row=>row.id===threadId),message=thread?.messages.find(row=>row.id===messageId);
      if(!message||message.role!=='assistant')throw new AppError('저장할 답변을 찾을 수 없습니다.','not_found',404);
      if(message.recordId&&current.records.some(row=>row.id===message.recordId))return message.recordId;
      const created=this.newRecord(v.recordInput(record),new Date(this.now()).toISOString());current.records.push(created);message.recordId=created.id;return created.id;
    }).then(({state,result})=>({state,recordId:result}));
  }
  setProgress(body){
    v.keys(body,['revision','resourceId','status','completed']);v.id(body.resourceId);v.choice(body.status,v.STATUSES);
    if(body.completed!==undefined&&typeof body.completed!=='boolean')v.invalid();
    return this.change(body.revision,current=>{const previous=current.progress[body.resourceId];current.progress[body.resourceId]={status:body.status,completed:body.completed??previous?.completed??false,revision:(previous?.revision||0)+1,updatedAt:new Date(this.now()).toISOString()};});
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
