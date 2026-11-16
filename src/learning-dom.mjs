import {safeWebUrl} from './learning-model.mjs';
export function el(tag,className='',text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
export function button(text,action,className=''){const node=el('button',className,text);node.type='button';if(action)node.addEventListener('click',action);return node;}
export function link(text,url){const href=safeWebUrl(url);if(!href)return el('span','muted',text+' · 주소 확인 필요');const node=el('a','learning-link',text);node.href=href;node.target='_blank';node.rel='noopener noreferrer';return node;}
export function field(label,name,{value,options,rows=3,required=false}={}){
  const wrap=el('label','learning-field'),title=el('span','',label),input=el(options?'select':'textarea');input.name=name;input.required=required;
  if(options)for(const [key,text] of Object.entries(options)){const option=el('option','',text);option.value=key;input.append(option);}else{input.rows=rows;input.maxLength=name==='title'?300:12000;}
  input.value=value??(options?Object.keys(options)[0]:'');wrap.append(title,input);return {wrap,input};
}
export function download(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function describe(value){return typeof value==='string'?value:JSON.stringify(value,null,2);}
export async function busy(node,action){node.disabled=true;try{return await action();}finally{node.disabled=false;}}
