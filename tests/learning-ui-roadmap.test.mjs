import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LearningUI} from '../src/learning-ui.mjs';
import {setupStudyView} from '../src/study-view.mjs';
import {createRoot,installDom} from './fake-dom.mjs';

function setupPage(t){
  const restore=installDom();
  t.after(restore);
  const nodes=new Map(), styles=new Map(), sizes=new Map();
  const get=id=>{
    if(!nodes.has(id)){
      const node=createRoot(),classes=new Set();
      Object.assign(node,{id,selectedOptions:[],
        focus(){if(!this.inert)document.activeElement=this;},
        contains(child){for(;child;child=child.parentElement)if(child===this)return true;return false;},
        classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},
        style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)},
        querySelectorAll:()=>[],querySelector:get
      });
      Object.defineProperty(node,'parentElement',{get:()=>node.parentNode});
      const append=node.append.bind(node);
      node.append=child=>{if(child.parentNode)child.parentNode.childNodes.splice(child.parentNode.childNodes.indexOf(child),1);append(child);};
      nodes.set(id,node);
    }
    return nodes.get(id);
  };
  const body=get('body'),stage=get('stage'),dialog=get('learningDialog'),header=get('.dialog-header');
  body.append(stage);body.append(dialog);body.append(get('openLearning'));stage.append(get('studyFullscreen'));
  get('settingsWrap').append(get('studySettingsPanel'));
  const events=new EventTarget();
  Object.assign(document,{body,activeElement:body,getElementById:get,querySelectorAll:()=>[],
    querySelector:selector=>selector==='dialog[open]'&&dialog.open?dialog:null,
    addEventListener:events.addEventListener.bind(events)});
  dialog.showModal=()=>{dialog.open=true;dialog.focus();};
  dialog.close=()=>{dialog.open=false;body.focus();dialog.dispatch('close');};
  stage.requestFullscreen=()=>Promise.reject(new Error('native fullscreen unavailable'));
  for(const [key,value] of Object.entries({
    Option:function(){return document.createElement('option');},
    localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:true}),
    MutationObserver:class{observe(){}},addEventListener(){},requestAnimationFrame(){},
    ResizeObserver:class{constructor(callback){this.callback=callback;}observe(node){sizes.set(node,this.callback);}}
  })){
    const previous=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
    t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else delete globalThis[key];});
  }
  const ui=new LearningUI({capture:()=>null,player:{},closeLibrary(){}});
  return {ui,stage,dialog,header,styles,sizes,get,esc(){
    const event=Object.assign(new Event('keydown',{cancelable:true}),{key:'Escape'});
    events.dispatchEvent(event);
    if(!event.defaultPrevented&&dialog.open)dialog.close();
  }};
}

test('the roadmap keeps its named close button in a sticky header within the scrolling dialog', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/learning.css', import.meta.url), 'utf8');
  const roadmap = html.match(/<dialog id="learningDialog"[^>]*>(.*?)<\/dialog>/s)?.[1];
  assert.ok(roadmap);
  assert.match(roadmap, /^<header class="dialog-header">.*?<button id="closeLearning" aria-label="학습 로드맵 닫기">닫기<\/button><\/header>/s);
  assert.match(css, /#learningDialog\s*>\s*\.dialog-header\s*\{[^}]*position:\s*sticky\b[^}]*top:\s*0\b/);
  assert.match(css, /^#learningDialog\s*\{[^}]*scroll-padding-top:\s*calc\(var\(--roadmap-header-height,/m);
});

test('Escape closes the open dialog before it can exit fallback fullscreen',async t=>{
  const {ui,stage,dialog,get,esc}=setupPage(t);
  const view=setupStudyView({});
  try{
    await get('fullscreen').onclick({currentTarget:get('fullscreen')});
    ui.modal(dialog);
    esc();
    assert.equal(dialog.open,false);
    assert.equal(stage.classList.contains('study-focus'),true);
    esc();
    assert.equal(stage.classList.contains('study-focus'),false);
  }finally{await view.exit();}
});

test('closing the roadmap returns focus to the fallback fullscreen stage if its opener is unavailable',t=>{
  const {ui,stage,dialog,get}=setupPage(t);
  stage.classList.add('study-focus');
  ui.opener=get('openLearning');
  ui.opener.isConnected=true;
  ui.opener.inert=true;
  ui.modal(dialog);
  assert.equal(dialog.parentElement,stage);
  get('closeLearning').onclick();
  assert.equal(document.activeElement,stage);
  assert.equal(dialog.parentElement,document.body);
});

test('the scroll inset follows the header height when its subtitle wraps',t=>{
  const {header,sizes,styles}=setupPage(t);
  let height=100;
  header.getBoundingClientRect=()=>({height});
  const resized=sizes.get(header);
  resized();
  assert.equal(styles.get('--roadmap-header-height'),'100px');
  height=136;
  resized();
  assert.equal(styles.get('--roadmap-header-height'),'136px');
});
