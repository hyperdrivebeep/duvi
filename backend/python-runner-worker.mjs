import {builtinModules,registerHooks,syncBuiltinESMExports} from 'node:module';
import {constants as fsConstants} from 'node:fs';
import {constants as osConstants} from 'node:os';

// Runs one fixed check-question snippet in Pyodide (Python on WebAssembly). This file is the entry point of a
// separate Node process that python-runner.mjs starts under the Node permission model (read access to the Pyodide
// package only; no fs-write, child process, worker, addon, WASI or inspector grant), without code generation from
// strings and without node:sqlite (the permission model does not cover its file writes on Node 24), and kills on
// timeout or cancel. Generated code must be assumed to reach JavaScript in this process (the Python layer below is
// bypassable), so after Pyodide has loaded and before the snippet runs, lockdown() leaves only an allowlist usable:
// every other built-in module has its functions replaced by throwing ones and is frozen, process keeps only the
// functions Node and the IPC reply need, and loading any further module throws. Node 24 has no network permission;
// the network is closed by this lockdown, not by the OS. See docs/LEARNING_DESIGN.md (실행 경계).
const refuse=name=>function(){throw Object.assign(new Error(`${name}은(는) 확인 문제 실행에서 쓸 수 없습니다.`),{code:'ERR_DUVI_SANDBOX'});};
const fix=(object,name,value)=>Object.defineProperty(object,name,{value,writable:false,configurable:false,enumerable:true});
const functions=object=>Object.getOwnPropertyNames(object).filter(name=>name!=='constructor'&&typeof Object.getOwnPropertyDescriptor(object,name).value==='function');
const refuseAll=(object,label,names=functions(object))=>{for(const name of names)fix(object,name,refuse(`${label}.${name}`));};
/** A class whose own and inherited instance methods below `stop` throw; those prototypes are frozen. */
const refuseClass=(Class,label,stop)=>{for(let proto=Class.prototype;proto&&proto!==stop;proto=Object.getPrototypeOf(proto))if(!Object.isFrozen(proto)){refuseAll(proto,label);Object.freeze(proto);}};
// process.binding is denied under --permission; Emscripten's NODEFS.staticInit only reads the fs open flags from it
// while Pyodide loads. lockdown() removes it with the other process functions.
Object.defineProperty(process,'binding',{value:name=>{if(name==='constants')return {fs:fsConstants,os:osConstants};throw refuse(`process.binding(${name})`)();},writable:false,configurable:true});
// stdout/stderr are created lazily through net.Socket; create them before net is restricted.
void process.stdout;void process.stderr;

/**
 * Built-ins left usable after lockdown: none of them opens a file, socket, process or debugger by itself, and Node's
 * own internals (stdio, IPC reply, timers, errors) call several of them through the public module objects.
 * Everything else, including fs, net, dgram, dns, http(s), http2, tls, child_process, cluster, worker_threads,
 * inspector, module, os, v8, vm, wasi, repl, readline, tty, trace_events, sqlite, sea and test, is denied.
 */
const KEEP_MODULES=new Set(['assert','assert/strict','async_hooks','buffer','console','constants','crypto','diagnostics_channel','domain','events',
  'path','path/posix','path/win32','perf_hooks','process','punycode','querystring','stream','stream/consumers','stream/promises','stream/web',
  'string_decoder','sys','timers','timers/promises','url','util','util/types','zlib','_stream_duplex','_stream_passthrough','_stream_readable',
  '_stream_transform','_stream_wrap','_stream_writable']);
/** process functions left usable: exit and the IPC reply, scheduling, clocks and what Node calls on errors and warnings. */
const KEEP_PROCESS=new Set(['exit','reallyExit','send','_send','emitWarning','nextTick','_tickCallback','hrtime','uptime','cwd','memoryUsage','cpuUsage',
  'resourceUsage','_fatalException','hasUncaughtExceptionCaptureCallback','ref','unref']);
/** Every function of a module (and of the plain objects it exposes, such as fs.promises) throws; the objects are frozen. */
function deny(module,label,depth=0){
  if(Object.isFrozen(module))return;
  for(const name of Object.getOwnPropertyNames(module)){
    const descriptor=Object.getOwnPropertyDescriptor(module,name);
    if(typeof descriptor.value==='function')fix(module,name,refuse(`${label}.${name}`));
    else if(depth===0){
      let value;try{value=descriptor.get?module[name]:descriptor.value;}catch{continue;}
      if(value&&typeof value==='object'&&value!==module)deny(value,`${label}.${name}`,1);
    }
  }
  Object.freeze(module);
}
function lockdown(){
  const load=name=>process.getBuiltinModule(name);
  // Load every built-in before any patch: a module that initialises later could otherwise assign onto a prototype
  // property already made read-only (https.Agent onto http.Agent's createConnection).
  const modules=new Map();
  for(const name of builtinModules){try{const module=load(name);if(module)modules.set(name,module);}catch{}}
  // Instances can exist (process.stderr is a net.Socket), so the classes that open connections are closed on the prototype.
  const net=load('net'),dgram=load('dgram'),dns=load('dns'),vm=load('vm');
  fix(net.Socket.prototype,'connect',refuse('net.Socket.connect'));fix(net.Server.prototype,'listen',refuse('net.Server.listen'));
  refuseClass(dgram.Socket,'dgram.Socket',Object.getPrototypeOf(dgram.Socket.prototype));
  for(const Resolver of [dns.Resolver,dns.promises.Resolver])refuseClass(Resolver,'dns.Resolver',Object.prototype);
  for(const name of ['http','https'])fix(load(name).Agent.prototype,'createConnection',refuse(`${name}.Agent.createConnection`));
  // vm compiles strings even under --disallow-code-generation-from-strings.
  refuseClass(vm.Script,'vm.Script',Object.prototype);
  // From here on no module can be resolved or loaded, by import() or require.
  registerHooks({resolve:refuse('import'),load:refuse('import')});
  for(const [name,module] of modules)if(!KEEP_MODULES.has(name.replace(/^node:/,'')))deny(module,name);
  syncBuiltinESMExports();
  for(const name of ['fetch','WebSocket','EventSource','XMLHttpRequest','localStorage','sessionStorage','navigator'])
    if(Object.getOwnPropertyDescriptor(globalThis,name)?.configurable!==false)Object.defineProperty(globalThis,name,{value:refuse(name),writable:false,configurable:false});
  deny(process.report,'process.report',1);
  for(const name of Object.getOwnPropertyNames(process))
    if(!KEEP_PROCESS.has(name)&&typeof Object.getOwnPropertyDescriptor(process,name).value==='function')fix(process,name,refuse(`process.${name}`));
}

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
    // A patch that cannot be applied fails the setup, so nothing runs with a part of the lockdown missing.
    lockdown();
  }catch(caught){await send({type:'unavailable',reason:String(caught?.message||caught).slice(0,300)});process.exit(0);}
  await send({type:'ready'});
  let error=null;
  try{error=execute(code)??null;}
  catch(caught){const lines=String(caught.message||caught).trim().split('\n');error=lines.at(-1)||'Error';}
  await send({type:'done',output,truncated,error});
  process.exit(0);
});
