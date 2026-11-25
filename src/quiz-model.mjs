import {formatTime,isOpenQuestion,dueRecords} from './learning-model.mjs';

// Shared wording and derived values for the 확인 문제 and 돌아보기 screens. Counts are evidence, never a mastery score.
export const EVIDENCE_LABEL=Object.freeze({executed:'정답: 실제 실행 결과',source_quoted:'원문 인용 확인',learner_confirmed:'내가 확인',ai_unverified:'AI 제안 · 정답 미검증',retired:'신고해 뺌'});
export const EVIDENCE_GLYPH=Object.freeze({executed:'▶',source_quoted:'✓',learner_confirmed:'●',ai_unverified:'△',retired:'—'});
export const TYPE_LABEL=Object.freeze({predict:'예측',recall:'원문 회상',discriminate:'구별 실험',withhold:'판단 보류'});
export const CONFIDENCE_LABEL=Object.freeze({low:'낮음',medium:'보통',high:'높음'});
export const RESULT_LABEL=Object.freeze({right:'예상과 같음',wrong:'예상과 다름'});
export const NO_EVIDENCE='아직 증거 없음';
const time=value=>Date.parse(value)||0;
export function evidenceText(status){return `${EVIDENCE_GLYPH[status]} ${EVIDENCE_LABEL[status]}`;}
export function segmentLabel(segment){return `${formatTime(segment.start)}~${formatTime(segment.end)}`;}
export function parseClock(value){const match=/^(?:(\d+):)?(\d{1,3}):(\d\d)$/.exec(String(value||'').trim());return match?Number(match[1]||0)*3600+Number(match[2])*60+Number(match[3]):null;}
export function sourceLabel(source){
  if(source.kind==='transcript')return `대본 ${source.ref}`;
  return `${source.kind==='wiki'?'위키':'내 저장소'} ${source.repo?source.repo+'/':''}${source.ref}`;
}
/** Where a source chip leads: the lecture time, or a repository path and first line. */
export function sourceTarget(source,lectureId){
  if(source.kind==='transcript'){const seconds=parseClock(source.ref);return seconds===null?null:{kind:'lecture',lectureId:String(lectureId),seconds};}
  const match=/^(.+):(\d+)-(\d+)$/.exec(source.ref);return match?{kind:'repo',repo:source.repo||'',path:match[1],line:Number(match[2])}:null;
}
/** Latest attempt per question, keyed by item id. */
export function latestAttempts(attempts){
  const latest=new Map();for(const row of attempts||[]){const seen=latest.get(row.itemId);if(!seen||time(row.createdAt)>=time(seen.createdAt))latest.set(row.itemId,row);}
  return latest;
}
/** Attempts whose latest try for the question is due for review (wrong → 1 day, right and unsure → 3, right and sure → 7). */
export function dueAttempts(attempts,now=Date.now()){return [...latestAttempts(attempts).values()].filter(row=>row.reviewDueAt&&time(row.reviewDueAt)<=now);}
export function itemResult(item,latest){
  if(item.evidence==='retired')return '신고해 뺌';
  const row=latest.get(item.id);return row?`풂 · ${row.result==='right'?'✓ 맞음':'✕ 틀림'}`:'안 풂';
}
export function segmentProgress(segment,attempts){
  const items=(segment.set?.items||[]).filter(item=>item.evidence!=='retired'),latest=latestAttempts(attempts);
  return {total:items.length,solved:items.filter(item=>latest.has(item.id)).length};
}
/** Counts for 돌아보기. A missing kind of evidence stays null so the screen can say so instead of showing 0. */
export function evidenceSummary(state,evidence,now=Date.now()){
  const records=state.records||[],attempts=state.attempts||[];
  const open=records.filter(isOpenQuestion).length,explained=records.filter(row=>row.explanation?.trim()).length;
  const byEvidence=Object.fromEntries(['executed','source_quoted','learner_confirmed','ai_unverified','retired'].map(key=>[key,attempts.filter(row=>row.evidence===key).length]));
  const repos=evidence?.configured?evidence.repos:[],commits=repos.reduce((sum,row)=>sum+row.commits.length,0),tests=repos.flatMap(row=>row.tests);
  return {
    records:records.length?{total:records.length,open,explained}:null,
    attempts:attempts.length?{total:attempts.length,right:attempts.filter(row=>row.result==='right').length,byEvidence}:null,
    repos:evidence?.configured?(commits||tests.length?{commits,testFiles:tests.length,passed:tests.reduce((sum,row)=>sum+row.passed,0),failed:tests.reduce((sum,row)=>sum+row.failed,0)}:null):'unconfigured',
    dueToday:dueRecords(records,now).length+dueAttempts(attempts,now).length,
  };
}
/** One time-ordered log of questions, explanations, attempts, commits and test results (newest first). */
export function evidenceLog(state,evidence,{lectureName=id=>`강의 ${id}`,limit=60}={}){
  const rows=[];
  for(const record of state.records||[]){
    const id=record.lectureId||record.anchor?.lectureId,seconds=record.anchor?.seconds;
    rows.push({at:record.updatedAt,group:'records',kind:isOpenQuestion(record)?'질문':record.explanation?.trim()?'내 설명':'질문',text:record.question||record.explanation||record.title||'',
      source:id?{label:`${lectureName(id)} ${formatTime(seconds)}`,target:{kind:'lecture',lectureId:String(id),seconds:seconds||0}}:null});
  }
  for(const attempt of state.attempts||[]){
    const target=sourceTarget(attempt.item.source,attempt.lectureId);
    rows.push({at:attempt.createdAt,group:'quiz',kind:'확인 문제',text:`${attempt.item.prompt} · ${attempt.result==='right'?'✓ 예상과 같음':'✕ 예상과 다름'} (${EVIDENCE_LABEL[attempt.evidence]})`,
      source:{label:attempt.item.source.kind==='transcript'?`${lectureName(attempt.lectureId)} ${attempt.item.source.ref}`:sourceLabel(attempt.item.source),target}});
  }
  for(const repo of evidence?.configured?evidence.repos:[]){
    for(const commit of repo.commits)rows.push({at:commit.date,group:'repo',kind:'커밋',text:commit.subject,source:{label:`${repo.label} ${commit.sha} (읽기 전용)`,target:null}});
    for(const test of repo.tests){
      const failed=test.cases.filter(row=>row.status==='failed').slice(0,3).map(row=>row.name);
      rows.push({at:test.updatedAt,group:'repo',kind:test.failed?`테스트 ✕ 실패 ${test.failed}`:'테스트 ✓ 통과',text:`${test.file} · 통과 ${test.passed} · 실패 ${test.failed} · 건너뜀 ${test.skipped}${failed.length?` · ${failed.join(', ')}`:''}`,source:{label:`${repo.label} (읽기 전용)`,target:null}});
    }
  }
  return rows.sort((a,b)=>time(b.at)-time(a.at)).slice(0,limit);
}
export function shortDate(value){const date=new Date(value);return Number.isFinite(date.getTime())?`${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`:'';}
