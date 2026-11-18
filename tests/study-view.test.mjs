import test from 'node:test';
import assert from 'node:assert/strict';
import {revealsControls} from '../src/study-view.mjs';

const target=matches=>({target:{closest:selector=>matches(selector)?{}:null}});
test('typing in a note field keeps fullscreen controls hidden; other keys reveal them',()=>{
  assert.equal(revealsControls(target(selector=>selector.includes('textarea'))),false);
  assert.equal(revealsControls(target(()=>false)),true);
  assert.equal(revealsControls({target:null}),true);
});
test('pointing or clicking in the notes panel keeps fullscreen controls hidden',()=>{
  assert.equal(revealsControls(target(selector=>selector.includes('.transcript-panel'))),false);
});
