import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {revealsControls,holdsControls,hideControls} from '../src/study-view.mjs';

const target=matches=>({target:{closest:selector=>matches(selector)?{}:null}});
test('typing in a note field keeps fullscreen controls hidden; other keys reveal them',()=>{
  assert.equal(revealsControls(target(selector=>selector.includes('textarea'))),false);
  assert.equal(revealsControls(target(()=>false)),true);
  assert.equal(revealsControls({target:null}),true);
});
test('the top-edge reveal band leaves the notes panel column uncovered',async()=>{
  const css=await readFile(new URL('../src/study-view.css',import.meta.url),'utf8');
  const panelWidth=css.match(/\.stage\.study-focus\.has-transcript\{grid-template-columns:minmax\(0,1fr\) (\d+px)\}/)[1];
  assert.match(css,new RegExp(`\\.study-focus\\.has-transcript\\.controls-hidden::after\\{right:${panelWidth}\\}`));
});
test('pointing or clicking in the notes panel keeps fullscreen controls hidden',()=>{
  assert.equal(revealsControls(target(selector=>selector.includes('.transcript-panel'))),false);
});
test('only keyboard focus or a non-button control in the toolbar holds fullscreen controls open',()=>{
  const focused=({tag,visible})=>({matches:selector=>selector===':focus-visible'?visible:selector==='button'&&tag==='button'});
  assert.equal(holdsControls(focused({tag:'button',visible:false})),false);
  assert.equal(holdsControls(focused({tag:'button',visible:true})),true);
  assert.equal(holdsControls(focused({tag:'select',visible:false})),true);
  assert.equal(holdsControls(null),false);
});
test('hiding the toolbar after a click on its button stays hidden instead of the lost focus revealing it again',()=>{
  const classes=new Set(),attributes={},saved=globalThis.document,button={};
  // Like the page: focus leaving a toolbar button fires focusout, whose handler reveals the toolbar.
  const stage={classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},focus(){if(document.activeElement===button)classes.delete('controls-hidden');document.activeElement=stage;}};
  const toolbar={contains:node=>node===button},handle={setAttribute:(name,value)=>{attributes[name]=value;}};
  try{
    globalThis.document={activeElement:button};
    hideControls(stage,toolbar,handle);
    assert.equal(classes.has('controls-hidden'),true);assert.equal(document.activeElement,stage);assert.equal(attributes['aria-expanded'],'false');
  }finally{globalThis.document=saved;}
});
