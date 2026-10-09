import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from './vendor/jose/dist/webapi/index.js';
const ISSUER='https://auth.openai.com';
const RESOURCE='https://api.openai.com/v1';
const SCOPES='openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const REQUIRED='chatgpt.tokens.use.direct';
const random=()=>randomBytes(32).toString('base64url');
export class AppError extends Error{
  constructor(message,code='request_failed',status=400,details={}){super(message);Object.assign(this,{code,status,details});}
}
export async function apiError(response){
  let body;try{body=await response.json();}catch{body={};}
  const code=body.error?.code||body.error?.type||`http_${response.status}`;
  const messages={
    subscription_sharing_usage_limit_exceeded:'ChatGPT 사용 한도에 도달했습니다. 사용량 설정을 확인한 뒤 이어서 번역하세요.',
    subscription_sharing_user_not_eligible:'이 계정 또는 워크스페이스에서는 ChatGPT 구독 연결을 사용할 수 없습니다.',
    subscription_sharing_usage_unavailable:'ChatGPT 사용 한도를 확인할 수 없습니다. 잠시 후 다시 시도하세요.',
    subscription_sharing_user_unavailable:'ChatGPT 계정 정보를 확인할 수 없습니다. 잠시 후 다시 시도하세요.',
    subscription_sharing_unsupported_capability:'선택한 모델 또는 요청 기능을 이 연결에서 지원하지 않습니다.',
    subscription_sharing_route_not_supported:'이 계정에서는 현재 요청 경로를 지원하지 않습니다.',
    http_401:'ChatGPT 인증이 거부되었습니다. 계정과 구독 사용 동의를 확인하세요.',
    http_403:'ChatGPT 접근이 허용되지 않았습니다. 계정 또는 지역 정책을 확인하세요.',
    http_429:'ChatGPT 요청 한도에 도달했습니다. 잠시 후 이어서 번역하세요.',
    http_503:'ChatGPT 연결을 현재 사용할 수 없습니다. 잠시 후 다시 시도하세요.'
  };
  return new AppError(messages[code]||messages[`http_${response.status}`]||'ChatGPT 요청에 실패했습니다.',code,response.status,{
    requestId:response.headers.get('x-request-id')||response.headers.get('openai-request-id')||null,
    param:body.error?.param||null,
    shape:body.error?'error':body.detail?'detail':'other'
  });
}
export class ChatGPTAuth{
  constructor({vault,fetcher=fetch,verifyIdentity,now=()=>Date.now()}){
    this.vault=vault;this.fetch=fetcher;this.now=now;this.pending=new Map();this.refreshing=new Map();this.catalogs=new Map();
    const jwks=createRemoteJWKSet(new URL(ISSUER+'/.well-known/jwks.json'));
    this.verifyIdentity=verifyIdentity||((token,clientId)=>jwtVerify(token,jwks,{issuer:ISSUER,audience:clientId,algorithms:['RS256'],requiredClaims:['sub','exp','iat'],clockTolerance:5}));
  }
  async init(){
    this.state=await this.vault.read();
    if(!this.state){this.state={version:1,hostId:'urn:uuid:'+randomUUID(),activeId:null,accounts:[]};await this.save();}
  }
  save(){return this.vault.write(this.state);}
  account(id=this.state.activeId){return this.state.accounts.find(a=>a.client_id===id);}
  publicState(){return {activeId:this.state.activeId,accounts:this.state.accounts.map(a=>({id:a.client_id,label:a.email||'ChatGPT 계정',shortId:a.client_id.slice(-6),connected:!!a.access_token,planEnabled:!!a.access_token&&a.scopes.includes(REQUIRED),needsWelcome:!!a.access_token&&a.scopes.includes(REQUIRED)&&!a.welcomed}))};}
  async start(sessionId,redirectUri,accountId=null){
    const account=accountId?this.account(accountId):null;
    if(accountId&&!account)throw new AppError('저장된 계정을 찾을 수 없습니다.');
    const now=this.now();for(const [key,value]of this.pending)if(value.expiresAt<now)this.pending.delete(key);
    const state=random(),nonce=random(),verifier=random();
    // One pending sign-in per browser session; superseded attempts cannot replace an account.
    this.pending.set(sessionId,{state,nonce,verifier,redirectUri,accountId,expiresAt:now+15*60*1000});
    const url=new URL(ISSUER+'/api/accounts/authorize');
    url.search=new URLSearchParams({client_id:account?.client_id||'dynamic_agent_client',ext_agent_host_id:this.state.hostId,response_type:'code',redirect_uri:redirectUri,scope:SCOPES,resource:RESOURCE,state,nonce,code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url')});
    if(!account)url.searchParams.set('agent_name_hint','Duvi');
    else{
      if(account.id_token)url.searchParams.set('id_token_hint',account.id_token);
      if(account.email)url.searchParams.set('login_hint',account.email);
      if(!account.scopes.includes(REQUIRED))url.searchParams.set('prompt','consent');
    }
    return url.href;
  }
  async callback(sessionId,params){
    const pending=this.pending.get(sessionId);this.pending.delete(sessionId);
    if(!pending||pending.expiresAt<this.now()||params.get('state')!==pending.state)throw new AppError('로그인 확인 시간이 지났거나 요청이 일치하지 않습니다. 다시 연결하세요.','invalid_state');
    if(params.has('error'))throw new AppError('ChatGPT 연결 동의가 완료되지 않았습니다. 다시 연결할 수 있습니다.','access_denied');
    const id=params.get('client_id')||pending.accountId;
    if(!id||id==='dynamic_agent_client'||!/^oaiapp_[A-Za-z0-9_-]+$/.test(id)||(pending.accountId&&pending.accountId!==id))throw new AppError('로그인 등록 정보가 일치하지 않습니다.','invalid_client');
    const code=params.get('code');if(!code)throw new AppError('로그인 인증 코드가 없습니다.','missing_code');
    const tokens=await this.exchange({grant_type:'authorization_code',client_id:id,code,code_verifier:pending.verifier,redirect_uri:pending.redirectUri,resource:RESOURCE});
    let payload;try{({payload}=await this.verifyIdentity(tokens.id_token,id));}catch{throw new AppError('ChatGPT 계정의 서명을 확인하지 못했습니다. 다시 로그인하세요.','invalid_identity');}
    if(payload.nonce!==pending.nonce||!payload.sub)throw new AppError('ChatGPT 로그인 식별 정보가 일치하지 않습니다.','invalid_identity');
    const previous=this.account(id);
    if(previous&&previous.subject!==payload.sub)throw new AppError('선택한 계정과 로그인한 계정이 다릅니다.','account_mismatch');
    const account={...previous,client_id:id,subject:payload.sub,email:payload.email||previous?.email||'',issuer:ISSUER,welcomed:previous?.welcomed||false};
    this.applyTokens(account,tokens,true);
    if(previous)this.state.accounts[this.state.accounts.indexOf(previous)]=account;else this.state.accounts.push(account);
    this.state.activeId=id;this.catalogs.delete(id);await this.save();
    return account.scopes.includes(REQUIRED);
  }
  async exchange(fields){
    let response;try{response=await this.fetch(ISSUER+'/api/accounts/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams(fields),signal:AbortSignal.timeout(30000)});}catch{throw new AppError('ChatGPT 인증 서버에 연결하지 못했습니다.','network',503);}
    if(!response.ok){
      let body;try{body=await response.json();}catch{body={};}
      const code=typeof body.error==='string'?body.error:body.error?.code||body.error?.type||'oauth_error';
      throw new AppError('ChatGPT 인증에 실패했습니다. 다시 연결하세요.',code,response.status);
    }
    return response.json();
  }
  applyTokens(account,tokens,initial=false){
    if(typeof tokens.access_token!=='string'||!tokens.access_token||!Number.isFinite(tokens.expires_in)||tokens.expires_in<=0||tokens.token_type?.toLowerCase()!=='bearer'||(initial&&typeof tokens.scope!=='string'))throw new AppError('ChatGPT 인증 응답이 올바르지 않습니다.','invalid_token_response');
    account.access_token=tokens.access_token;account.refresh_token=tokens.refresh_token||account.refresh_token;
    account.id_token=tokens.id_token||account.id_token;account.expiresAt=this.now()+tokens.expires_in*1000;
    account.scopes=typeof tokens.scope==='string'?tokens.scope.split(/\s+/):account.scopes||[];
  }
  async token(id=this.state.activeId){
    const account=this.account(id);
    if(!account?.access_token)throw new AppError('먼저 ChatGPT에 연결하세요.','not_connected',401);
    if(!account.scopes.includes(REQUIRED))throw new AppError('ChatGPT 구독 사용에 동의해야 번역할 수 있습니다.','plan_disabled',403);
    if(account.expiresAt>this.now()+60000)return account.access_token;
    if(!this.refreshing.has(id))this.refreshing.set(id,this.refresh(account).finally(()=>this.refreshing.delete(id)));
    await this.refreshing.get(id);
    if(!account.scopes.includes(REQUIRED))throw new AppError('ChatGPT 구독 사용 권한을 다시 확인하세요.','plan_disabled',403);
    return account.access_token;
  }
  async refresh(account){
    if(!account.refresh_token)throw new AppError('로그인 시간이 지났습니다. 다시 연결하세요.','expired',401);
    try{
      const tokens=await this.exchange({grant_type:'refresh_token',client_id:account.client_id,refresh_token:account.refresh_token,resource:RESOURCE});
      this.applyTokens(account,tokens);await this.save();
    }catch(error){
      if(['invalid_grant','invalid_refresh_token','token_expired','refresh_token_expired','refresh_token_invalidated','refresh_token_reused'].includes(error.code)){
        this.clearTokens(account);await this.save();
      }
      throw error;
    }
  }
  async models(id=this.state.activeId){
    const token=await this.token(id);const cached=this.catalogs.get(id);
    if(cached&&cached.until>this.now())return cached.models;
    let response;try{response=await this.fetch(RESOURCE+'/models',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});}catch{throw new AppError('모델 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.','network',503);}
    if(!response.ok)throw await apiError(response);
    const data=await response.json();
    if(!Array.isArray(data.models))throw new AppError('ChatGPT 모델 목록 형식을 확인하지 못했습니다.','invalid_catalog',502);
    const models=data.models.filter(m=>m.visibility==='list'&&typeof m.slug==='string').map(m=>({id:m.slug,name:m.display_name||m.slug}));
    this.catalogs.set(id,{models,until:this.now()+5*60*1000});return models;
  }
  async select(id){if(!this.account(id))throw new AppError('계정을 찾지 못했습니다.');this.state.activeId=id;this.catalogs.delete(id);await this.save();}
  async acknowledge(){const a=this.account();if(a){a.welcomed=true;await this.save();}}
  clearTokens(account){delete account.access_token;delete account.refresh_token;delete account.id_token;delete account.expiresAt;this.catalogs.delete(account.client_id);}
  async signOut(){
    const account=this.account();if(!account)return {revoked:true};
    const pendingRefresh=this.refreshing.get(account.client_id);if(pendingRefresh)await pendingRefresh.catch(()=>{});
    let revoked=!account.refresh_token;
    if(account.refresh_token){
      // Pinned to the published discovery endpoint; never send credentials to an arbitrary URL.
      for(let attempt=0;attempt<2;attempt++){
        try{
          const response=await this.fetch(ISSUER+'/api/accounts/oauth/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:account.refresh_token,token_type_hint:'refresh_token',client_id:account.client_id}),signal:AbortSignal.timeout(10000)});
          if(response.ok){revoked=true;break;}if(response.status<500)break;
        }catch{}
        if(attempt===0)await new Promise(resolve=>setTimeout(resolve,500));
      }
    }
    this.clearTokens(account);await this.save();return {revoked};
  }
}
