// Test-only stand-in for the ChatGPT account and Responses stream, used by the side chat when
// server.mjs runs with DUVI_CHAT_MOCK=1. It never runs by default and never contacts OpenAI.
// Its answers only echo the context the server assembled; they say nothing about real answer quality.
import {QUIZ_MARKER} from './learning-quiz.mjs';
export const MOCK_MODEL={id:'duvi-mock-tutor',name:'모의 튜터 · QA 전용 (실제 ChatGPT 아님)'};
/** Deterministic check questions from the payload: verbatim quotes (verifiable), an unquoted prediction and a quote that is not in the transcript. */
export function mockQuiz(payload){
  const rows=payload.transcript,first=rows.find(row=>row.en.length>=20)||rows[0],last=rows.at(-1),tag='[모의 문제 · 실제 ChatGPT 아님]';
  const items=[
    {type:'recall',prompt:`${tag} [${first.at}]에서 강의가 한 말을 내 말로 적어 보세요.`,answer:first.ko||first.en,source:{kind:'transcript',ref:first.at},quote:first.en,concepts:payload.concepts.slice(0,1)},
    {type:'predict',prompt:`${tag} [${first.at}] 다음에 강의는 무엇을 할까요? 먼저 예측하세요.`,options:['예시를 든다','앞의 정의를 반복한다','알 수 없음 (더 필요한 정보가 있다)'],answer:'예시를 든다',source:{kind:'transcript',ref:first.at},quote:'',concepts:[]},
    {type:'discriminate',prompt:`${tag} [${last.at}] 문장이 말하는 것과 다른 설명을 가르려면 무엇을 보면 될까요?`,answer:'두 설명의 예측이 달라지는 입력을 하나 골라 결과를 본다.',source:{kind:'transcript',ref:last.at},quote:last.en,concepts:[]},
    {type:'predict',prompt:`${tag} 아래 코드는 무엇을 출력할까요? 먼저 예측하세요.`,code:'print(7 / 2)\nprint(7 // 2)',options:['3.5\n3.5','3.5\n3','3\n3'],answer:'3.5\n3.5',source:{kind:'transcript',ref:first.at},quote:'',concepts:[]},
    {type:'withhold',prompt:`${tag} 이 구간만으로 강사가 다음 강의에서 무엇을 할지 알 수 있나요?`,options:['알 수 있다','알 수 없음 (더 필요한 정보가 있다)'],answer:'알 수 없음 (더 필요한 정보가 있다)',source:{kind:'transcript',ref:first.at},quote:'This sentence is not in the transcript at all.',concepts:[]},
  ];
  const excerpt=payload.excerpts[0],line=excerpt?.text.split('\n').find(row=>row.trim().length>=8);
  if(excerpt&&line)items.push({type:'recall',prompt:`${tag} ${excerpt.ref}의 이 줄이 하는 일을 설명하세요.`,answer:'(모의) 저장소 줄의 역할',source:{kind:excerpt.kind,ref:excerpt.ref,repo:excerpt.repo},quote:line.trim(),concepts:[]});
  return JSON.stringify({items});
}
const encoder=new TextEncoder();
const frame=event=>encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
export function mockAnswer(body){
  const [contextMessage,...turns]=body.input,question=turns.at(-1)?.content||'';
  const context=JSON.parse(contextMessage.content.slice(contextMessage.content.indexOf('\n')+1));
  const current=context.transcript.find(row=>row.current)||context.transcript[0];
  const earlier=turns.length-1;
  return `[모의 답변 · 실제 ChatGPT 아님]\n비유로 먼저: 지금 장면은 요리 레시피를 한 단계씩 따라 하는 것과 비슷해요. 각 단계가 다음 단계의 재료가 됩니다.\n\n질문 "${question.slice(0,80)}"에 대해, 지금 보던 [${context.playback}] 근처${current?`의 "${current.en.slice(0,90)}"`:''} 장면을 보면 됩니다.\n받은 문맥: 강의 "${context.lecture.title.slice(0,60)}", 대본 ${context.transcript.length}문장, 내 기록 ${context.learnerNotes.length}개, 이전 대화 ${earlier}개.\n\n예측해 보기: 이 단계를 하나 빼면 결과가 어떻게 달라질지 먼저 적어 보세요.`;
}
export function createMockChatProvider({delayMs=45,chunk=4}={}){
  const auth={state:{activeId:'duvi-mock'},models:async()=>[MOCK_MODEL],token:async()=>'mock-token'};
  async function fetcher(url,init){
    const body=JSON.parse(init.body),signal=init.signal;
    const context=body.input[0]?.content||'';
    // "#실패" in the concepts exercises the generation failure path.
    if(context.startsWith(QUIZ_MARKER)){
      const payload=JSON.parse(context.slice(QUIZ_MARKER.length+1));
      if(payload.concepts.includes('#실패'))return new Response(frame({type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}}),{headers:{'Content-Type':'text/event-stream'}});
      const text=mockQuiz(payload);
      return new Response(frame({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text}]}]}}),{headers:{'Content-Type':'text/event-stream'}});
    }
    const question=body.input.at(-1).content;
    // "#한도" exercises the usage-limit error path in the browser.
    if(question.includes('#한도'))return new Response(frame({type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}}),{headers:{'Content-Type':'text/event-stream'}});
    const text=mockAnswer(body);
    const stream=new ReadableStream({async start(controller){
      try{
        for(let i=0;i<text.length;i+=chunk){
          if(signal?.aborted)throw signal.reason;
          controller.enqueue(frame({type:'response.output_text.delta',delta:text.slice(i,i+chunk)}));
          await new Promise(resolve=>setTimeout(resolve,delayMs));
        }
        controller.enqueue(frame({type:'response.completed',response:{status:'completed',output:[{content:[{type:'output_text',text}]}]}}));controller.close();
      }catch(error){controller.error(error);}
    }});
    return new Response(stream,{headers:{'Content-Type':'text/event-stream'}});
  }
  return {auth,fetcher};
}

/**
 * Test-only: DUVI_UPSTREAM_URL=http://127.0.0.1:<port>/ sends the chat's and quiz's real Responses requests (the bodies
 * the server builds) to a local stub instead of api.openai.com, with a stand-in token. Off by default; loopback only;
 * never uses the learner's account. QA uses it to compare what the UI says is sent with what is sent.
 */
export function createUpstreamStubProvider(base){
  const url=new URL(base);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('DUVI_UPSTREAM_URL must be a loopback http URL.');
  const auth={state:{activeId:'duvi-upstream-stub'},models:async()=>[{id:'duvi-upstream-stub',name:'QA 스텁 · 실제 ChatGPT 아님'}],token:async()=>'stub-token'};
  return {auth,fetcher:(target,init)=>fetch(new URL('responses',url),{...init,headers:{...init.headers,'X-Duvi-Target':String(target)}})};
}
