import childProcess from 'node:child_process';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import dgram from 'node:dgram';
import dns from 'node:dns';
import os from 'node:os';
import vm from 'node:vm';
import {syncBuiltinESMExports} from 'node:module';
import {constants as fsConstants} from 'node:fs';

// Runs one fixed check-question snippet in Pyodide (Python on WebAssembly). This file is the entry point of a
// separate Node process that python-runner.mjs starts under the Node permission model (read access to the Pyodide
// package only; no fs-write, child process, worker, addon, WASI or inspector grant) and without code generation from
// strings, and kills on timeout or cancel. Generated code must be assumed to reach JavaScript in this process (the
// Python layer below is bypassable), so this file first makes the Node APIs that the permission model leaves open
// throw: Node 24 has no network permission, and Pyodide's Emscripten system() calls child_process.spawnSync.
// The patched module objects and prototypes are frozen or made non-writable so later JavaScript cannot restore them.
// See docs/LEARNING_DESIGN.md (실행 경계).
const refuse=name=>function(){throw Object.assign(new Error(`${name}은(는) 확인 문제 실행에서 쓸 수 없습니다.`),{code:'ERR_DUVI_SANDBOX'});};
const fix=(object,name,value)=>Object.defineProperty(object,name,{value,writable:false,configurable:false,enumerable:true});
const functions=object=>Object.getOwnPropertyNames(object).filter(name=>name!=='constructor'&&typeof Object.getOwnPropertyDescriptor(object,name).value==='function');
const refuseAll=(object,label,names=functions(object))=>{for(const name of names)fix(object,name,refuse(`${label}.${name}`));};
/** A class whose own and inherited instance methods below `stop` throw; those prototypes are frozen. */
const refuseClass=(Class,label,stop)=>{for(let proto=Class.prototype;proto&&proto!==stop;proto=Object.getPrototypeOf(proto))if(!Object.isFrozen(proto)){refuseAll(proto,label);Object.freeze(proto);}};
// stdout/stderr are created lazily through net.Socket; create them before net is restricted.
void process.stdout;void process.stderr;
refuseAll(childProcess,'child_process');
// UDP and DNS are never needed here: every instance method, the classes and the factories throw.
refuseClass(dgram.Socket,'dgram.Socket',Object.getPrototypeOf(dgram.Socket.prototype));
for(const Resolver of [dns.Resolver,dns.promises.Resolver])refuseClass(Resolver,'dns.Resolver',Object.prototype);
refuseAll(dgram,'dgram');refuseAll(dns,'dns');refuseAll(dns.promises,'dns.promises');
// net.Socket stays usable for the stdio pipes, but no socket can connect and no server can listen.
fix(net.Socket.prototype,'connect',refuse('net.Socket.connect'));fix(net.Server.prototype,'listen',refuse('net.Server.listen'));
refuseAll(net,'net',['connect','createConnection','createServer']);
refuseAll(tls,'tls',['connect','createServer','createSecureContext']);
for(const [module,label] of [[http,'http'],[https,'https']]){
  refuseAll(module,label,['request','get','createServer','ClientRequest']);fix(module.Agent.prototype,'createConnection',refuse(`${label}.Agent.createConnection`));
}
refuseAll(http2,'http2',['connect','createServer','createSecureServer']);
// vm compiles strings even under --disallow-code-generation-from-strings.
refuseClass(vm.Script,'vm.Script',Object.prototype);refuseAll(vm,'vm');
for(const name of ['fetch','WebSocket','EventSource','XMLHttpRequest'])Object.defineProperty(globalThis,name,{value:refuse(name),writable:false,configurable:false});
// process.binding is denied under --permission; Emscripten's NODEFS.staticInit only reads the fs open flags from it.
fix(process,'binding',name=>{if(name==='constants')return {fs:fsConstants,os:os.constants};throw refuse(`process.binding(${name})`)();});
for(const name of ['_linkedBinding','dlopen','kill'])fix(process,name,refuse(`process.${name}`));
fix(os,'setPriority',refuse('os.setPriority'));
syncBuiltinESMExports();
for(const module of [childProcess,dgram,dns,dns.promises,net,tls,http,https,http2,vm])Object.freeze(module);

const BRIDGES=['js','pyodide','pyodide_js','_pyodide','_pyodide_core','micropip','pyodide_http','pyodide_kernel'];
const BLOCKED=[...BRIDGES,'subprocess','_posixsubprocess','multiprocessing','ctypes','_ctypes','socket','_socket','ssl','_ssl'];
const OS_CALLS=['system','popen','fork','forkpty','posix_spawn','posix_spawnp','execv','execve','execl','execle','execlp','execlpe','execvp','execvpe',
  'spawnl','spawnle','spawnlp','spawnlpe','spawnv','spawnve','spawnvp','spawnvpe'];
// A bypassable layer on top of the process boundary: refuses bridge, process and network modules on import, deletes the
// os/posix process functions, and (_hide) empties every Pyodide module object so gc cannot hand generated code a
// JavaScript proxy. After _hide Pyodide's own runPython no longer works, so the snippet runs through _execute.
const GUARD=`
import sys, os, posix, gc, traceback
def _install(blocked=frozenset(${JSON.stringify(BLOCKED)}), calls=${JSON.stringify(OS_CALLS)}):
    for name in list(sys.modules):
        if name.split('.')[0] in blocked:
            del sys.modules[name]
    # Pyodide's finders are instances or classes; both carry the defining module in __module__.
    sys.meta_path[:] = [finder for finder in sys.meta_path if 'pyodide' not in str(getattr(finder, '__module__', ''))]
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
def _hide(bridges=frozenset(${JSON.stringify(BRIDGES)})):
    for module in [o for o in gc.get_objects() if type(o).__name__ == 'module' and str(getattr(o, '__name__', '')).split('.')[0] in bridges]:
        module.__dict__.clear()
    gc.collect()
def _execute(code):
    try:
        exec(compile(code, '<exec>', 'exec'), {'__name__': '__main__'})
    except BaseException as error:
        return traceback.format_exception_only(error)[-1].strip()
    finally:
        sys.stdout.flush()
`;

const send=message=>new Promise(resolve=>process.send(message,resolve));
process.once('message',async({pyodideUrl,code,maxOutput,pythonGuard=true})=>{
  let output='',truncated=false;
  const write=text=>{if(output.length+text.length>maxOutput){output+=text.slice(0,Math.max(0,maxOutput-output.length));truncated=true;}else output+=text;};
  let execute;
  try{
    const {loadPyodide}=await import(pyodideUrl);
    const pyodide=await loadPyodide({packages:[]}),decoder=new TextDecoder();
    // Unbatched, so output without a final newline is kept too.
    pyodide.setStdout({write:bytes=>{write(decoder.decode(bytes,{stream:true}));return bytes.length;}});pyodide.setStderr({write:bytes=>bytes.length});
    if(pythonGuard){
      for(const name of ['js','pyodide_js'])pyodide.unregisterJsModule(name);
      const scope=pyodide.toPy({});pyodide.runPython(GUARD,{globals:scope});
      const hide=scope.get('_hide');execute=scope.get('_execute');hide();
    }
    // Without the Python layer (tests only) the snippet runs through Pyodide as usual and `import js` reaches globalThis,
    // which is how the tests check the JavaScript layer and the permission model on their own.
    else execute=snippet=>{pyodide.runPython(snippet,{globals:pyodide.toPy({__name__:'__main__'})});};
  }catch(caught){await send({type:'unavailable',reason:String(caught?.message||caught).slice(0,300)});process.exit(0);}
  await send({type:'ready'});
  let error=null;
  try{error=execute(code)??null;}
  catch(caught){const lines=String(caught.message||caught).trim().split('\n');error=lines.at(-1)||'Error';}
  await send({type:'done',output,truncated,error});
  process.exit(0);
});
