import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Executes the FIXED code of a generated check question once, at generation time, to fix its answer to the real
// output. Learner-written text is never passed here. Each snippet gets a fresh Node process (fresh interpreter)
// started under the Node permission model; it is killed after it answers, on the hard timeout, or on cancel.
export const RUNNER_LIMITS=Object.freeze({loadMs:60000,runMs:3000,maxOutput:4000,code:4000,memoryMb:256});
const WORKER=fileURLToPath(new URL('./python-runner-worker.mjs',import.meta.url));
const PYODIDE=import.meta.resolve('pyodide'),PYODIDE_DIR=path.dirname(fileURLToPath(PYODIDE));
/**
 * Node flags of the runner process. With --permission every grant is off unless listed: the process may read only the
 * Pyodide package (Node 24 also lets it load its own entry file). Measured: nothing else is needed. It cannot write files, start processes or workers, load addons, use WASI or
 * the inspector. The permission model does not cover the network; the worker blocks it in JavaScript instead.
 */
export function runnerArgs(){return ['--permission',`--allow-fs-read=${PYODIDE_DIR}`,'--disallow-code-generation-from-strings','--no-experimental-sqlite','--no-addons',`--max-old-space-size=${RUNNER_LIMITS.memoryMb}`];}
/** → {status:'executed', output, error, truncated} | {status:'timeout'|'unavailable'|'cancelled', reason} */
export function runPython(code,{loadMs=RUNNER_LIMITS.loadMs,runMs=RUNNER_LIMITS.runMs,maxOutput=RUNNER_LIMITS.maxOutput,signal,pythonGuard=true}={}){
  if(typeof code!=='string'||!code.trim()||code.length>RUNNER_LIMITS.code)return Promise.resolve({status:'unavailable',reason:'실행할 코드가 없거나 너무 깁니다.'});
  if(signal?.aborted)return Promise.resolve({status:'cancelled',reason:'실행을 취소했습니다.'});
  return new Promise(resolve=>{
    // No inherited environment (it may hold credentials). Only the IPC channel is a pipe: a stdio pipe would give the
    // child a Pipe handle whose class can connect to or create host named pipes; failures are reported over IPC.
    const child=spawn(process.execPath,[...runnerArgs(),WORKER],{stdio:['ignore','ignore','ignore','ipc'],env:{},cwd:PYODIDE_DIR,windowsHide:true});
    let timer,result=null;
    // The promise settles only once the process is gone, so a timeout or cancel never leaves it running.
    const finish=value=>{
      if(result)return;result=value;clearTimeout(timer);signal?.removeEventListener('abort',abort);
      if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
    };
    const abort=()=>finish({status:'cancelled',reason:'실행을 취소했습니다.'});
    signal?.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>finish({status:'unavailable',reason:'Python 실행 환경(Pyodide)을 불러오지 못했습니다: 시간 초과'}),loadMs);
    child.on('message',message=>{
      if(message?.type==='ready'){clearTimeout(timer);timer=setTimeout(()=>finish({status:'timeout',reason:`${runMs/1000}초 안에 끝나지 않아 멈췄습니다.`}),runMs);}
      else if(message?.type==='done'){
        const output=String(message.output).slice(0,maxOutput);
        finish({status:'executed',output,error:message.error===null?null:String(message.error).slice(0,500),truncated:message.truncated===true||output.length<String(message.output).length});
      }
      else if(message?.type==='unavailable')finish({status:'unavailable',reason:`Python 실행 환경(Pyodide)을 불러오지 못했습니다: ${String(message.reason).slice(0,300)}`});
    });
    child.once('error',error=>{finish({status:'unavailable',reason:`Python 실행 환경을 시작하지 못했습니다: ${String(error?.message||error).slice(0,200)}`});resolve(result);});
    child.once('exit',()=>{finish({status:'unavailable',reason:'Python 실행 환경이 예기치 않게 종료되었습니다.'});resolve(result);});
    child.send({pyodideUrl:PYODIDE,code,maxOutput,pythonGuard});
  });
}
/** The answer a run establishes: stdout, plus the exception line when the snippet raised. */
export function executedAnswer(result){return [result.output.replace(/\s+$/,''),result.error||''].filter(Boolean).join('\n');}
