import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Renders the 확인 문제 and 돌아보기 dev preview pages (fixture data) with headless Chrome:
//   node scripts/preview-views.mjs <output-directory>
// Writes quiz-preview-<w>.png and review-preview-<w>.png and prints layout metrics (horizontal overflow, smallest font).
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.resolve(process.argv[2]||path.join(root,'qa','previews'));
const chrome=process.env.CHROME_BIN||(process.platform==='win32'?path.join(process.env.ProgramFiles,'Google/Chrome/Application/chrome.exe'):process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'google-chrome');
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),allowed=/^\/(?:src\/[a-z-]+\.(?:mjs|css)|tests\/quiz-fixtures\.mjs|tests\/browser\/(?:quiz|review)-preview\.html)$/.test(url.pathname);
  if(!allowed){res.writeHead(404).end();return;}
  try{res.setHeader('Content-Type',types[path.extname(url.pathname)]);res.end(await readFile(path.join(root,url.pathname)));}catch{res.writeHead(404).end();}
});
const run=promisify(execFile),profile=await mkdtemp(path.join(tmpdir(),'duvi-preview-'));
try{
  await mkdir(out,{recursive:true});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}/tests/browser`;
  for(const name of ['quiz','review'])for(const [width,height] of [[1536,864],[1280,800]]){
    const flags=['--headless','--disable-gpu','--no-first-run','--disable-extensions','--hide-scrollbars',`--user-data-dir=${profile}`,`--window-size=${width},${height}`,'--force-device-scale-factor=1','--virtual-time-budget=5000'];
    const file=path.join(out,`${name}-preview-${width}.png`),url=`${base}/${name}-preview.html`;
    await run(chrome,[...flags,`--screenshot=${file}`,url],{timeout:60000});
    const {stdout}=await run(chrome,[...flags,'--dump-dom',url],{timeout:60000});
    const metrics=JSON.parse((stdout.match(/<pre id="metrics" hidden="">([^<]*)<\/pre>/)||[])[1]||'null');
    console.log(`${path.basename(file)} ${JSON.stringify(metrics)} ${metrics&&metrics.scrollWidth<=metrics.innerWidth&&metrics.pageOverflow<=0?'no horizontal overflow':'OVERFLOW OR NO METRICS'}`);
  }
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
