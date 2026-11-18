import {el,button,busy} from './learning-dom.mjs';
const dateText=value=>value?new Date(value).toLocaleString('ko-KR'):'';
export function syncSummaryLines(summary){
  return [
    `새로 들어오는 기록 ${summary.added}개`,
    `다른 PC에서 더 고친 기록 ${summary.updated}개 (그쪽 내용으로 바꿈)`,
    `이 PC가 더 최신인 기록 ${summary.kept}개 (그대로 둠)`,
    `두 PC에서 따로 고친 기록 ${summary.conflicts.length}개 (나중에 고친 쪽을 현재 값으로, 다른 쪽은 수정 이력에 보관)`,
    `학습 상태·완료 표시 새로 ${summary.progressAdded}개 · 더 최신으로 ${summary.progressUpdated}개`,
    `질문하기 대화 새로 ${summary.chatsAdded??0}개 · 양쪽 메시지를 합친 대화 ${summary.chatsUpdated??0}개`,
  ];
}
export class LearningSyncUI{
  constructor(root,{api,onImported}){Object.assign(this,{api,onImported});this.root=el('section','learning-sync');root.append(this.root);void this.load();}
  async load(){try{this.render(await this.api('/api/learning/sync'));}catch(error){this.root.replaceChildren(el('h3','','여러 PC에서 이어 공부하기'),el('p','notice',error.message));}}
  render(status){
    const root=this.root;root.replaceChildren();this.status=status;
    root.append(el('h3','','여러 PC에서 이어 공부하기'),
      el('p','muted','OneDrive·Google Drive 같은 클라우드 폴더 하나를 정하면, 각 PC가 그 폴더에 자기 학습 기록 파일(질문·설명·복습·완료 표시·질문하기 대화)을 내보내고 다른 PC의 파일을 합칩니다. 강의·번역·계정 정보·저장 전 초안은 넣지 않습니다. Git 저장소 안의 폴더는 쓸 수 없습니다.'),
      el('p','muted',`이 PC: ${status.deviceName} · 기기 ID ${status.deviceId.slice(0,8)}`));
    this.notice=el('p','notice');this.notice.setAttribute('role','status');
    const wrap=el('label','learning-field'),title=el('span','','동기화 폴더 (전체 경로)'),input=el('input');input.type='text';input.name='syncFolder';input.placeholder='예: C:\\Users\\나\\OneDrive\\Duvi-sync';input.value=status.folder||'';input.className='learning-text-input';wrap.append(title,input);
    const save=button('폴더 저장',()=>busy(save,async()=>{try{this.render(await this.api('/api/learning/sync/folder',{folder:input.value.trim()}));this.notice.textContent='동기화 폴더를 저장했습니다.';}catch(error){this.notice.textContent=error.message;}}));
    const actions=el('div','learning-actions');actions.append(save);
    if(status.folder){
      const push=button('이 PC 기록을 동기화 폴더로 내보내기',()=>busy(push,async()=>{try{const result=await this.api('/api/learning/sync/export',{});this.notice.textContent=`이 PC의 기록 ${result.records}개를 동기화 폴더에 저장했습니다. 클라우드 동기화가 끝난 뒤 다른 PC에서 가져오세요.`;}catch(error){this.notice.textContent=error.message;}}),'primary');
      const refresh=button('다른 PC 파일 다시 찾기',()=>this.load());actions.append(push,refresh);
    }
    root.append(wrap,actions,this.notice);
    if(status.folderError)root.append(el('p','notice',status.folderError));
    if(!status.folder)return;
    root.append(el('h4','','다른 PC의 기록'));
    if(!status.peers.length){root.append(el('p','learning-empty','아직 다른 PC의 파일이 없습니다. 다른 PC에서 같은 폴더를 정하고 "내보내기"를 누르세요.'));return;}
    const list=el('ul','learning-sync-peers');
    for(const peer of status.peers){
      const row=el('li');
      if(peer.error){row.append(el('span','notice',`${peer.deviceId.slice(0,8)} · ${peer.error}`));list.append(row);continue;}
      row.append(el('strong','',peer.deviceName===status.deviceName?`${peer.deviceName} (기기 ID ${peer.deviceId.slice(0,8)})`:peer.deviceName),el('span','muted',` · ${dateText(peer.exportedAt)} 내보냄 · 기록 ${peer.records}개 `));
      const preview=button('합치기 전에 미리보기',()=>busy(preview,()=>this.preview(peer)));row.append(preview);list.append(row);
    }
    root.append(list);this.previewBox=el('section','learning-backup-preview');root.append(this.previewBox);
  }
  async preview(peer){
    this.previewBox.replaceChildren();
    try{
      const plan=await this.api('/api/learning/sync/preview',{deviceId:peer.deviceId});
      this.previewBox.append(el('h4','',`${plan.deviceName}의 기록 합치기 미리보기`));
      const list=el('ul');for(const line of syncSummaryLines(plan.summary))list.append(el('li','',line));this.previewBox.append(list);
      if(plan.summary.conflicts.length){const details=el('details');details.append(el('summary','','따로 고친 기록 확인'));const items=el('ul');for(const row of plan.summary.conflicts)items.append(el('li','',row.question));details.append(items);this.previewBox.append(details);}
      this.previewBox.append(el('p','muted','아무 기록도 지우지 않습니다. 합치기 직전 상태는 이 PC의 backend/learning/before-sync.json에 남습니다. 미리보기는 10분간 유효합니다.'));
      const confirm=el('label','learning-confirm'),checkbox=el('input');checkbox.type='checkbox';confirm.append(checkbox,document.createTextNode('위 내용을 확인했습니다.'));
      const apply=button('확인한 내용으로 합치기',()=>busy(apply,async()=>{
        if(!checkbox.checked){this.notice.textContent='미리보기 확인에 체크하세요.';return;}
        try{const result=await this.api('/api/learning/sync/import',{revision:plan.revision,token:plan.token});this.previewBox.replaceChildren();await this.onImported();this.notice.textContent=`${plan.deviceName}의 기록을 합쳤습니다. 새 기록 ${result.summary.added}개 · 다른 PC 내용으로 바꾼 기록 ${result.summary.updated}개 · 따로 고친 기록 ${result.summary.conflicts.length}개(다른 쪽 내용은 수정 이력에 보관).`;}
        catch(error){this.notice.textContent=error.message+' 미리보기를 다시 확인하세요.';}
      }),'primary');
      this.previewBox.append(confirm,apply);
    }catch(error){this.notice.textContent=error.message;}
  }
}
