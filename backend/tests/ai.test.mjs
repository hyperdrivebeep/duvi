import test from 'node:test';
import os from 'node:os';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {request as httpRequest} from 'node:http';
import {ChatGPTAuth} from '../chatgpt-auth.mjs';
import {TranslationService,parseTranslation,consumeResponse,makeBatch} from '../chatgpt-translate.mjs';
import {createVault} from '../vault.mjs';
import {LectureLibrary,youtubeId,normalizeCues,parseJson3} from '../library.mjs';
import {parseVtt} from '../core.mjs';
import {createServer} from '../http-server.mjs';
import {generateKeyPair,SignJWT,jwtVerify,exportJWK,createLocalJWKSet} from '../vendor/jose/dist/webapi/index.js';
const HERE=process.env.MIT_TEST_DIR||os.tmpdir();
const temp=await mkdtemp(path.join(HERE,'checks-'));await mkdir(path.join(temp,'data'));
const lecture={number:1,title:'Lecture fixture',cues:Array.from({length:45},(_,i)=>({en:`Sentence ${i}.`,start:i*4,end:i*4+3}))};
await writeFile(path.join(temp,'data/1.json'),JSON.stringify(lecture));await writeFile(path.join(temp,'data/catalog.json'),JSON.stringify([{number:1,title:lecture.title}]));
const memoryVault=()=>{let saved;return {read:async()=>saved?structuredClone(saved):null,write:async v=>{saved=structuredClone(v);}};};
const pair=await generateKeyPair('RS256');const jwk=await exportJWK(pair.publicKey);jwk.kid='test-key';
const keys=createLocalJWKSet({keys:[jwk]});
const verifyIdentity=(token,id)=>jwtVerify(token,keys,{issuer:'https://auth.openai.com',audience:id,algorithms:['RS256'],requiredClaims:['sub','iat','exp']});
function tokens(idToken,scope='openid profile email offline_access resource.invoke chatgpt.tokens.use.direct'){
  return {access_token:'access-test',refresh_token:'refresh-test',id_token:idToken,expires_in:3600,token_type:'Bearer',scope};
}
async function identity(nonce,{subject='user-1',audience='oaiapp_test',issuer='https://auth.openai.com',expires='1h',key=pair.privateKey}={}){
  return new SignJWT({nonce,email:'test@example.invalid'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject(subject).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime(expires).sign(key);
}
async function harness(options={}){
  const calls=[];let tokenReply;
  const auth=new ChatGPTAuth({vault:memoryVault(),verifyIdentity,fetcher:async(url,init)=>{calls.push({url,init});return Response.json(tokenReply);},...options});await auth.init();
  return {auth,calls,setTokens:t=>tokenReply=t};
}
async function login(h,overrides={}){
  const url=new URL(await h.auth.start('browser','http://127.0.0.1:6101/auth/callback',overrides.accountId));
  h.setTokens(tokens(await identity(url.searchParams.get('nonce'),overrides),overrides.scope));
  const params=new URLSearchParams({code:'test-code',state:url.searchParams.get('state'),client_id:overrides.clientId||'oaiapp_test'});
  const enabled=await h.auth.callback('browser',params);return {url,params,enabled};
}
test('OAuth uses PKCE, stable host, dynamic registration, then saved issued client',async()=>{
  const h=await harness(),first=await login(h);assert.equal(first.enabled,true);
  assert.equal(first.url.searchParams.get('client_id'),'dynamic_agent_client');assert.equal(first.url.searchParams.get('code_challenge_method'),'S256');
  const form=h.calls[0].init.body;assert.equal(form.get('client_id'),'oaiapp_test');assert.equal(form.get('redirect_uri'),'http://127.0.0.1:6101/auth/callback');assert.ok(form.get('code_verifier'));
  const second=new URL(await h.auth.start('browser','http://127.0.0.1:6101/auth/callback','oaiapp_test'));assert.equal(second.searchParams.get('client_id'),'oaiapp_test');assert.equal(second.searchParams.has('agent_name_hint'),false);assert.equal(first.url.searchParams.get('ext_agent_host_id'),second.searchParams.get('ext_agent_host_id'));assert.notEqual(first.url.searchParams.get('state'),second.searchParams.get('state'));
  const publicInfo=JSON.stringify(h.auth.publicState());for(const secret of ['access-test','refresh-test','id_token'])assert.equal(publicInfo.includes(secret),false);
});
test('OAuth rejects wrong/replayed state and client before token exchange',async()=>{
  const h=await harness();await h.auth.start('browser','http://127.0.0.1:6101/auth/callback');
  await assert.rejects(h.auth.callback('browser',new URLSearchParams({state:'wrong',code:'bad',client_id:'oaiapp_test'})),{code:'invalid_state'});assert.equal(h.calls.length,0);
  const {params}=await login(h);await assert.rejects(h.auth.callback('browser',params),{code:'invalid_state'});
  const url=new URL(await h.auth.start('browser','http://127.0.0.1:6101/auth/callback','oaiapp_test'));
  await assert.rejects(h.auth.callback('browser',new URLSearchParams({state:url.searchParams.get('state'),code:'bad',client_id:'oaiapp_other'})),{code:'invalid_client'});
});
test('OAuth rejects expired transactions and declined consent',async()=>{
  let now=100;const h=await harness({now:()=>now});const url=new URL(await h.auth.start('browser','http://127.0.0.1:6101/auth/callback'));now+=16*60000;
  await assert.rejects(h.auth.callback('browser',new URLSearchParams({state:url.searchParams.get('state'),code:'test-code',client_id:'oaiapp_test'})),{code:'invalid_state'});
  const second=new URL(await h.auth.start('browser','http://127.0.0.1:6101/auth/callback'));await assert.rejects(h.auth.callback('browser',new URLSearchParams({state:second.searchParams.get('state'),error:'access_denied'})),{code:'access_denied'});assert.equal(h.calls.length,0);
});
test('JWT verification rejects wrong nonce, audience, issuer, expiry and signature',async()=>{
  const other=await generateKeyPair('RS256');
  for(const overrides of [{audience:'wrong'},{issuer:'https://wrong.invalid'},{expires:1},{key:other.privateKey},{nonce:'wrong'}]){
    const h=await harness();const url=new URL(await h.auth.start('browser','http://127.0.0.1:6101/auth/callback'));h.setTokens(tokens(await identity(overrides.nonce||url.searchParams.get('nonce'),overrides)));
    await assert.rejects(h.auth.callback('browser',new URLSearchParams({state:url.searchParams.get('state'),code:'test-code',client_id:'oaiapp_test'})),{code:'invalid_identity'});assert.equal(h.auth.state.accounts.length,0);
  }
});
test('Identity-only consent is kept but cannot spend plan usage',async()=>{
  const h=await harness();const {enabled}=await login(h,{scope:'openid email profile'});assert.equal(enabled,false);await assert.rejects(h.auth.token(),{code:'plan_disabled'});
  const url=new URL(await h.auth.start('browser','http://127.0.0.1:6101/auth/callback','oaiapp_test'));assert.equal(url.searchParams.get('prompt'),'consent');
});
test('Returning identity mismatch never overwrites previous account',async()=>{
  const h=await harness();await login(h);await assert.rejects(login(h,{accountId:'oaiapp_test',subject:'different-user'}),{code:'account_mismatch'});assert.equal(h.auth.account().subject,'user-1');
});
test('Concurrent token refreshes serialize; terminal error clears only tokens',async()=>{
  const h=await harness();await login(h);h.auth.account().expiresAt=0;let refreshes=0;
  h.auth.fetch=async()=>{refreshes++;await new Promise(r=>setTimeout(r,20));return Response.json({...tokens('new-id'),access_token:'new-access',refresh_token:'new-refresh'});};
  assert.deepEqual(await Promise.all([h.auth.token(),h.auth.token(),h.auth.token()]),['new-access','new-access','new-access']);assert.equal(refreshes,1);assert.equal(h.auth.account().refresh_token,'new-refresh');
  h.auth.account().expiresAt=0;h.auth.fetch=async()=>Response.json({error:'invalid_grant'},{status:400});await assert.rejects(h.auth.token(),{code:'invalid_grant'});assert.equal(h.auth.account().access_token,undefined);assert.equal(h.auth.account().client_id,'oaiapp_test');
});
test('Models are account-specific and signout revokes then clears credentials',async()=>{
  const h=await harness();await login(h);h.auth.fetch=async(url)=>url.endsWith('/models')?Response.json({models:[{slug:'shown',display_name:'Shown',visibility:'list'},{slug:'hidden',visibility:'hide'}]}):new Response(null,{status:200});
  assert.deepEqual(await h.auth.models(),[{id:'shown',name:'Shown'}]);assert.deepEqual(await h.auth.signOut(),{revoked:true});assert.equal(h.auth.account().access_token,undefined);assert.equal(h.auth.account().client_id,'oaiapp_test');
});
function stream(events,split=7){const bytes=new TextEncoder().encode(events.map(e=>'data: '+JSON.stringify(e)+'\r\n\r\n').join(''));return new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=split)controller.enqueue(bytes.slice(i,i+split));controller.close();}}),{headers:{'Content-Type':'text/event-stream'}});}
test('SSE handles split UTF-8/CRLF; only completed responses are accepted',async()=>{
  assert.equal(await consumeResponse(stream([{type:'response.output_text.delta',delta:'한국어'},{type:'response.completed',response:{status:'completed'}}])),'한국어');
  await assert.rejects(consumeResponse(stream([{type:'response.output_text.delta',delta:'partial'}])),{code:'interrupted_stream'});
  await assert.rejects(consumeResponse(stream([{type:'response.output_text.delta',delta:'partial'},{type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}}])),{code:'subscription_sharing_usage_limit_exceeded'});
  await assert.rejects(consumeResponse(stream([{type:'response.incomplete'}])),{code:'response.incomplete'});
});
test('Translation validation rejects missing, duplicated and foreign cue IDs',()=>{
  assert.deepEqual(parseTranslation('{"translations":[{"id":2,"ko":"문장"}]}',[2]),{2:'문장'});
  assert.throws(()=>parseTranslation('{"translations":[]}',[1]));assert.throws(()=>parseTranslation('{"translations":[{"id":1,"ko":"a"},{"id":1,"ko":"b"}]}',[1,2]));assert.throws(()=>parseTranslation('{"translations":[{"id":9,"ko":"a"}]}',[1]));assert.throws(()=>parseTranslation('not json',[1]));
  const batch=makeBatch(lecture,[5,6]);assert.equal(batch.contextBefore.length,3);assert.equal(batch.contextAfter.length,3);assert.deepEqual(batch.target.map(x=>x.id),[5,6]);
});
const fakeAuth={state:{activeId:'test'},models:async()=>[{id:'test-model',name:'Test'}],token:async()=>'test-only'};
test('Translation saves complete batches, resumes after failure, reuses cache without requests',async()=>{
  let calls=0,fail=true;const bodies=[];
  const service=new TranslationService({auth:fakeAuth,root:temp,cacheDirectory:path.join(temp,'cache'),fetcher:async(url,init)=>{
    calls++;const body=JSON.parse(init.body);bodies.push(body);assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(body.store,false);assert.equal(body.stream,true);assert.equal(Array.isArray(body.input),true);
    if(calls===2&&fail)return stream([{type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}}]);
    const targets=JSON.parse(body.input[0].content).target;return stream([{type:'response.output_text.delta',delta:JSON.stringify({translations:targets.map(t=>({id:t.id,ko:`검증용 ${t.id}`}))})},{type:'response.completed',response:{status:'completed'}}]);
  }});
  await service.start({number:1,model:'test-model',scope:'lecture'});await service.task;assert.equal(service.job.status,'error');assert.equal(Object.keys((await service.cache(1)).translations).length,20);
  fail=false;await service.start({number:1,model:'test-model',scope:'lecture'});await service.task;assert.equal(service.job.status,'completed');assert.equal(Object.keys((await service.cache(1)).translations).length,45);assert.equal(JSON.parse(bodies[2].input[0].content).target[0].id,20);
  const before=calls;await service.start({number:1,model:'test-model',scope:'lecture'});assert.equal(calls,before);assert.equal(service.job.status,'completed');
  const restarted=new TranslationService({auth:fakeAuth,root:temp,cacheDirectory:path.join(temp,'cache')});assert.equal(Object.keys((await restarted.cache(1)).translations).length,45);
});
test('Cancellation aborts current request and prevents partial cache writes',async()=>{
  const service=new TranslationService({auth:fakeAuth,root:temp,cacheDirectory:path.join(temp,'cancel-cache'),fetcher:async(url,{signal})=>new Promise((resolve,reject)=>{if(signal.aborted)reject(new DOMException('Stopped','AbortError'));else signal.addEventListener('abort',()=>reject(new DOMException('Stopped','AbortError')));})});
  await service.start({number:1,model:'test-model',scope:'sample',start:20});await service.stop();assert.equal(service.job.status,'stopped');assert.equal(Object.keys((await service.cache(1)).translations).length,0);
});
test('Windows DPAPI persists UTF-8 and does not store plaintext tokens',async()=>{
  const dir=path.join(temp,'vault'),vault=createVault(dir);const value={token:'TEST-ONLY-not-a-real-secret',label:'한국어 계정'};await vault.write(value);assert.deepEqual(await vault.read(),value);assert.equal((await readFile(path.join(dir,'accounts.dpapi'),'utf8')).includes(value.token),false);
});
test('YouTube URLs restrict hosts and normalize supported forms',()=>{
  for(const url of ['https://youtu.be/xAcTmDO6NTI?t=1','https://www.youtube.com/watch?v=xAcTmDO6NTI','https://m.youtube.com/shorts/xAcTmDO6NTI'])assert.equal(youtubeId(url),'xAcTmDO6NTI');
  for(const url of ['file:///etc/passwd','https://youtube.com.evil.test/watch?v=xAcTmDO6NTI','https://127.0.0.1/watch?v=xAcTmDO6NTI','https://www.youtube.com/playlist?list=xx','https://user:pass@www.youtube.com/watch?v=xAcTmDO6NTI'])assert.throws(()=>youtubeId(url));
});
test('SRT/VTT and YouTube captions import with ordered nonoverlapping cues',async()=>{
  const srt='1\n00:00:01,000 --> 00:00:03,000\nHello.\n\n2\n00:00:03,000 --> 00:00:05,000\nWorld.\n';assert.equal(parseVtt(srt).length,2);
  const parsed=parseJson3({events:[{tStartMs:1000,dDurationMs:2000,segs:[{utf8:'Hello.'}]},{tStartMs:2500,dDurationMs:3000,segs:[{utf8:'World.'}]}]});assert.ok(parsed[0].end<=parsed[1].start);
  const library=new LectureLibrary({root:temp,fetcher:async()=>Response.json({title:'Fixture video'})});
  const result=await library.import({url:'https://youtu.be/xAcTmDO6NTI',subtitleText:srt});assert.equal(result.lecture.cues.length,2);assert.equal(result.lecture.player,'youtube');assert.equal((await library.list()).length,2);
  const duplicate=await library.import({url:'https://youtu.be/xAcTmDO6NTI',subtitleText:'bad'});assert.equal(duplicate.existing,true);assert.equal(duplicate.lecture.cues.length,2);
  await assert.rejects(library.get('../../secrets'));
});
test('HTTP rejects cross-origin writes, DNS rebinding, private files; exposes no credentials',async()=>{
  const h=await harness();await login(h);const library=new LectureLibrary({root:temp});const service=new TranslationService({auth:h.auth,library,root:temp,cacheDirectory:path.join(temp,'http-cache')});
  const port=6198,base=`http://127.0.0.1:${port}`,server=createServer({auth:h.auth,translations:service,library,root:temp,port});await new Promise(r=>server.listen(port,'127.0.0.1',r));
  try{
    const response=await fetch(base+'/api/session');assert.match(response.headers.get('set-cookie'),/^mit_session_6198=/);const cookie=response.headers.get('set-cookie').split(';')[0];const value=await response.json();assert.ok(value.csrf);assert.equal(JSON.stringify(value).includes('access-test'),false);
    const headers={Cookie:cookie,Origin:base,'X-CSRF-Token':value.csrf,'Content-Type':'application/json'};
    assert.equal((await fetch(base+'/api/auth/ack',{method:'POST',headers:{...headers,Origin:'https://evil.invalid'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/api/auth/ack',{method:'POST',headers:{...headers,'X-CSRF-Token':'wrong'},body:'{}'})).status,403);
    assert.equal((await fetch(base+'/api/auth/ack',{method:'POST',headers,body:'{}'})).status,200);
    const spoofedStatus=await new Promise((resolve,reject)=>{const req=httpRequest(base+'/api/session',{headers:{Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(spoofedStatus,403);
    assert.equal((await fetch(base+'/chatgpt-auth.mjs')).status,404);assert.equal((await fetch(base+'/vault.ps1')).status,404);
    assert.equal((await fetch(base+'/api/translations/..%2f..%2fsecrets',{headers:{Cookie:cookie}})).status,400);
    const start=await(await fetch(base+'/api/auth/start',{method:'POST',headers,body:'{}'})).json();assert.ok(start.path.startsWith('/auth/launch/'));assert.equal(JSON.stringify(start).includes('id_token'),false);
  }finally{await new Promise(r=>server.close(r));}
});
