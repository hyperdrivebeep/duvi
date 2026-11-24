// Where the 확인 문제 and 돌아보기 modules' links go (`open(target)` in quiz-api.mjs). The shell supplies one handler per
// kind; the learning dialog's tabs (roadmap, records, review, backup) are opened as they are, never copied.
export const ROUTE_KINDS=Object.freeze(['lecture','quiz','repo','records','review','roadmap','backup','sources','settings','resource','note']);
/** The ten-minute quiz segment that holds a playback time; ids follow backend/learning-quiz.mjs segmentsFor (`s<start>`). */
export const SEGMENT_SECONDS=600;
export function segmentIdAt(seconds){return `s${Math.floor(Math.max(0,Number(seconds)||0)/SEGMENT_SECONDS)*SEGMENT_SECONDS}`;}
/** Runs the handler for target.kind. An unknown kind changes nothing and returns false, so a stale link cannot break a screen. */
export function routeTarget(target,handlers){
  const kind=target?.kind;
  if(!ROUTE_KINDS.includes(kind)||typeof handlers[kind]!=='function')return false;
  return handlers[kind](target)??true;
}
