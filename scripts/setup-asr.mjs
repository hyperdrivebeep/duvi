import {execFileSync} from 'node:child_process';
import {access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASR_MODELS} from '../backend/local-asr.mjs';

const args=process.argv.slice(2),model=args.length===0?'small':args[1];
if((args.length!==0&&(args.length!==2||args[0]!=='--model'))||!ASR_MODELS.includes(model)){
  console.error(`npm run setup:asr -- --model ${ASR_MODELS.join('|')}`);process.exit(1);
}
const home=path.resolve(process.env.DUVI_ASR_HOME||fileURLToPath(new URL('../.asr',import.meta.url)));
const venv=path.join(home,'venv'),windows=process.platform==='win32';
const python=path.join(venv,...windows?['Scripts','python.exe']:['bin','python']);
const run=(executable,options)=>execFileSync(executable,options,{stdio:'inherit'});
try{
  if(!await access(python).then(()=>true,()=>false)){
    if(windows)run('py',['-3.13','-m','venv',venv]);
    else run('python3.13',['-m','venv',venv]);
  }
  run(python,['-m','pip','install','faster-whisper==1.2.1','ctranslate2==4.9.1','av==16.1.0']);
  run(python,['-c','import sys; from faster_whisper.utils import download_model; download_model(sys.argv[1], output_dir=sys.argv[2])',model,path.join(home,'models',model)]);
  console.log(`로컬 음성 인식 준비 완료: ${model}`);
}catch{
  console.error('설치하지 못했습니다. Python 3.13(Windows는 py 실행기 포함)과 인터넷 연결, 디스크 여유를 확인하세요.');
  process.exitCode=1;
}
