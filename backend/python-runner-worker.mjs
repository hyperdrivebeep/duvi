import {parentPort,workerData} from 'node:worker_threads';
import {loadPyodide} from 'pyodide';

// Runs one fixed check-question snippet in Pyodide (Python on WebAssembly) inside a worker thread that the parent
// terminates on timeout. Only the in-memory file system exists; js, pyodide, micropip and other bridges back to
// JavaScript are removed before the snippet runs, so it cannot reach the network, the disk or Node.
const BLOCKED=['js','pyodide','pyodide_js','_pyodide','_pyodide_core','micropip','pyodide_http','pyodide_kernel'];
// Removes loaded bridge modules and Pyodide's JS import finder, then refuses those names on import.
// This is a guard against reaching JavaScript from Python, not a hardened sandbox; see LEARNING_DESIGN.md.
const GUARD=`
import sys
def _install(blocked=frozenset(${JSON.stringify(BLOCKED)})):
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
_install()
del _install
`;
const limit=workerData.maxOutput;
let output='',truncated=false;
const write=text=>{if(output.length+text.length>limit){output+=text.slice(0,Math.max(0,limit-output.length));truncated=true;}else output+=text;};
try{
  const pyodide=await loadPyodide({stdout:line=>write(line+'\n'),stderr:()=>{},packages:[]});
  // The snippet's globals are a fresh dict; the guard runs first in its own namespace.
  for(const name of ['js','pyodide_js'])pyodide.unregisterJsModule(name);
  pyodide.runPython(GUARD,{globals:pyodide.toPy({})});
  parentPort.postMessage({type:'ready'});
  parentPort.once('message',({code})=>{
    let error=null;
    try{pyodide.runPython(code,{globals:pyodide.toPy({__name__:'__main__'})});}
    catch(caught){const lines=String(caught.message||caught).trim().split('\n');error=lines.at(-1)||'Error';}
    parentPort.postMessage({type:'done',output,truncated,error});
  });
}catch(caught){parentPort.postMessage({type:'unavailable',reason:String(caught?.message||caught).slice(0,300)});}
