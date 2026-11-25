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
import {LearningService} from './learning-service.mjs';
export const ROOT=path.resolve(fileURLToPath(new URL('.',import.meta.url)));
const staticFiles=new Set(['/index.html','/app.mjs','/core.mjs','/style.css','/media.mjs']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.vtt':'text/vtt; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png'};
const fresh=()=>randomBytes(32).toString('base64url');
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
async function readJSON(req,limit=2300000){
  if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError('JSON 요청이 필요합니다.','bad_content_type',415);
  const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>limit)throw new AppError('요청이 너무 큽니다.','too_large',413);chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
  try{return JSON.parse(body||'{}');}catch{throw new AppError('요청 형식이 올바르지 않습니다.','invalid_json');}
}
/** Streams one chat turn as server-sent events; failures before the first event still return a JSON error. */
async function streamChat(req,res,chat,body){
  const closed=new AbortController();res.on('close',()=>{if(!res.writableEnded)closed.abort();});
  const send=(event,data)=>{
    if(!res.headersSent){res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','X-Accel-Buffering':'no'});res.flushHeaders();}
    if(!res.writableEnded)res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  try{await chat.ask(body,{onEvent:send,signal:closed.signal});}
  catch(error){if(!res.headersSent)throw error;send('error',{message:error instanceof AppError?error.message:'답변을 저장하지 못했습니다. 다시 질문해 주세요.',code:error.code||'internal'});}
  res.end();
}
export function createServer({auth,translations,library,root=ROOT,staticRoot=root,port=6101,chatProvider,codeExecution=false}){
  const base=`http://127.0.0.1:${port}`,sessions=new Map();
  const learning=new LearningService({root,auth,translations,library,chatProvider,codeExecution});
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
          const enabled=await auth.callback(s.id,url.searchParams);s.authConnectFailed=!enabled;s.authMessage=enabled?'ChatGPT 연결이 완료되었습니다. 모델을 선택하고 번역을 시작하세요.':'로그인되었지만 구독 사용 동의가 필요합니다. 다시 연결하세요.';
        }catch(error){s.authConnectFailed=true;s.authMessage=error instanceof AppError?error.message:'ChatGPT 연결을 완료하지 못했습니다. 다시 시도하세요.';}
        res.setHeader('Referrer-Policy','no-referrer');res.writeHead(303,{Location:'/?auth=returned'});res.end();return;
      }
      if(pathname.startsWith('/auth/launch/')&&req.method==='GET'){
        if(!s||s.launch?.path!==pathname||s.launch.expires<Date.now())throw new AppError('로그인 링크가 만료되었습니다. 다시 연결하세요.');
        const location=s.launch.url;delete s.launch;res.setHeader('Referrer-Policy','no-referrer');res.writeHead(302,{Location:location});res.end();return;
      }
      if(pathname.startsWith('/api/')){
        if(!s)throw new AppError('플레이어를 새로고침하세요.','missing_session',403);
        let body;
        if(req.method==='POST'){
          if(req.headers.origin!==base||req.headers['x-csrf-token']!==s.csrf)throw new AppError('요청을 확인할 수 없습니다. 플레이어를 새로고침하세요.','csrf',403);
          body=await readJSON(req,pathname==='/api/learning/import/preview'?16*1024*1024+1024:2300000);
        }
        if(req.method==='GET'&&pathname==='/api/session'){json(res,200,{csrf:s.csrf,...auth.publicState(),job:translations.publicJob(),authMessage:s.authMessage||'',authConnectFailed:!!s.authConnectFailed});return;}
        if(req.method==='GET'&&pathname==='/api/models'){json(res,200,{models:await auth.models()});return;}
        if(req.method==='GET'&&pathname==='/api/job'){json(res,200,{job:translations.publicJob()});return;}
        if(req.method==='POST'&&pathname==='/api/learning/tutor'){await learning.withAssets(()=>undefined);json(res,200,await learning.tutor.ask(body));return;}
        // A streamed answer can take minutes, so it waits for pending restores but does not hold the asset gate.
        if(req.method==='POST'&&pathname==='/api/learning/chat'){await learning.withAssets(()=>undefined);await streamChat(req,res,learning.chat,body);return;}
        if(req.method==='POST'&&pathname==='/api/learning/chat/stop'){json(res,200,learning.chat.stop(body));return;}
        if(req.method==='GET'&&pathname==='/api/learning/chat/models'){json(res,200,{models:await learning.chat.models()});return;}
        // 확인 문제 generation can take minutes, so like the chat it waits for restores but does not hold the asset gate.
        if(req.method==='POST'&&pathname==='/api/learning/quiz/generate'){await learning.withAssets(()=>undefined);const closed=new AbortController();res.on('close',()=>{if(!res.writableEnded)closed.abort();});json(res,200,await learning.quiz.generate(body,{signal:closed.signal}));return;}
        if(req.method==='POST'&&pathname==='/api/learning/quiz/cancel'){json(res,200,learning.quiz.cancel(body));return;}
        await learning.withAssets(async()=>{
        if(req.method==='GET'){
          if(pathname==='/api/learning'){json(res,200,await learning.store.get());return;}
          if(pathname==='/api/learning/export'){json(res,200,await learning.backup.export());return;}
          if(pathname==='/api/learning/sync'){json(res,200,await learning.sync.get());return;}
          if(pathname==='/api/learning/quizzes'){json(res,200,await learning.quiz.list());return;}
          if(pathname.startsWith('/api/learning/quizzes/')){json(res,200,await learning.quiz.status(decodeURIComponent(pathname.slice(22))));return;}
          if(pathname==='/api/learning/sources'){json(res,200,await learning.sources.get());return;}
          if(pathname==='/api/learning/evidence'){json(res,200,await learning.evidence.get());return;}
          if(pathname==='/api/learning/roadmap'){const {ROADMAP}=await import('../src/learning-roadmap.mjs');json(res,200,ROADMAP);return;}
          if(pathname==='/api/library'){json(res,200,await library.list());return;}
          if(pathname==='/api/folders'){json(res,200,await library.folders.list());return;}
          if(pathname.startsWith('/api/lectures/')){json(res,200,await library.get(pathname.split('/').at(-1)));return;}
          if(pathname.startsWith('/api/translations/')){json(res,200,await translations.cache(pathname.split('/').at(-1)));return;}
        }
        if(req.method==='POST'){
          if(pathname==='/api/learning/records'){json(res,200,await learning.store.saveRecord(body));return;}
          if(pathname==='/api/learning/progress'){json(res,200,await learning.store.setProgress(body));return;}
          if(pathname==='/api/learning/review'){json(res,200,await learning.store.review(body));return;}
          if(pathname==='/api/learning/quiz/preview'){json(res,200,await learning.quiz.preview(body));return;}
          if(pathname==='/api/learning/quiz/attempt'){json(res,200,await learning.quiz.attempt(body));return;}
          if(pathname==='/api/learning/quiz/item'){json(res,200,await learning.quiz.item(body));return;}
          if(pathname==='/api/learning/sources'){json(res,200,await learning.sources.set(body));return;}
          if(pathname==='/api/learning/chat/record'){json(res,200,await learning.chat.saveRecord(body));return;}
          if(pathname==='/api/learning/import/preview'){json(res,200,await learning.backup.preview(body));return;}
          if(pathname==='/api/learning/import'){json(res,200,await learning.backup.commit(body));return;}
          if(pathname==='/api/learning/sync/folder'){json(res,200,await learning.sync.setFolder(body));return;}
          if(pathname==='/api/learning/sync/export'){json(res,200,await learning.sync.export(body));return;}
          if(pathname==='/api/learning/sync/preview'){json(res,200,await learning.sync.preview(body));return;}
          if(pathname==='/api/learning/sync/import'){json(res,200,await learning.sync.commit(body));return;}
          if(pathname==='/api/learning/prepare'){const {prepareRoadmap}=await import('./learning-curriculum.mjs');json(res,200,await prepareRoadmap(library));return;}
          if(pathname==='/api/learning/v4-video'){const {prepareV4Video}=await import('./learning-curriculum.mjs');json(res,200,await prepareV4Video(library,body.videoId));return;}
          if(['/api/auth/start','/api/auth/select'].includes(pathname)&&(translations.job?.status==='running'||translations.starting))throw new AppError('번역을 멈춘 뒤 계정을 변경하세요.','busy',409);
          if(pathname==='/api/auth/start'){
            const target=await auth.start(s.id,base+'/auth/callback',body.accountId||null);
            const launchPath='/auth/launch/'+fresh();s.launch={path:launchPath,url:target,expires:Date.now()+60000};s.authMessage='';s.authConnectFailed=false;json(res,200,{path:launchPath});return;
          }
          if(pathname==='/api/auth/select'){await auth.select(body.accountId);s.authMessage='';s.authConnectFailed=false;json(res,200,auth.publicState());return;}
          if(pathname==='/api/auth/ack'){await auth.acknowledge();json(res,200,{ok:true});return;}
          if(pathname==='/api/auth/signout'){if(translations.starting)throw new AppError('번역 준비가 끝난 뒤 연결을 해제하세요.','busy',409);await translations.stop();json(res,200,await auth.signOut());return;}
          if(pathname==='/api/library/import'){json(res,200,await library.importIntoFolder(body));return;}
          if(pathname==='/api/library/playlist'){json(res,200,await library.importPlaylist(body));return;}
          if(pathname==='/api/library/captions'){json(res,200,await library.prepareCaptions(body));return;}
          if(pathname==='/api/folders/create'){json(res,200,await library.folders.create(body.name));return;}
          if(pathname==='/api/folders/rename'){json(res,200,await library.folders.rename(body.id,body.name));return;}
          if(pathname==='/api/folders/delete'){json(res,200,await library.folders.remove(body.id));return;}
          if(pathname==='/api/folders/move'){json(res,200,await library.folders.move(body));return;}
          if(pathname==='/api/translate'){json(res,200,{job:await translations.start({number:body.lecture,model:body.model,scope:body.scope,start:body.start||0,sentenceAligned:body.sentenceAligned===true})});return;}
          if(pathname==='/api/translate/stop'){json(res,200,{job:await translations.stop()});return;}
        }
        throw new AppError('요청 경로를 찾지 못했습니다.','not_found',404);
        });return;
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
