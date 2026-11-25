import {execFile} from 'node:child_process';
import {readFile,readdir,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {DEFAULT_TEST_PATTERNS,inside,relativePath} from './learning-sources.mjs';

// Read-only evidence from the learner's configured repositories for 돌아보기: recent commits from `git log` and the
// latest test-result files (JUnit XML, e.g. pytest --junitxml). Git runs with fixed arguments, no shell and a timeout;
// nothing is executed, written or pushed in those repositories.
export const EVIDENCE_LIMITS=Object.freeze({commits:30,files:5,cases:200,xmlBytes:2*1024*1024,timeoutMs:5000});
export const NO_REPOS='설정된 저장소 없음';
const SEPARATOR='\u001f';
export function gitLogArgs(folder,count=EVIDENCE_LIMITS.commits){
  return ['--no-pager','-c','core.fsmonitor=false','-c','log.showSignature=false','-C',folder,'log',`-n${count}`,'--no-color','--no-decorate',`--format=%h${SEPARATOR}%cI${SEPARATOR}%s`];
}
function git(args,{timeoutMs=EVIDENCE_LIMITS.timeoutMs}={}){
  return new Promise((resolve,reject)=>execFile('git',args,{shell:false,windowsHide:true,timeout:timeoutMs,maxBuffer:1024*1024,encoding:'utf8',
    env:{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_PAGER:'',PAGER:''}},(error,stdout)=>error?reject(error):resolve(stdout)));
}
export function parseLog(text){
  return text.split(/\r?\n/).filter(Boolean).map(line=>{const [sha,date,...subject]=line.split(SEPARATOR);return {sha,date,subject:subject.join(SEPARATOR)};}).filter(row=>/^[0-9a-f]{4,40}$/.test(row.sha)&&Number.isFinite(Date.parse(row.date)));
}
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const decode=text=>text.replace(/&(amp|lt|gt|quot|apos);/g,(_,name)=>entities[name]);
const attribute=(attrs,name)=>{const match=new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);return match?decode(match[1]):'';};
/** JUnit XML → case list. Only element names and attributes are read; the XML is never evaluated. */
export function parseJUnit(xml){
  const cases=[];const pattern=/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;let match;
  while((match=pattern.exec(xml))&&cases.length<EVIDENCE_LIMITS.cases){
    const body=match[2]||'',status=/<(failure|error)\b/.test(body)?'failed':/<skipped\b/.test(body)?'skipped':'passed';
    const name=attribute(match[1],'name'),classname=attribute(match[1],'classname');cases.push({name:classname?`${classname}::${name}`:name,status});
  }
  const count=status=>cases.filter(row=>row.status===status).length;
  return {tests:cases.length,passed:count('passed'),failed:count('failed'),skipped:count('skipped'),cases};
}
/** Files matching simple patterns: directories are literal, `*` is allowed only in the file name. */
async function matches(folder,patterns){
  const found=[];
  for(const value of patterns){
    const parts=relativePath(value).split('/'),name=parts.pop(),directory=path.join(folder,...parts);
    const regex=new RegExp('^'+name.replace(/[.+?^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')+'$','i');
    let names=[];try{names=await readdir(directory);}catch{continue;}
    for(const entry of names.filter(row=>regex.test(row))){
      try{const file=await realpath(path.join(directory,entry)),info=await stat(file);if(inside(folder,file)&&info.isFile()&&info.size<=EVIDENCE_LIMITS.xmlBytes)found.push({file,relative:[...parts,entry].join('/'),mtime:info.mtime});}catch{}
    }
  }
  return [...new Map(found.map(row=>[row.file,row])).values()].sort((a,b)=>b.mtime-a.mtime).slice(0,EVIDENCE_LIMITS.files);
}
export class LearningEvidence{
  constructor({sources,runGit=git}){Object.assign(this,{sources,runGit});}
  async repo(entry){
    const result={label:entry.label,path:entry.path,commits:[],tests:[],errors:[]};
    let folder;try{folder=await this.sources.directory(entry.path);}catch{result.errors.push('저장소 폴더를 찾을 수 없습니다.');return result;}
    try{result.commits=parseLog(await this.runGit(gitLogArgs(folder)));}
    catch(error){result.errors.push(error.killed?'git log 시간이 초과되었습니다.':error.code==='ENOENT'?'git을 찾을 수 없습니다.':'git 기록을 읽지 못했습니다. Git 저장소인지 확인하세요.');}
    for(const row of await matches(folder,entry.tests.length?entry.tests:DEFAULT_TEST_PATTERNS)){
      try{result.tests.push({file:row.relative,updatedAt:row.mtime.toISOString(),...parseJUnit(await readFile(row.file,'utf8'))});}
      catch{result.errors.push(`${row.relative}를 읽지 못했습니다.`);}
    }
    return result;
  }
  async get(){
    const repos=await this.sources.list();
    if(!repos.length)return {configured:false,message:NO_REPOS,repos:[]};
    return {configured:true,repos:await Promise.all(repos.map(row=>this.repo(row)))};
  }
}
