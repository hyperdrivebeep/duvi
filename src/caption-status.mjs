export function captionStatus({lecture, preparing, checkError, count, chrome, availability, aiReady, running, working, current, saved}){
  if(lecture?.player!=='youtube')return null;
  const ready=lecture.cues.length>0;
  const english=ready?'영어 자막 준비됨':preparing?'영어 자막 준비 중':
    lecture.captionStatus==='failed'?'영어 자막 실패':
    lecture.unavailable||lecture.captionStatus==='unavailable'?'영어 자막 이용 불가':
    lecture.captionStatus==='pending'&&!checkError?'영어 자막 준비 중':'영어 자막 미준비';
  if(!ready)return {english,korean:'',canTranslate:false};
  const korean=count===null?'한국어 저장 확인 중':count===undefined?'한국어 저장 확인 불가':
    count?`한국어 ${count} / ${lecture.cues.length}문장 저장됨`:'한국어 저장 없음';
  const hint=chrome?(availability==='unavailable'?'Chrome 번역 이용 불가':
    availability==='checking'?'Chrome 번역 지원 확인 중':availability==='unknown'?'Chrome 번역 지원 확인 불가':''):!aiReady?'ChatGPT 계정·모델 필요':'';
  return {english,korean:hint?`${korean} · ${hint}`:korean,
    canTranslate:current>=0&&!saved&&(chrome?!working&&['available','downloadable','downloading'].includes(availability):aiReady&&!running)};
}
