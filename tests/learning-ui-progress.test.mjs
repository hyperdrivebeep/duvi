import test from 'node:test';
import assert from 'node:assert/strict';
import {completionSummary,resourceCompleted,resourceProgressId,nextResource,lectureResource} from '../src/learning-model.mjs';
import {LearningUI} from '../src/learning-ui.mjs';
const first={id:'mit-1',lectureId:'1'},second={id:'mit-2',lectureId:'2'},reading={id:'reading'};
const roadmap={phases:[{resources:[first,second]},{resources:[reading]}]};
test('activity does not silently certify completion',()=>{
  const progress={'mit-1':{status:'reviewed'},'mit-2':{status:'explained'}};
  assert.deepEqual(completionSummary(roadmap,progress),{done:0,total:3,percent:0});assert.equal(nextResource(roadmap,progress),first);
});
test('complete, undo and final external resource drive counts and next action',()=>{
  const progress={'mit-1':{completed:true,status:'watching'}};
  assert.equal(nextResource(roadmap,progress),second);assert.equal(completionSummary(roadmap,progress).percent,33);
  progress['mit-2']={completed:true};assert.equal(nextResource(roadmap,progress),reading);
  progress.reading={completed:true};assert.equal(nextResource(roadmap,progress),null);assert.equal(completionSummary(roadmap,progress).percent,100);
  progress['mit-1'].completed=false;assert.equal(nextResource(roadmap,progress),first);assert.equal(completionSummary(roadmap,progress).done,2);
});
test('a repeated lecture shares completion and custom lectures get a stable key',()=>{
  const duplicate={id:'repeat',lectureId:'1'},repeated={phases:[{resources:[first,duplicate,reading]}]},progress={'mit-1':{completed:true}};
  assert.equal(resourceProgressId(repeated,duplicate),'mit-1');assert.equal(resourceCompleted(repeated,progress,duplicate),true);assert.equal(completionSummary(repeated,progress).done,2);
  assert.deepEqual(lectureResource(roadmap,'99','Custom'),{id:'lecture-99',lectureId:'99',title:'Custom'});
});
test('reading-only and empty phases have valid denominators',()=>{
  assert.deepEqual(completionSummary(roadmap,{},[reading]),{total:1,done:0,percent:0});assert.deepEqual(completionSummary(roadmap,{},[]),{total:0,done:0,percent:0});
});
test('next lecture keeps failed navigation visible and closes mobile library only after successful retry',async()=>{
  const ui=Object.create(LearningUI.prototype);let libraryOpen=true,roadmapOpen=false,shownError;
  ui.notice={textContent:''};ui.closeLibrary=()=>{libraryOpen=false;};ui.dialog={close:()=>{roadmapOpen=false;}};ui.sync=()=>{shownError=ui.resourceError;};
  ui.onOpen=async()=>{throw new Error('강의를 먼저 준비하세요.');};await ui.openResource(second);
  assert.equal(libraryOpen,true);assert.equal(roadmapOpen,false);assert.equal(shownError,'강의를 먼저 준비하세요.');assert.equal(ui.notice.textContent,shownError);
  ui.onOpen=async resource=>{assert.equal(resource,second);};await ui.openResource(second);
  assert.equal(libraryOpen,false);assert.equal(shownError,'');assert.equal(ui.notice.textContent,'');
});
