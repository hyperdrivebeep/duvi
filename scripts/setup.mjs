import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseVtt,sentences} from '../backend/core.mjs';
import {atomicJSON} from '../backend/vault.mjs';

const project=fileURLToPath(new URL('..',import.meta.url));
// An alternate output directory permits a clean-install check without touching local study data.
const root=path.resolve(process.env.STUDY_SETUP_ROOT||path.join(project,'backend'));
const sources=JSON.parse(await readFile(new URL('./mit-sources.json',import.meta.url),'utf8'));
await mkdir(path.join(root,'data'),{recursive:true});
const catalog=[];
for(const source of sources){
  const file=path.join(root,'data',`${source.number}.json`);
  let lecture;
  try{lecture=JSON.parse(await readFile(file,'utf8'));}
  catch(error){
    if(error.code!=='ENOENT')throw error;
    const response=await fetch(source.captionUrl,{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error(`MIT ${source.number}: HTTP ${response.status}`);
    const cues=sentences(parseVtt(await response.text()));
    if(!cues.length)throw new Error(`MIT ${source.number}: no captions`);
    lecture={...source,cues};await atomicJSON(file,lecture);
  }
  catalog.push({number:lecture.number,title:lecture.title,duration:lecture.cues.at(-1).end,cueCount:lecture.cues.length});
  console.log(`MIT ${source.number}: ${lecture.cues.length} captions ready`);
}
await atomicJSON(path.join(root,'data/catalog.json'),catalog);
if(process.argv.includes('--youtube')){
  if(process.platform!=='win32')throw new Error('The bundled YouTube importer currently requires Windows.');
  const binary=path.join(root,'vendor','yt-dlp.exe');
  const expected='66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a';
  let bytes;
  try{bytes=await readFile(binary);}catch(error){
    if(error.code!=='ENOENT')throw error;
    const response=await fetch('https://github.com/yt-dlp/yt-dlp/releases/download/2026.08.19/yt-dlp.exe',{signal:AbortSignal.timeout(120000)});
    if(!response.ok)throw new Error(`yt-dlp: HTTP ${response.status}`);
    bytes=Buffer.from(await response.arrayBuffer());
  }
  if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error('yt-dlp integrity check failed; file was not replaced.');
  await mkdir(path.dirname(binary),{recursive:true});
  try{await access(binary);}catch{await writeFile(binary,bytes,{flag:'wx'});}
  console.log('YouTube importer verified.');
}
console.log('Setup complete. Videos and personal translations were not downloaded.');
