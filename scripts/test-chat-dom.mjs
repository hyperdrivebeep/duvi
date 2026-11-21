import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// The fixture imports the real DOM components. No learner server, account or media is needed.
const root=fileURLToPath(new URL('../',import.meta.url));
const chrome=process.env.CHROME_BIN||(process.platform==='win32'?path.join(process.env.ProgramFiles,'Google/Chrome/Application/chrome.exe'):process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'google-chrome');
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const html=url.pathname==='/tests/browser/chat-review.html';
  if(!html&&!/^\/src\/[a-z-]+\.mjs$/.test(url.pathname)){res.writeHead(404).end();return;}
  try{res.setHeader('Content-Type',html?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.end(await readFile(path.join(root,url.pathname)));}
  catch{res.writeHead(404).end();}
});
const profile=await mkdtemp(path.join(tmpdir(),'duvi-dom-test-'));
try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const url=`http://127.0.0.1:${server.address().port}/tests/browser/chat-review.html`;
  const {stdout}=await promisify(execFile)(chrome,['--headless','--disable-gpu','--no-first-run','--disable-extensions',`--user-data-dir=${profile}`,'--virtual-time-budget=5000','--dump-dom',url],{timeout:30000});
  console.log(stdout.match(/<pre id="results">([^<]*)<\/pre>/)?.[1]||'No DOM test result');
  if(!stdout.includes('data-result="pass"'))process.exitCode=1;
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
