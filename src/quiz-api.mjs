// The api object the 확인 문제 and 돌아보기 view modules use. `request(route, body)` is the app shell's JSON call
// (GET without a body, POST with CSRF otherwise). `open(target)` lets the shell navigate:
//   {kind:'lecture', lectureId, seconds} · {kind:'quiz', lectureId, segmentId} · {kind:'repo', repo, path, line}
//   {kind:'records'} · {kind:'review'} · {kind:'roadmap'} · {kind:'backup'} · {kind:'sources'} · {kind:'settings'} · {kind:'resource', resource}
//   {kind:'note'} (현재 시점 기록 남기기: a record at the lecture's playback time without asking the tutor). See app-routes.mjs.
export function createLearningViewApi(request,{open=()=>{},lectureName=id=>`강의 ${id}`}={}){
  const id=value=>encodeURIComponent(String(value));
  return {
    quiz:lectureId=>request(`/api/learning/quizzes/${id(lectureId)}`),
    quizzes:()=>request('/api/learning/quizzes'),
    preview:body=>request('/api/learning/quiz/preview',body),
    generate:body=>request('/api/learning/quiz/generate',body),
    cancel:lectureId=>request('/api/learning/quiz/cancel',{lectureId:String(lectureId)}),
    attempt:body=>request('/api/learning/quiz/attempt',body),
    item:body=>request('/api/learning/quiz/item',body),
    models:()=>request('/api/learning/chat/models').then(result=>result.models),
    learning:()=>request('/api/learning'),
    roadmap:()=>request('/api/learning/roadmap'),
    evidence:()=>request('/api/learning/evidence'),
    sources:()=>request('/api/learning/sources'),
    setSources:body=>request('/api/learning/sources',body),
    open,lectureName,
  };
}
