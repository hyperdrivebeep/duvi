import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAnchor,anchorState,markdownEscape,recordMarkdown,PROGRESS,HELP,nextResource,firstLecture,dueRecords,validateRecord,FIRST_TWO_WEEKS,apiErrorMessage} from '../src/learning-model.mjs';
import {browserKey,captureBrowser,parseBackup} from '../src/learning-backup-ui.mjs';
import {recordInput,LearningUI} from '../src/learning-ui.mjs';
import {LearningEditor} from '../src/learning-editor.mjs';
const cue={start:10,end:20,en:'A source <script>text</script>'};
const lecture={number:1,alignmentRevision:'r1',cues:[cue]};
const anchor=makeAnchor({lecture,seconds:12,cue,translation:'원문 번역'});
const record={resourceId:'mit-1',lectureId:'1',question:'왜?',explanation:'',help:'none',anchor,reviewDueAt:null};

test('question-only is accepted only with lecture/time/text snapshot',()=>{
  assert.equal(validateRecord(record),'');assert.match(validateRecord({...record,anchor:null}),/자막/);assert.match(validateRecord({...record,question:''}),/질문/);
  assert.equal(anchor.translation,'원문 번역');assert.equal(anchor.alignmentRevision,'r1');assert.equal(anchor.cueStart,10);
});
test('source jump never silently attaches to changed revision, text, or another lecture',()=>{
  assert.equal(anchorState(anchor,lecture).status,'matched');assert.equal(anchorState(anchor,{...lecture,alignmentRevision:'r2'}).status,'changed');
  assert.equal(anchorState(anchor,{...lecture,cues:[{...cue,en:'different'}]}).status,'missing');assert.equal(anchorState(anchor,{...lecture,number:2}).status,'missing');
  assert.equal(anchorState(anchor,{...lecture,cues:[{...cue,start:11}]}).status,'missing');
});
test('Markdown escapes HTML, links, headings and formatting in user content',()=>{
  const hostile='<script>alert(1)</script> [run](javascript:evil)\n# fake *bold*';const escaped=markdownEscape(hostile);
  assert.ok(!escaped.includes('<script>'));assert.ok(!escaped.includes('[run]('));assert.ok(escaped.includes('\\# fake'));
  const markdown=recordMarkdown({...record,explanation:hostile,originalExplanation:'first',history:[{help:'none'}]});assert.ok(markdown.includes('first'));assert.ok(markdown.includes('미기록'));assert.ok(!markdown.includes('<script>'));
});
test('progress is explicit and continuation respects source order without mastery inference',()=>{
  const roadmap={phases:[{resources:[{id:'a',lectureId:'1'},{id:'b',lectureId:'2'},{id:'c'}]}]};
  assert.equal(firstLecture(roadmap).id,'a');assert.equal(nextResource(roadmap,{}).id,'a');assert.equal(nextResource(roadmap,{a:{status:'explained'},b:{status:'practicing'}}).id,'b');
  assert.equal(nextResource(roadmap,{a:'watching',b:'watching'}).id,'a');assert.equal(Object.keys(PROGRESS).length,5);assert.equal(Object.keys(HELP).length,4);
});
test('review uses due date, not video completion or invalid dates',()=>{
  const rows=[{id:'past',reviewDueAt:'2020-01-01T00:00:00Z'},{id:'future',reviewDueAt:'2030-01-01T00:00:00Z'},{id:'none'},{id:'bad',reviewDueAt:'oops'}];assert.deepEqual(dueRecords(rows,Date.parse('2026-01-01')).map(r=>r.id),['past']);assert.equal(FIRST_TWO_WEEKS.length,10);
});
test('backup browser allowlist excludes credentials/model/account and rejects malicious import',()=>{
  const entries={'study-positions':'{"1":12}','mit6100-ko-1-r1':'{}',token:'secret','mit6100-ai-model':'model','duvi-caption-placement':'"dock"'};
  const storage={length:Object.keys(entries).length,key:i=>Object.keys(entries)[i],getItem:key=>entries[key]};const captured=captureBrowser(storage);
  assert.deepEqual(Object.keys(captured),['study-positions','mit6100-ko-1-r1','duvi-caption-placement']);assert.equal(browserKey('accessToken'),false);
  assert.throws(()=>parseBackup(JSON.stringify({format:'duvi-local-backup',schemaVersion:1,browser:{token:'secret'}})),/자격증명/);
  assert.deepEqual(parseBackup('{"schemaVersion":1,"learning":{}}').browser,{});
});
test('wire record contains only agreed writable fields; history and first explanation stay server-owned',()=>{
  const payload=recordInput({...record,id:'abc',revision:5,originalExplanation:'first',history:[],reviews:[],schemaVersion:1});
  assert.equal(payload.id,'abc');assert.equal(payload.originalExplanation,undefined);assert.equal(payload.revision,undefined);assert.deepEqual(payload.anchor,anchor);
});
test('409 does not mutate current state; fresh revision is used on explicit retry',async()=>{
  const ui=Object.create(LearningUI.prototype);ui.loaded=true;ui.state={revision:2,records:[]};ui.renderPanel=()=>{};
  ui.api=async()=>{const e=new Error('conflict');e.status=409;throw e;};await assert.rejects(ui.mutate('/api/learning/records',{record}),{status:409});assert.equal(ui.state.revision,2);assert.equal(ui.saving,false);
  ui.state={revision:3,records:[]};ui.api=async(route,body)=>{assert.equal(body.revision,3);return {revision:4,records:[record]};};await ui.mutate('/api/learning/records',{record});assert.equal(ui.state.revision,4);
});
test('editor retains typed draft and anchor after network or revision save errors',async()=>{
  for(const status of [503,409]){const editor=Object.create(LearningEditor.prototype);editor.record={...record};editor.key='draft';editor.inputs=Object.fromEntries(['title','question','explanation','observation','assumptions','alternative','prediction','result','revisionNote'].map(key=>[key,{value:record[key]||''}]));editor.inputs.help={value:'none'};editor.inputs.reviewDays={value:'none'};editor.fields={disabled:false};editor.notice={textContent:''};editor.conflictButton={hidden:true};let stashed;
    editor.stash=()=>stashed=editor.value();editor.onSave=async()=>{const e=new Error('network');e.status=status;throw e;};await editor.save();assert.equal(editor.inputs.question.value,'왜?');assert.deepEqual(stashed.anchor,anchor);assert.equal(editor.fields.disabled,false);assert.equal(editor.conflictButton.hidden,status!==409);
  }
  assert.match(apiErrorMessage({status:409}),/초안은 유지/);
});

test('anchor time stays within the captured displayed cue even in an inter-cue gap',()=>{
  assert.equal(makeAnchor({lecture,cue,seconds:25}).seconds,20);
  assert.equal(makeAnchor({lecture,cue,seconds:0}).seconds,10);
});

import {prepareTutorContext,tutorRequest} from '../src/learning-tutor-context.mjs';
import {LearningPlaybackState} from '../src/learning-playback-state.mjs';
import {applyBrowserSnapshot} from '../src/learning-backup-ui.mjs';
import {field} from '../src/learning-dom.mjs';
function storageHarness(){const values=new Map();return {get length(){return values.size;},key:i=>[...values.keys()][i],getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
function editorHarness(saved){
  const editor=Object.create(LearningEditor.prototype);editor.record=structuredClone(saved);editor.savedRecord=saved.id?structuredClone(saved):null;editor.baseRevision=saved.revision;editor.drafts={};editor.key='';editor.fields={disabled:false};
  editor.inputs=Object.fromEntries(['title','question','explanation','observation','assumptions','alternative','prediction','result','revisionNote'].map(key=>[key,{value:saved[key]||'',focus(){}}]));editor.inputs.help={value:saved.help};editor.inputs.reviewDays={value:saved.id?'keep':'1'};
  for(const key of ['notice','anchorSummary','anchorText','tutorAnswer','tutorPreview','preview'])editor[key]={textContent:''};for(const key of ['conflictButton','reconcileButton','tutorSend'])editor[key]={hidden:true};editor.showHistory=()=>{};return editor;
}
test('restored dirty draft cannot preview saved provider context; exact saved version is submitted',()=>{
  const saved={...record,id:'saved',revision:3,explanation:'saved answer'},dirty={...saved,explanation:'unsaved private answer'};
  assert.throws(()=>prepareTutorContext(dirty,saved,'hint'),/저장하지 않은 변경/);
  assert.throws(()=>prepareTutorContext({...saved,revision:2},saved,'hint'),/저장하지 않은 변경/);
  const context=prepareTutorContext(saved,saved,'hint');assert.deepEqual(tutorRequest(context),{recordId:'saved',recordRevision:3,mode:'hint'});assert.equal(context.input.learner.explanation,'saved answer');
  saved.explanation='concurrent edit';assert.equal(context.input.learner.explanation,'saved answer');assert.throws(()=>prepareTutorContext(dirty,saved,'hint'));
});
test('restored positions survive periodic save and unload, keep other lectures, resume on reopen',()=>{
  const storage=storageHarness(),positions={'1':10,'2':20};storage.setItem('study-positions',JSON.stringify(positions));const playback=new LearningPlaybackState(positions,storage);
  applyBrowserSnapshot(storage,{'study-positions':'{"1":150,"3":300}'},'replace');playback.restore('1',false);
  assert.deepEqual(positions,{'1':150,'2':20,'3':300});playback.observePlayback('1',false);assert.equal(playback.save('1',12),false);assert.equal(playback.save('1',13),false);assert.equal(JSON.parse(storage.getItem('study-positions'))['1'],150);
  playback.beginLecture();assert.equal(positions['1'],150);playback.save('1',151);assert.equal(JSON.parse(storage.getItem('study-positions'))['3'],300);
});
test('merge position import preserves current conflicts and adds missing lecture positions',()=>{
  const storage=storageHarness();storage.setItem('study-positions','{"1":10}');applyBrowserSnapshot(storage,{'study-positions':'{"1":150,"2":200}'},'merge');assert.deepEqual(JSON.parse(storage.getItem('study-positions')),{'1':10,'2':200});
});
test('restored current position may be replaced after explicit playback intent',()=>{
  const storage=storageHarness();storage.setItem('study-positions','{"1":150}');const state=new LearningPlaybackState({},storage);state.restore('1',false);state.observePlayback('1',true);state.observePlayback('1',false);assert.equal(state.save('1',22),true);
});
test('editing an unscheduled record keeps none; choosing seven days replaces an existing schedule',()=>{
  const editor=editorHarness({...record,id:'saved',revision:1,reviewDueAt:null});assert.equal(editor.value().reviewDueAt,null);editor.record.reviewDueAt='2020-01-01T00:00:00.000Z';assert.equal(editor.value().reviewDueAt,'2020-01-01T00:00:00.000Z');
  editor.inputs.reviewDays.value='7';const before=Date.now();assert.ok(Math.abs(Date.parse(editor.value().reviewDueAt)-(before+7*86400000))<1000);editor.inputs.reviewDays.value='none';assert.equal(editor.value().reviewDueAt,null);
});
test('select fields choose first real option unless an explicit value is supplied',()=>{
  const original=globalThis.document;globalThis.document={createElement:tag=>({tag,children:[],append(...nodes){this.children.push(...nodes);}})};
  try{assert.equal(field('help','help',{options:HELP}).input.value,'none');assert.equal(field('mode','mode',{options:{merge:'keep',replace:'replace'}}).input.value,'merge');assert.equal(field('help','help',{options:HELP,value:'full'}).input.value,'full');}finally{globalThis.document=original;}
});
test('unchanged editor never caches stale server data; reopen uses fresh server record',()=>{
  const original=globalThis.localStorage;globalThis.localStorage=storageHarness();try{const editor=editorHarness({...record,id:'saved',revision:1,explanation:'first'});editor.key='saved';editor.stash();assert.deepEqual(editor.drafts,{});editor.open({...record,id:'saved',revision:2,explanation:'edited elsewhere'});assert.equal(editor.inputs.explanation.value,'edited elsewhere');assert.equal(editor.baseRevision,2);}finally{globalThis.localStorage=original;}
});
test('dirty restored draft keeps original record revision and cannot silently overwrite newer server record',async()=>{
  const original=globalThis.localStorage;globalThis.localStorage=storageHarness();try{const editor=editorHarness({...record,id:'saved',revision:1,explanation:'first'});editor.key='saved';editor.inputs.explanation.value='my draft';editor.stash();editor.open({...record,id:'saved',revision:2,explanation:'new server answer'});
    assert.equal(editor.inputs.explanation.value,'my draft');assert.equal(editor.savedRecord.explanation,'new server answer');assert.equal(editor.baseRevision,1);assert.equal(editor.draftConflict,true);assert.equal(editor.value().revision,1);let writes=0;editor.onSave=async()=>writes++;await editor.save();assert.equal(writes,0);assert.equal(editor.drafts.saved.record.explanation,'my draft');assert.throws(()=>prepareTutorContext(editor.value(),editor.savedRecord,'hint'));
  }finally{globalThis.localStorage=original;}
});
test('record updates carry original per-record revision even when global state has advanced',async()=>{
  const ui=Object.create(LearningUI.prototype);ui.state={revision:12,records:[{id:'saved'}]};ui.mutate=async(route,body)=>{assert.equal(body.recordRevision,2);assert.equal(body.record.revision,undefined);return {records:[{...record,id:'saved',revision:3}]};};const saved=await ui.saveRecord({...record,id:'saved',revision:2});assert.equal(saved.revision,3);
});

import {resourceAction} from '../src/learning-map-view.mjs';
test('continuation to external practice opens the source link instead of lecture preparation',()=>{
  const original=globalThis.document;globalThis.document={createElement:tag=>({tag,addEventListener(){}})};
  try{let loads=0;const resource={id:'mit-finger-exercises',title:'Finger exercises',url:'https://ocw.mit.edu/exercises/'},action=resourceAction(resource,'이어서 공부하기',()=>loads++);assert.equal(action.tag,'a');assert.equal(action.href,resource.url);assert.equal(action.target,'_blank');assert.equal(loads,0);assert.equal(resourceAction({...resource,lectureId:'1'},'강의',()=>loads++).tag,'button');}finally{globalThis.document=original;}
});
