import {RECORD_FIELDS} from './learning-model.mjs';
export function providerInput(record,mode){const anchor=record.anchor||{};return {mode,source:{lectureId:anchor.lectureId,start:anchor.cueStart,end:anchor.cueEnd,excerpt:anchor.sourceText},learner:Object.fromEntries(RECORD_FIELDS.map(key=>[key,record[key]||''])),help:record.help};}
export function prepareTutorContext(draft,saved,help){
  if(!saved?.id||!Number.isSafeInteger(saved.revision)||draft.id!==saved.id||draft.revision!==saved.revision||JSON.stringify(providerInput(draft,'hint'))!==JSON.stringify(providerInput(saved,'hint')))throw new Error('저장하지 않은 변경이 있습니다. 현재 입력을 저장하고 최신 기록으로 전송 문맥을 다시 확인하세요.');
  const mode={hint:'hint',partial:'critique',full:'explain'}[help];if(!mode)throw new Error('요청 수준을 선택하세요.');
  return structuredClone({recordId:saved.id,recordRevision:saved.revision,mode,help,input:providerInput(saved,mode)});
}
export function tutorRequest(context){return {recordId:context.recordId,recordRevision:context.recordRevision,mode:context.mode};}
