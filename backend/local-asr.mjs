import {spawn} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {access,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {PassThrough} from 'node:stream';
import {AppError} from './chatgpt-auth.mjs';

const engineScript=fileURLToPath(new URL('../scripts/local-asr.py',import.meta.url));
const formats=new Set(['wav','mp3','m4a','mp4','aac','flac','ogg','opus','webm','mkv']);
export const ASR_MODELS=Object.freeze(['tiny','base','small','medium']);
const maxBytes=1024**3;
const errors={
  asr_setup:['로컬 음성 인식 엔진이 설치되지 않았습니다. npm run setup:asr를 실행한 뒤 다시 시도하세요.',503],
  asr_model:['선택한 모델이 없습니다. npm run setup:asr -- --model 모델이름을 실행하세요.',503],
  asr_media:['음성을 읽지 못했습니다. 손상되지 않은 지원 형식의 오디오 또는 동영상 파일을 선택하세요.',422],
  asr_duration:['2시간 이내의 파일을 선택하세요.',422],
  asr_silence:['말소리가 감지되지 않았습니다. 음성이 있는 파일을 확인하세요.',422],
  asr_disk:['디스크 공간이 부족합니다. 공간을 확보한 후 다시 시도하세요.',507],
  asr_timeout:['시간 제한에 도달했습니다. 더 짧은 파일이나 더 작은 모델을 선택하세요.',408],
  asr_cancelled:['로컬 자막 만들기를 취소했습니다.',409],
  asr_engine:['로컬 음성 인식에 실패했습니다. 설치를 확인하거나 더 작은 모델로 다시 시도하세요.',500],
};
const asrError=code=>new AppError(...[errors[code][0],code,errors[code][1]]);
const translateError=error=>error instanceof AppError?error:
  asrError(error?.code==='ENOSPC'||error?.code==='EDQUOT'?'asr_disk':'asr_engine');

function engineFromEnv({home=process.env.DUVI_ASR_HOME||fileURLToPath(new URL('../.asr',import.meta.url))}={}){
  const python=path.resolve(home,'venv',...process.platform==='win32'?['Scripts','python.exe']:['bin','python']);
  return {
    async check(model){
      await access(python).catch(()=>{throw asrError('asr_setup');});
      for(const file of ['config.json','model.bin','tokenizer.json']){
        await access(path.resolve(home,'models',model,file)).catch(()=>{throw asrError('asr_model');});
      }
    },
    transcribe({file,model,signal,progress}){
      return new Promise((resolve,reject)=>{
        signal.throwIfAborted();
        const child=spawn(python,['-I','-B',engineScript,file,path.resolve(home,'models',model)],{
          signal,killSignal:'SIGKILL',windowsHide:true,stdio:['ignore','pipe','ignore'],
        });
        let bytes=0,result,reportedError,spawnError,buffer='',invalid=false;
        child.on('error',error=>{spawnError=error;});
        child.stdout.setEncoding('utf8').on('data',chunk=>{
          bytes+=Buffer.byteLength(chunk);
          if(bytes>12*1024*1024){invalid=true;child.kill('SIGKILL');return;}
          buffer+=chunk;
          let end;
          while((end=buffer.indexOf('\n'))>=0){
            const line=buffer.slice(0,end);buffer=buffer.slice(end+1);
            try{
              const event=JSON.parse(line);
              if(event.type==='progress')progress(event.stage,event.percent);
              else if(event.type==='result')result=event.cues;
              else if(event.type==='error'&&Object.hasOwn(errors,event.code))reportedError=asrError(event.code);
            }catch{invalid=true;}
          }
        });
        child.on('close',code=>{
          if(signal.aborted)reject(signal.reason);
          else if(['ENOENT','EACCES'].includes(spawnError?.code))reject(asrError('asr_setup'));
          else if(reportedError)reject(reportedError);
          else if(code===0&&!invalid&&Array.isArray(result))resolve(result);
          else reject(asrError('asr_engine'));
        });
      });
    },
  };
}

const stages=new Set(['decoding','loading','transcribing']);
export class LocalASR{
  constructor({library,withAssets,engine=engineFromEnv(),tempRoot=tmpdir(),timeout=2*60*60*1000}){
    Object.assign(this,{library,withAssets,engine,tempRoot,timeout});
    this.jobs=new Map();
  }
  status(owner,key){
    const job=this.jobs.get(owner+':'+key);
    if(!job)return null;
    const {state,stage,percent,code,message}=job;
    return {state,stage,percent,code,message};
  }
  cancel(owner,key){
    const job=this.jobs.get(owner+':'+key);
    if(job&&job.state==='running'&&job.stage!=='saving')job.controller.abort(asrError('asr_cancelled'));
    return this.status(owner,key);
  }
  shutdown(){
    this.stopping=true;
    if(this.active)this.cancel(this.active.owner,this.active.key);
    return this.active?.done;
  }
  async start(owner,req,key){
    if(req.headers['x-asr-rights']!=='confirmed')throw new AppError('이 음성을 사용할 권리가 있음을 확인하세요.','asr_rights',400);
    const model=req.headers['x-asr-model']||'small',format=req.headers['x-asr-format'];
    if(!ASR_MODELS.includes(model))throw new AppError('지원하는 모델을 선택하세요.','asr_bad_model',400);
    const size=Number(req.headers['content-length']);
    // Node's HTTP framing limits this stream to the declared content length.
    if(!Number.isSafeInteger(size)||size<1||size>maxBytes)throw new AppError('1GiB 이하의 비어 있지 않은 파일을 선택하세요.','asr_size',413);
    if(req.headers['content-type']!=='application/octet-stream'||!formats.has(format))throw asrError('asr_media');
    const lecture=await this.withAssets(()=>this.library.get(key));
    this.library.checkLocalASR(key,lecture);
    if(this.stopping||this.active)throw new AppError('이미 로컬 자막을 만드는 중입니다. 완료하거나 취소한 뒤 다시 시도하세요.','asr_busy',409);
    const id=owner+':'+key,controller=new AbortController(),{signal}=controller;
    const job={owner,key,controller,state:'running',stage:'receiving',percent:null};
    this.active=job;
    this.jobs.delete(id);
    this.jobs.set(id,job);
    if(this.jobs.size>64)this.jobs.delete(this.jobs.keys().next().value);
    const timer=setTimeout(()=>controller.abort(asrError('asr_timeout')),this.timeout).unref();
    let directory;
    let finish;
    job.done=new Promise(resolve=>{finish=resolve;});
    const cleanup=async()=>{
      if(directory){await rm(directory,{recursive:true,force:true,maxRetries:4,retryDelay:100});directory=null;}
    };
    const settle=async(error)=>{
      try{await cleanup();}catch(cleanupError){error||=cleanupError;}
      clearTimeout(timer);
      if(error){
        const {code,message}=translateError(error);
        Object.assign(job,{state:code==='asr_cancelled'?'cancelled':'failed',code,message});
      }else Object.assign(job,{state:'completed',percent:100});
      this.active=null;
      finish();
    };
    try{
      await this.engine.check(model);
      signal.throwIfAborted();
      directory=await mkdtemp(path.join(this.tempRoot,'duvi-asr-'));
      const file=path.join(directory,'media.'+format);
      const input=new PassThrough();
      const interrupted=()=>input.destroy(new Error('Media upload interrupted'));
      req.once('close',()=>{if(!req.complete)interrupted();});
      // Keep the HTTP socket usable to report write failures such as ENOSPC.
      const write=pipeline(input,createWriteStream(file,{flags:'wx',mode:0o600}),{signal});
      req.pipe(input);
      try{await write;}
      finally{req.unpipe(input);req.resume();}
      job.stage='decoding';
      void (async()=>{
        try{
          const cues=await this.engine.transcribe({file,model,signal,progress:(stage,percent)=>{
            if(!stages.has(stage)||signal.aborted)return;
            job.stage=stage;
            job.percent=typeof percent==='number'&&Number.isFinite(percent)?Math.max(0,Math.min(99,percent)):null;
          }});
          signal.throwIfAborted();
          if(!cues.length)throw asrError('asr_silence');
          await cleanup();
          await this.withAssets(()=>this.library.saveLocalASR(key,cues,model,{signal,onCommit:()=>{job.stage='saving';clearTimeout(timer);}}));
          await settle();
        }catch(error){await settle(signal.aborted?signal.reason:error);}
      })();
      return this.status(owner,key);
    }catch(error){
      const failure=signal.aborted?signal.reason:translateError(error);
      await settle(failure);
      throw failure;
    }
  }
}
