import childProcess from 'node:child_process';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import dgram from 'node:dgram';
import dns from 'node:dns';
import {syncBuiltinESMExports} from 'node:module';
import {constants as fsConstants} from 'node:fs';
import {constants as osConstants} from 'node:os';

// Runs one fixed check-question snippet in Pyodide (Python on WebAssembly). This file is the entry point of a
// separate Node process that python-runner.mjs starts under the Node permission model (read access to the Pyodide
// package only; no fs-write, child process, worker, addon, WASI or inspector grant) and kills on timeout or cancel.
// Node 24's permission model does not cover the network, so this process also replaces the network and
// child-process APIs with functions that throw before Pyodide is loaded. Pyodide's Emscripten system() calls
// child_process.spawnSync under Node; with these layers it fails closed. See docs/LEARNING_DESIGN.md.
const refuse=name=>function(){throw Object.assign(new Error(`${name}은(는) 확인 문제 실행에서 쓸 수 없습니다.`),{code:'ERR_DUVI_SANDBOX'});};
const block=(module,names,label)=>{for(const name of names)if(typeof module[name]==='function')module[name]=refuse(`${label}.${name}`);};
block(childProcess,['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'],'child_process');
block(net,['connect','createConnection','createServer'],'net');
net.Socket.prototype.connect=refuse('net.Socket.connect');
block(tls,['connect','createServer'],'tls');
for(const [module,label] of [[http,'http'],[https,'https']])block(module,['request','get','createServer'],label);
block(http2,['connect','createServer','createSecureServer'],'http2');
block(dgram,['createSocket'],'dgram');
block(dns,['lookup','resolve','resolve4','resolve6','resolveAny','reverse'],'dns');
block(dns.promises,['lookup','resolve','resolve4','resolve6','resolveAny','reverse'],'dns');
for(const name of ['fetch','WebSocket','EventSource','XMLHttpRequest'])if(name in globalThis)globalThis[name]=refuse(name);
syncBuiltinESMExports();
// process.binding is denied under --permission; Emscripten's NODEFS.staticInit only reads the fs open flags from it.
process.binding=name=>{if(name==='constants')return {fs:fsConstants,os:osConstants};throw refuse('process.binding')();};

const BLOCKED=['js','pyodide','pyodide_js','_pyodide','_pyodide_core','micropip','pyodide_http','pyodide_kernel',
  'subprocess','_posixsubprocess','multiprocessing','ctypes','_ctypes','socket','_socket','ssl','_ssl'];
const OS_CALLS=['system','popen','fork','forkpty','posix_spawn','posix_spawnp','execv','execve','execl','execle','execlp','execlpe','execvp','execvpe',
  'spawnl','spawnle','spawnlp','spawnlpe','spawnv','spawnve','spawnvp','spawnvpe'];
// Removes loaded bridge modules and Pyodide's JS import finder, refuses those names and process/network modules on
// import, and deletes the os/posix process functions. This is one layer; the process boundary above is the other.
const GUARD=`
import sys, os, posix
def _install(blocked=frozenset(${JSON.stringify(BLOCKED)}), calls=${JSON.stringify(OS_CALLS)}):
    for name in list(sys.modules):
        if name.split('.')[0] in blocked:
            del sys.modules[name]
    sys.meta_path[:] = [finder for finder in sys.meta_path if 'pyodide' not in type(finder).__module__]
    class Blocker:
        def find_spec(self, name, path=None, target=None, blocked=blocked):
            if name.split('.')[0] in blocked:
                raise ImportError(f"'{name}' 모듈은 확인 문제 실행에서 쓸 수 없습니다.")
            return None
    sys.meta_path.insert(0, Blocker())
    for module in (os, posix):
        for name in calls:
            if hasattr(module, name):
                delattr(module, name)
_install()
del _install
`;

const send=message=>new Promise(resolve=>process.send(message,resolve));
process.once('message',async({pyodideUrl,code,maxOutput,pythonGuard=true})=>{
  let output='',truncated=false;
  const write=text=>{if(output.length+text.length>maxOutput){output+=text.slice(0,Math.max(0,maxOutput-output.length));truncated=true;}else output+=text;};
  let pyodide;
  try{
    const {loadPyodide}=await import(pyodideUrl);
    pyodide=await loadPyodide({stdout:line=>write(line+'\n'),stderr:()=>{},packages:[]});
    for(const name of ['js','pyodide_js'])pyodide.unregisterJsModule(name);
    if(pythonGuard)pyodide.runPython(GUARD,{globals:pyodide.toPy({})});
  }catch(caught){await send({type:'unavailable',reason:String(caught?.message||caught).slice(0,300)});process.exit(0);}
  await send({type:'ready'});
  let error=null;
  try{pyodide.runPython(code,{globals:pyodide.toPy({__name__:'__main__'})});}
  catch(caught){const lines=String(caught.message||caught).trim().split('\n');error=lines.at(-1)||'Error';}
  await send({type:'done',output,truncated,error});
  process.exit(0);
});
