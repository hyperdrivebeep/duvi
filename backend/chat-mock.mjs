// Test-only stand-in for the ChatGPT account and Responses stream, used by the side chat when
// server.mjs runs with DUVI_CHAT_MOCK=1. It never runs by default and never contacts OpenAI.
// Its answers only echo the context the server assembled; they say nothing about real answer quality.
export const MOCK_MODEL={id:'duvi-mock-tutor',name:'모의 튜터 · QA 전용 (실제 ChatGPT 아님)'};
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
