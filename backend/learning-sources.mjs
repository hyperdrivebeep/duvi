import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {atomicJSON} from './vault.mjs';
import {AppError} from './chatgpt-auth.mjs';
import * as v from './learning-validation.mjs';

// The learner's own repositories (for example a local clone of glorious-purpose) are READ-ONLY sources for check
// questions and review evidence. Duvi reads files and `git log` output; it never runs, writes or pushes to them.
// The list is per PC (paths differ between PCs), so it lives beside sync settings and is not part of backups.
export const SOURCE_LIMITS=Object.freeze({repos:10,patterns:8,excerpts:6,lines:120,chars:12000,fileBytes:1024*1024});
export const DEFAULT_TEST_PATTERNS=Object.freeze(['junit*.xml','test-results/*.xml','reports/*.xml','test-reports/*.xml']);
export const inside=(parent,child)=>{const relative=path.relative(parent,child);return relative===''||(!relative.startsWith('..')&&!path.isAbsolute(relative));};
async function read(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
/** A relative path inside a repository: no traversal, no absolute paths, nothing under .git. */
export function relativePath(value){
  v.text(value,400);const parts=value.replace(/\\/g,'/').split('/');
  if(!value||path.isAbsolute(value)||/^[A-Za-z]:/.test(value)||parts.some(part=>part===''||part==='.'||part==='..')||parts[0].toLowerCase()==='.git')v.invalid('저장소 안의 상대 경로를 적어 주세요.');
  return parts.join('/');
}
function pattern(value){const result=relativePath(value);if(result.split('/').slice(0,-1).some(part=>part.includes('*')))v.invalid('테스트 결과 패턴은 파일 이름에만 *를 쓸 수 있습니다.');return result;}

export class LearningSources{
  /** Without a saved list, DUVI_EVIDENCE_REPOS (folders separated by the OS path delimiter, ; on Windows) supplies the default, e.g. a glorious-purpose clone. */
  constructor({root,writer=atomicJSON,env=process.env}){this.env=env;this.root=path.resolve(root);this.settingsFile=path.join(this.root,'learning','sources.json');this.writer=writer;}
  async list(){
    const saved=await read(this.settingsFile);if(!saved)return this.fromEnv();
    v.keys(saved,['version','repos']);if(saved.version!==1)v.invalid();
    return v.array(saved.repos,SOURCE_LIMITS.repos).map(row=>{v.keys(row,['label','path','tests']);return {label:v.text(row.label,120),path:v.text(row.path,1000),tests:v.array(row.tests,SOURCE_LIMITS.patterns).map(pattern)};});
  }
  fromEnv(){
    const paths=String(this.env.DUVI_EVIDENCE_REPOS||'').split(path.delimiter).map(row=>row.trim()).filter(row=>row&&path.isAbsolute(row)).slice(0,SOURCE_LIMITS.repos);
    return [...new Map(paths.map(row=>[path.basename(row).toLowerCase(),{label:path.basename(row),path:row,tests:[]}])).values()];
  }
  async get(){
    const repos=await this.list(),origin=await read(this.settingsFile)?'settings':repos.length?'env':'none';
    return {origin,repos:await Promise.all(repos.map(async row=>({...row,available:await this.directory(row.path).then(()=>true,()=>false)}))),defaultTests:DEFAULT_TEST_PATTERNS,example:'glorious-purpose 로컬 클론 (예: C:\\Users\\<사용자>\\glorious-purpose)'};
  }
  async directory(value){
    let folder;try{folder=await realpath(value);if(!(await stat(folder)).isDirectory())throw new Error();}catch{throw new AppError('저장소 폴더를 찾을 수 없습니다.','source_missing',404);}
    return folder;
  }
  /** Replaces the list. Each entry needs an absolute folder path; labels are folder names and must be unique. */
  async set(body){
    v.keys(body,['repos']);const rows=v.array(body.repos,SOURCE_LIMITS.repos),repos=[];
    for(const row of rows){
      v.keys(row,['path','tests']);v.text(row.path,1000);
      if(!path.isAbsolute(row.path))v.invalid('저장소는 C:\\Users\\…처럼 전체 경로로 적어 주세요.');
      const folder=await this.directory(row.path).catch(()=>v.invalid('저장소 폴더를 찾을 수 없습니다.'));
      if(inside(await realpath(this.root),folder)||inside(folder,await realpath(this.root)))v.invalid('Duvi 데이터 폴더는 학습 저장소로 쓸 수 없습니다.');
      repos.push({label:path.basename(folder),path:folder,tests:v.array(row.tests??[],SOURCE_LIMITS.patterns).map(pattern)});
    }
    v.unique(repos,row=>row.label.toLowerCase());
    await this.writer(this.settingsFile,{version:1,repos});return this.get();
  }
  async repo(label){const repo=(await this.list()).find(row=>row.label===label);if(!repo)throw new AppError('설정된 저장소가 아닙니다.','source_missing',404);return {...repo,path:await this.directory(repo.path)};}
  /** Resolves a file inside a configured repository, refusing symlinks or junctions that lead outside it. */
  async resolve(label,relative){
    const repo=await this.repo(label),target=path.join(repo.path,...relativePath(relative).split('/'));
    let real;try{real=await realpath(target);}catch{throw new AppError('저장소 파일을 찾을 수 없습니다.','source_missing',404);}
    if(!inside(repo.path,real)||real===repo.path)v.invalid('저장소 밖의 파일은 읽을 수 없습니다.');
    const info=await stat(real);if(!info.isFile())v.invalid('파일만 읽을 수 있습니다.');
    if(info.size>SOURCE_LIMITS.fileBytes)v.invalid('1MB보다 큰 파일은 발췌하지 않습니다.');
    return {repo,file:real};
  }
  /** Lines startLine..endLine (1-based, inclusive) of a text file in a configured repository. */
  async excerpt({repo,path:relative,startLine,endLine}){
    v.integer(startLine,1,1000000);v.integer(endLine,startLine,startLine+SOURCE_LIMITS.lines-1);
    const {file}=await this.resolve(repo,relative),buffer=await readFile(file);
    if(buffer.includes(0))v.invalid('텍스트 파일만 발췌할 수 있습니다.');
    const lines=buffer.toString('utf8').split(/\r?\n/);if(startLine>lines.length)v.invalid('파일의 줄 범위를 확인하세요.');
    const last=Math.min(endLine,lines.length),text=lines.slice(startLine-1,last).join('\n');
    const normalized=relativePath(relative);
    return {repo,path:normalized,startLine,endLine:last,kind:/\.(md|markdown)$/i.test(normalized)?'wiki':'repo',ref:`${normalized}:${startLine}-${last}`,text};
  }
}
