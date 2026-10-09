import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createVault} from './vault.mjs';
import {ChatGPTAuth,AppError} from './chatgpt-auth.mjs';
import {TranslationService} from './chatgpt-translate.mjs';
import {LectureLibrary} from './library.mjs';
export const ROOT=path.resolve(fileURLToPath(new URL('.',import.meta.url)));
const staticFiles=new Set(['/index.html','/app.mjs','/core.mjs','/style.css','/media.mjs']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.vtt':'text/vtt; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
const fresh=()=>randomBytes(32).toString('base64url');
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
async function readJSON(req){
  if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError('JSON 요청이 필요합니다.','bad_content_type',415);
  const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>2300000)throw new AppError('요청이 너무 큽니다.','too_large',413);chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
  try{return JSON.parse(body||'{}');}catch{throw new AppError('요청 형식이 올바르지 않습니다.','invalid_json');}
}
export function createServer({auth,translations,library,root=ROOT,staticRoot=root,port=6101}){
  const base=`http://127.0.0.1:${port}`,sessions=new Map();
  const cookieName=`mit_session_${port}`;
  function session(req,res,create=false){
    let sid=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    let value=sessions.get(sid);
    if(value&&value.expires<Date.now()){sessions.delete(sid);value=null;}
    if(!value&&create){
      sid=fresh();value={id:sid,csrf:fresh()};sessions.set(sid,value);
      res.setHeader('Set-Cookie',`${cookieName}=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
      // HTTP is confined to numeric loopback. This cookie never contains OAuth credentials.
      for(const [key,s]of sessions)if(s.expires<Date.now())sessions.delete(key);
    }
    if(value)value.expires=Date.now()+86400000;return value;
  }
  return http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://www.youtube.com https://s.ytimg.com; style-src 'self'; img-src 'self' data: https://i.ytimg.com; font-src 'self'; media-src https://ocw.mit.edu; connect-src 'self'; frame-src https://www.youtube.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try{
      if(req.headers.host!==`127.0.0.1:${port}`)throw new AppError('로컬 주소로 접속하세요.','bad_host',403);
      if(req.headers.origin&&req.headers.origin!==base)throw new AppError('다른 사이트의 요청은 허용하지 않습니다.','bad_origin',403);
      const url=new URL(req.url,base),pathname=url.pathname;
      if(pathname==='/health'&&req.method==='GET'){json(res,200,{app:'mit-dual-player',version:2,ok:true});return;}
      const s=session(req,res,pathname==='/'||pathname==='/index.html'||pathname==='/api/session');
      if(pathname==='/auth/callback'&&req.method==='GET'){
        if(!s)throw new AppError('로그인을 시작한 브라우저에서 다시 연결하세요.','missing_session');
        try{
          if(translations.job?.status==='running'||translations.starting)throw new AppError('번역을 멈춘 뒤 다시 연결하세요.','busy',409);
          const enabled=await auth.callback(s.id,url.searchParams);s.authMessage=enabled?'ChatGPT 연결이 완료되었습니다. 모델을 선택하고 번역을 시작하세요.':'로그인되었지만 구독 사용 동의가 필요합니다. 다시 연결하세요.';
        }catch(error){s.authMessage=error instanceof AppError?error.message:'ChatGPT 연결을 완료하지 못했습니다. 다시 시도하세요.';}
        res.setHeader('Referrer-Policy','no-referrer');res.writeHead(303,{Location:'/?auth=returned'});res.end();return;
      }
      if(pathname.startsWith('/auth/launch/')&&req.method==='GET'){
        if(!s||s.launch?.path!==pathname||s.launch.expires<Date.now())throw new AppError('로그인 링크가 만료되었습니다. 다시 연결하세요.');
        const location=s.launch.url;delete s.launch;res.setHeader('Referrer-Policy','no-referrer');res.writeHead(302,{Location:location});res.end();return;
      }
      if(pathname.startsWith('/api/')){
        if(!s)throw new AppError('플레이어를 새로고침하세요.','missing_session',403);
        if(req.method==='GET'){
          if(pathname==='/api/session'){json(res,200,{csrf:s.csrf,...auth.publicState(),job:translations.publicJob(),authMessage:s.authMessage||''});return;}
          if(pathname==='/api/models'){json(res,200,{models:await auth.models()});return;}
          if(pathname==='/api/library'){json(res,200,await library.list());return;}
          if(pathname.startsWith('/api/lectures/')){json(res,200,await library.get(pathname.split('/').at(-1)));return;}
          if(pathname.startsWith('/api/translations/')){json(res,200,await translations.cache(pathname.split('/').at(-1)));return;}
          if(pathname==='/api/job'){json(res,200,{job:translations.publicJob()});return;}
        }
        if(req.method==='POST'){
          if(req.headers.origin!==base||req.headers['x-csrf-token']!==s.csrf)throw new AppError('요청을 확인할 수 없습니다. 플레이어를 새로고침하세요.','csrf',403);
          const body=await readJSON(req);
          if(['/api/auth/start','/api/auth/select'].includes(pathname)&&(translations.job?.status==='running'||translations.starting))throw new AppError('번역을 멈춘 뒤 계정을 변경하세요.','busy',409);
          if(pathname==='/api/auth/start'){
            const target=await auth.start(s.id,base+'/auth/callback',body.accountId||null);
            const launchPath='/auth/launch/'+fresh();s.launch={path:launchPath,url:target,expires:Date.now()+60000};s.authMessage='';json(res,200,{path:launchPath});return;
          }
          if(pathname==='/api/auth/select'){await auth.select(body.accountId);json(res,200,auth.publicState());return;}
          if(pathname==='/api/auth/ack'){await auth.acknowledge();json(res,200,{ok:true});return;}
          if(pathname==='/api/auth/signout'){if(translations.starting)throw new AppError('번역 준비가 끝난 뒤 연결을 해제하세요.','busy',409);await translations.stop();json(res,200,await auth.signOut());return;}
          if(pathname==='/api/library/import'){json(res,200,await library.import(body));return;}
          if(pathname==='/api/translate'){json(res,200,{job:await translations.start({number:body.lecture,model:body.model,scope:body.scope,start:body.start||0})});return;}
          if(pathname==='/api/translate/stop'){json(res,200,{job:await translations.stop()});return;}
        }
        throw new AppError('요청 경로를 찾지 못했습니다.','not_found',404);
      }
      if(!['GET','HEAD'].includes(req.method))throw new AppError('지원하지 않는 요청입니다.','method',405);
      const rel=pathname==='/'?'/index.html':pathname;
      const builtAsset=/^\/assets\/[A-Za-z0-9_.-]+\.(js|css|woff2|svg|png|jpg)$/.test(rel);
      if(!staticFiles.has(rel)&&!builtAsset&&!/^\/data\/(catalog|[1-9]|1[0-9]|2[0-6])\.(json|vtt)$/.test(rel))throw new AppError('파일을 찾지 못했습니다.','not_found',404);
      const data=await readFile(path.join(rel.startsWith('/data/')?root:staticRoot,rel.slice(1)));res.writeHead(200,{'Content-Type':mime[path.extname(rel)]});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){
      if(!res.headersSent)json(res,error instanceof AppError?error.status:500,{error:{message:error instanceof AppError?error.message:'처리 중 오류가 발생했습니다. 다시 시도하세요.',code:error instanceof AppError?error.code:'internal',details:error instanceof AppError?error.details:{}}});else res.end();
    }
  });
}
function openBrowser(base){spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',[base],{detached:true,stdio:'ignore',windowsHide:true}).unref();}
export async function main(){
  const port=Number(process.env.MIT_PLAYER_PORT||6101),base=`http://127.0.0.1:${port}`;
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid port');
  try{
    const health=await(await fetch(base+'/health',{signal:AbortSignal.timeout(1000)})).json();
    if(health.app==='mit-dual-player'&&health.version===2){if(process.argv.includes('--open'))openBrowser(base);return;}
    if(health.app==='mit-dual-player')throw new Error('이전 플레이어 서버를 종료한 뒤 새 버전을 실행하세요.');
  }catch(error){if(error.message.includes('이전 플레이어'))throw error;}
  const stateDirectory=process.env.MIT_PLAYER_STATE_DIR||path.join(process.env.LOCALAPPDATA||ROOT,'MITDualPlayer');
  const auth=new ChatGPTAuth({vault:createVault(stateDirectory)});await auth.init();
  const library=new LectureLibrary({root:ROOT});
  const translations=new TranslationService({auth,library,root:ROOT,cacheDirectory:path.join(ROOT,'translations')});
  const server=createServer({auth,translations,library,port});
  server.on('error',()=>{console.error('플레이어 서버를 시작하지 못했습니다. 다른 실행 창을 확인하세요.');process.exit(1);});
  server.listen(port,'127.0.0.1',()=>{console.log(`MIT dual subtitles v2: ${base}`);if(process.argv.includes('--open'))openBrowser(base);});
}
