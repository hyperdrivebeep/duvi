import {el,button,field,download,busy} from './learning-dom.mjs';
import {mergePositionValues} from './learning-playback-state.mjs';
const preferenceKeys=['study-positions','mit6100-lecture','mit6100-provider','duvi-fullscreen-caption-size','duvi-caption-placement','duvi-question-autopause'];
export function browserKey(key){return preferenceKeys.includes(key)||/^mit6100-ko-(?:[1-9][0-9]?|yt_[A-Za-z0-9_-]{11})(?:-[A-Za-z0-9_-]{1,160})?$/.test(key);}
export function captureBrowser(storage){return Object.fromEntries(Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(browserKey).map(key=>[key,storage.getItem(key)]));}
export function applyBrowserSnapshot(storage,incoming,mode){for(const [key,value]of Object.entries(incoming)){if(!browserKey(key))throw new Error('지원하지 않는 브라우저 설정입니다.');if(key==='study-positions')storage.setItem(key,JSON.stringify(mergePositionValues(storage.getItem(key),value,mode)));else if(mode==='replace'||storage.getItem(key)===null)storage.setItem(key,value);}}
export function parseBackup(text){
  const data=JSON.parse(text);if(data.format!=='duvi-local-backup')return {backup:data,browser:{}};
  if(data.schemaVersion!==1||!data.browser||typeof data.browser!=='object'||Array.isArray(data.browser))throw new Error('지원하지 않는 브라우저 백업 형식입니다.');
  if(Object.keys(data.browser).length>1000)throw new Error('브라우저 백업 항목이 너무 많습니다.');
  for(const [key,value]of Object.entries(data.browser))if(!browserKey(key)||typeof value!=='string'||value.length>2*1024*1024)throw new Error('지원하지 않는 설정 또는 자격증명 필드가 있습니다.');
  return {backup:data.backup,browser:data.browser};
}
export class LearningBackupUI{
  constructor(root,{api,onImported}){Object.assign(this,{root,api,onImported});this.build();}
  build(){
    this.root.append(el('h3','','백업·복원'),el('p','muted','학습 기록, 질문하기 대화, 강의와 폴더, 저장 번역, 이 브라우저의 재생 위치·자막 설정을 JSON으로 보관합니다. 계정·토큰·쿠키는 제외합니다. 저장하지 않은 초안은 이 브라우저에 남습니다.'));
    this.notice=el('p','notice');this.notice.setAttribute('role','status');
    const exportButton=button('전체 백업 내려받기',()=>busy(exportButton,async()=>{try{const backup=await this.api('/api/learning/export');download(`duvi-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({format:'duvi-local-backup',schemaVersion:1,backup,browser:captureBrowser(localStorage)},null,2),'application/json');this.notice.textContent='백업 파일 내려받기를 요청했습니다. 계정 정보는 포함하지 않았습니다.';}catch(error){this.notice.textContent=error.message;}}),'primary');
    const wrap=el('label','learning-field','복원할 JSON 파일 · 최대 16MB'),input=el('input');input.type='file';input.accept='.json,application/json';wrap.append(input);this.root.append(exportButton,wrap,this.notice);this.preview=el('section','learning-backup-preview');this.root.append(this.preview);
    input.addEventListener('change',()=>{this.preview.replaceChildren();this.incoming=null;this.token=null;const file=input.files[0];if(!file)return;void busy(input,async()=>{try{if(file.size>16*1024*1024)throw new Error('백업 파일은 16MB 이하로 선택하세요.');const incoming=parseBackup(await file.text()),preview=await this.api('/api/learning/import/preview',{backup:incoming.backup});this.incoming=incoming;this.showPreview(preview);this.notice.textContent='아직 복원하지 않았습니다. 항목과 충돌 정책을 확인하세요.';}catch(error){this.notice.textContent=error.message;}});});
  }
  showPreview(preview){
    this.preview.replaceChildren();this.token=preview;
    this.preview.append(el('h4','','가져오기 미리보기'));const list=el('dl','learning-backup-counts');
    const labels={records:'학습 기록',chats:'질문하기 대화',progress:'학습 상태',lectures:'강의',folders:'폴더',translations:'번역'};
    for(const [name,count]of Object.entries(preview.counts||{})){list.append(el('dt','',labels[name]||name),el('dd','',`${count}개 · 충돌 ${(preview.conflicts?.[name]||[]).length}개`));}this.preview.append(list);
    const conflicts=el('details');conflicts.append(el('summary','','충돌 식별자 확인'),el('pre','learning-markdown',JSON.stringify(preview.conflicts||{},null,2)));this.preview.append(conflicts);
    const mode=field('같은 식별자의 항목이 있으면','mode',{options:{merge:'현재 기록 유지 · 없는 항목만 추가',replace:'백업 기록으로 충돌 항목 덮어쓰기'}});this.preview.append(mode.wrap,el('p','muted',`브라우저 설정 ${Object.keys(this.incoming.browser).length}개에도 같은 정책을 적용합니다. 서버는 복원 직전 상태를 별도로 보관합니다. 미리보기는 10분간 유효합니다.`));
    const confirm=el('label','learning-confirm'),checkbox=el('input');checkbox.type='checkbox';confirm.append(checkbox,document.createTextNode('항목과 충돌 정책을 확인했습니다.'));this.preview.append(confirm);
    const apply=button('확인한 백업 복원',()=>busy(apply,async()=>{if(!checkbox.checked){this.notice.textContent='미리보기 확인에 체크하세요.';return;}try{
      await this.api('/api/learning/import',{revision:preview.revision,token:preview.token,mode:mode.input.value});
      let browserError='';try{applyBrowserSnapshot(localStorage,this.incoming.browser,mode.input.value);}catch{browserError=' 브라우저 저장 공간이 부족해 일부 위치·설정을 적용하지 못했습니다.';}
      this.preview.replaceChildren();this.incoming=null;this.token=null;await this.onImported();this.notice.textContent='서버 기록을 복원했습니다. 현재 영상은 유지되며 복원한 위치·자막 설정은 새로 열 때 적용됩니다.'+browserError;
    }catch(error){this.notice.textContent=error.message+' 파일을 다시 선택해 최신 미리보기를 확인하세요.';}}),'primary');this.preview.append(apply);
  }
}
