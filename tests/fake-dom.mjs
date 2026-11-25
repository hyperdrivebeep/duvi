// A minimal DOM for view-module tests: elements, text, attributes, listeners and the properties the views set.
class FakeElement{
  constructor(tag){this.tagName=tag.toUpperCase();this.childNodes=[];this.attributes={};this.listeners={};this.className='';this.text='';this.parentNode=null;this.dataset={};this.classList={add:name=>{this.className=[this.className,name].filter(Boolean).join(' ');}};}
  append(...nodes){for(const node of nodes){const child=typeof node==='string'?Object.assign(new FakeElement('#text'),{text:node}):node;child.parentNode=this;this.childNodes.push(child);}}
  replaceChildren(...nodes){this.childNodes=[];this.text='';this.append(...nodes);}
  get children(){return this.childNodes.filter(node=>node.tagName!=='#TEXT');}
  prepend(node){node.parentNode=this;this.childNodes.unshift(node);}
  get childElementCount(){return this.children.length;}
  after(node){node.parentNode=this.parentNode;const siblings=this.parentNode.childNodes;siblings.splice(siblings.indexOf(this)+1,0,node);}
  get textContent(){return this.text+this.childNodes.map(node=>node.textContent).join('');}
  set textContent(value){this.childNodes=[];this.text=String(value);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  addEventListener(type,listener){(this.listeners[type]||=[]).push(listener);}
  removeEventListener(type,listener){this.listeners[type]=(this.listeners[type]||[]).filter(row=>row!==listener);}
  dispatch(type){const event={type,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};for(const listener of this.listeners[type]||[])listener(event);return event;}
  click(){if(!this.disabled)return this.dispatch('click');}
}
export function installDom(){
  const saved=globalThis.document;globalThis.document={createElement:tag=>new FakeElement(tag),createTextNode:text=>Object.assign(new FakeElement('#text'),{text:String(text)})};
  return ()=>{globalThis.document=saved;};
}
export function createRoot(){return new FakeElement('div');}
export function all(root,predicate=()=>true){const found=[];const walk=node=>{for(const child of node.childNodes){if(child.tagName!=='#TEXT'){if(predicate(child))found.push(child);walk(child);}}};walk(root);return found;}
export const byTag=(root,tag)=>all(root,node=>node.tagName===tag.toUpperCase());
/** The innermost element whose own text matches (a button, cell or paragraph). */
export function byText(root,text,tag){
  const matches=all(root,node=>(!tag||node.tagName===tag.toUpperCase())&&(text instanceof RegExp?text.test(node.textContent):node.textContent===text));
  return matches.find(node=>!node.children.some(child=>matches.includes(child)))||null;
}
/** Lets the view's awaited API promises and the renders that follow them finish (no timers involved). */
export const settle=()=>new Promise(resolve=>setImmediate(resolve));
