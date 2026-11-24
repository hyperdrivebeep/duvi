import {Worker} from 'node:worker_threads';

// Executes the FIXED code of a generated check question once, at generation time, to fix its answer to the real
// output. Learner-written text is never passed here. Each snippet gets a fresh worker (fresh interpreter) that is
// terminated after it answers or when the hard timeout passes.
export const RUNNER_LIMITS=Object.freeze({loadMs:60000,runMs:3000,maxOutput:4000,code:4000,memoryMb:256});
const WORKER=new URL('./python-runner-worker.mjs',import.meta.url);
/** → {status:'executed', output, error, truncated} | {status:'timeout'|'unavailable', reason} */
export function runPython(code,{loadMs=RUNNER_LIMITS.loadMs,runMs=RUNNER_LIMITS.runMs,maxOutput=RUNNER_LIMITS.maxOutput}={}){
  if(typeof code!=='string'||!code.trim()||code.length>RUNNER_LIMITS.code)return Promise.resolve({status:'unavailable',reason:'실행할 코드가 없거나 너무 깁니다.'});
  return new Promise(resolve=>{
    let timer,settled=false;
    const worker=new Worker(WORKER,{workerData:{maxOutput},resourceLimits:{maxOldGenerationSizeMb:RUNNER_LIMITS.memoryMb},stdout:true,stderr:true});
    const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);worker.terminate().catch(()=>{});resolve(result);};
    timer=setTimeout(()=>finish({status:'unavailable',reason:'Python 실행 환경(Pyodide)을 불러오지 못했습니다: 시간 초과'}),loadMs);
    worker.on('message',message=>{
      if(message.type==='ready'){clearTimeout(timer);timer=setTimeout(()=>finish({status:'timeout',reason:`${runMs/1000}초 안에 끝나지 않아 멈췄습니다.`}),runMs);worker.postMessage({code});}
      else if(message.type==='done')finish({status:'executed',output:message.output,error:message.error,truncated:message.truncated});
      else if(message.type==='unavailable')finish({status:'unavailable',reason:`Python 실행 환경(Pyodide)을 불러오지 못했습니다: ${message.reason}`});
    });
    worker.on('error',error=>finish({status:'unavailable',reason:`Python 실행 중 오류: ${String(error?.message||error).slice(0,200)}`}));
    worker.on('exit',()=>finish({status:'unavailable',reason:'Python 실행 환경이 예기치 않게 종료되었습니다.'}));
  });
}
/** The answer a run establishes: stdout, plus the exception line when the snippet raised. */
export function executedAnswer(result){return [result.output.replace(/\s+$/,''),result.error||''].filter(Boolean).join('\n');}
