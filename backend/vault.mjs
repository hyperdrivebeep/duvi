import {readFile,rename,mkdir,open,rm} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export async function atomicWrite(file,content,{renameFile=rename,platform=process.platform}={}){
  await mkdir(path.dirname(file),{recursive:true});
  const temp=`${file}.${process.pid}.${randomUUID()}.tmp`;
  const handle=await open(temp,'wx',0o600);
  try{
    try{await handle.writeFile(content);}finally{await handle.close();}
    // A concurrent reader on Windows can briefly block replacing the destination.
    for(let attempt=0;;attempt++){
      try{await renameFile(temp,file);return;}
      catch(error){
        if(platform!=='win32'||!['EPERM','EBUSY'].includes(error.code)||attempt>=4)throw error;
        await delay(10 * 2**attempt);
      }
    }
  }catch(error){
    await rm(temp,{force:true}).catch(()=>{});
    throw error;
  }
}
export async function atomicJSON(file,value){
  await atomicWrite(file,JSON.stringify(value,null,2));
}
function dpapi(mode,text){
  return new Promise((resolve,reject)=>{
    const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./vault.ps1',import.meta.url)),'-Mode',mode],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='';p.stdout.setEncoding('utf8');p.stdout.on('data',chunk=>output+=chunk);
    // Never include process output in errors: it may contain decrypted credentials.
    p.stderr.resume();p.on('error',()=>reject(new Error('Windows 보안 저장소를 열지 못했습니다.')));
    p.on('close',code=>code===0?resolve(output):reject(new Error('Windows 보안 저장소 처리에 실패했습니다.')));
    p.stdin.on('error',()=>{});p.stdin.end(text);
  });
}
export function createVault(directory){
  const file=path.join(directory,'accounts.dpapi');
  let writes=Promise.resolve();
  return {
    async read(){
      try{return JSON.parse(await dpapi('decrypt',await readFile(file,'utf8')));}
      catch(error){if(error.code==='ENOENT')return null;throw error;}
    },
    write(value){
      const snapshot=JSON.stringify(value);
      const operation=writes.then(async()=>{
        const encrypted=await dpapi('encrypt',snapshot);
        await atomicWrite(file,encrypted);
      });
      writes=operation.catch(()=>{});return operation;
    }
  };
}
