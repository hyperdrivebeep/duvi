import test from 'node:test';
import assert from 'node:assert/strict';
import {LibraryUI} from '../src/library-ui.mjs';

function harness(t){
  const originalDocument=globalThis.document,originalOption=globalThis.Option;
  const select={value:'A',replaceChildren(){this.value='';}};
  globalThis.document={getElementById:()=>select};
  globalThis.Option=class{constructor(label,value){this.label=label;this.value=value;}};
  t.after(()=>{globalThis.document=originalDocument;globalThis.Option=originalOption;});
  const ui=Object.create(LibraryUI.prototype);Object.assign(ui,{rows:[],folders:[],refreshVersion:0,render(){}});
  return {ui,select};
}
test('background refresh keeps a lecture selected while library requests were in flight',async t=>{
  const {ui,select}=harness(t);let release;
  const gate=new Promise(resolve=>release=resolve);
  ui.api=async route=>{await gate;return route==='/api/library'?[{number:'A',title:'A'},{number:'B',title:'B'}]:{folders:[]};};
  const refresh=ui.refresh('A');select.value='B';release();await refresh;
  assert.equal(select.value,'B');
});
test('late older refresh cannot replace a newer folder and lecture snapshot',async t=>{
  const {ui}=harness(t);let release;const gate=new Promise(resolve=>release=resolve);
  ui.api=async route=>{await gate;return route==='/api/library'?[{number:'A',title:'old'}]:{folders:[]};};
  const older=ui.refresh('A');
  ui.api=async route=>route==='/api/library'?[{number:'A',title:'new'}]:{folders:[{id:'new'}]};
  await ui.refresh('A');release();await older;
  assert.equal(ui.rows[0].title,'new');assert.equal(ui.folders[0].id,'new');
});
