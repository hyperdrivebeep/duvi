import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {LearningSources} from '../learning-sources.mjs';
import {LearningEvidence,parseJUnit,parseLog,gitLogArgs,NO_REPOS} from '../learning-evidence.mjs';

async function dir(t,prefix){const value=await mkdtemp(path.join(os.tmpdir(),prefix));t.after(()=>rm(value,{recursive:true,force:true,maxRetries:5,retryDelay:100}));return value;}
const git=(cwd,...args)=>execFileSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid','-c','commit.gpgsign=false',...args],{cwd,stdio:'pipe'});
const junit=`<?xml version="1.0"?><testsuites><testsuite name="pytest" tests="3"><testcase classname="tests.test_adam" name="test_step_matches"/><testcase classname="tests.test_seed" name="test_same_seed"><failure message="x">assert 1 == 2 &amp; more</failure></testcase><testcase name="test_slow"><skipped/></testcase></testsuite></testsuites>`;

test('no configured repository is reported explicitly, not as zero evidence',async t=>{
  const evidence=new LearningEvidence({sources:new LearningSources({root:await dir(t,'duvi-evidence-')})});
  assert.deepEqual(await evidence.get(),{configured:false,message:NO_REPOS,repos:[]});
});

test('reads git log and the latest JUnit results from a temporary repository without changing it',async t=>{
  const root=await dir(t,'duvi-evidence-'),repo=await dir(t,'duvi-evidence-repo-');
  git(repo,'init','-q');await writeFile(path.join(repo,'a.py'),'x = 1\n');git(repo,'add','a.py');git(repo,'commit','-q','-m','첫 실험 기록');
  await writeFile(path.join(repo,'a.py'),'x = 2\n');git(repo,'commit','-q','-am','Adam 스텝 테스트 추가');
  await mkdir(path.join(repo,'reports'));await writeFile(path.join(repo,'reports','junit.xml'),junit);
  const before=execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}),files=(await readdir(path.join(repo,'.git'))).sort();
  const sources=new LearningSources({root});await sources.set({repos:[{path:repo}]});
  const result=await new LearningEvidence({sources}).get(),entry=result.repos[0];
  assert.equal(result.configured,true);assert.deepEqual(entry.errors,[]);
  assert.deepEqual(entry.commits.map(row=>row.subject),['Adam 스텝 테스트 추가','첫 실험 기록']);assert.match(entry.commits[0].sha,/^[0-9a-f]{7,}$/);
  assert.deepEqual(entry.tests.map(row=>[row.file,row.tests,row.passed,row.failed,row.skipped]),[['reports/junit.xml',3,1,1,1]]);
  assert.equal(entry.tests[0].cases[1].name,'tests.test_seed::test_same_seed');
  assert.equal(execFileSync('git',['status','--porcelain'],{cwd:repo,encoding:'utf8'}),before,'the work tree is unchanged');
  assert.deepEqual((await readdir(path.join(repo,'.git'))).sort(),files,'git metadata gains no files');
});

test('git runs with fixed arguments; missing folders, non-repositories and timeouts become explicit errors',async t=>{
  const args=gitLogArgs('C:/repo');assert.deepEqual(args.slice(0,7),['--no-pager','-c','core.fsmonitor=false','-c','log.showSignature=false','-C','C:/repo']);assert.equal(args[7],'log');
  const root=await dir(t,'duvi-evidence-'),plain=await dir(t,'duvi-evidence-plain-'),sources=new LearningSources({root});await sources.set({repos:[{path:plain}]});
  const timeout=Object.assign(new Error('killed'),{killed:true});
  assert.deepEqual((await new LearningEvidence({sources,runGit:async()=>{throw timeout;}}).get()).repos[0].errors,['git log 시간이 초과되었습니다.']);
  assert.match((await new LearningEvidence({sources}).get()).repos[0].errors[0],/git 기록을 읽지 못했습니다/);
  await rm(plain,{recursive:true,force:true});
  assert.deepEqual((await new LearningEvidence({sources}).get()).repos[0].errors,['저장소 폴더를 찾을 수 없습니다.']);
  await assert.rejects(sources.set({repos:[{path:'relative/path'}]}),{code:'invalid_learning'});
  await assert.rejects(sources.set({repos:[{path:root}]}),{code:'invalid_learning'},'the Duvi data folder is not a learner repository');
  await assert.rejects(sources.set({repos:[{path:plain,tests:['../x/*.xml']}]}),{code:'invalid_learning'});
});

test('without a saved list the repositories come from DUVI_EVIDENCE_REPOS; a saved list overrides it',async t=>{
  const root=await dir(t,'duvi-evidence-'),repo=await dir(t,'duvi-evidence-env-');
  const sources=new LearningSources({root,env:{DUVI_EVIDENCE_REPOS:[repo,'relative/ignored'].join(path.delimiter)}});
  const fromEnv=await sources.get();assert.equal(fromEnv.origin,'env');assert.deepEqual(fromEnv.repos.map(row=>[row.label,row.available]),[[path.basename(repo),true]]);
  await sources.set({repos:[]});const saved=await sources.get();assert.equal(saved.origin,'settings');assert.deepEqual(saved.repos,[]);
  assert.equal((await new LearningSources({root:await dir(t,'duvi-evidence-'),env:{}}).get()).origin,'none');
});

test('parsers read only fields: log lines and JUnit attributes',()=>{
  assert.deepEqual(parseLog('abc1234\u001f2026-11-23T10:00:00+09:00\u001f제목\u001f구분자 포함\nnot a line\n'),[{sha:'abc1234',date:'2026-11-23T10:00:00+09:00',subject:'제목\u001f구분자 포함'}]);
  const parsed=parseJUnit(junit);assert.deepEqual([parsed.tests,parsed.passed,parsed.failed,parsed.skipped],[3,1,1,1]);
});
