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
    `한국어 번역 새로 ${summary.translationsAdded??0}강 · 교체 ${summary.translationsUpdated??0}강 · 이 PC 번역 유지 ${summary.translationsKept??0}강`,
    `상대 PC의 이어보기 위치 ${summary.positionCount??0}강 (더 최근에 본 위치만 적용하며 지금 재생 중인 강의는 제외)`,
    ...(summary.translationWarnings??[]),
  ];
}
export class LearningSyncUI{
  constructor(root,{api,onImported,resumeSync}){Object.assign(this,{api,onImported,resumeSync});this.root=el('section','learning-sync');root.append(this.root);void this.load();}
  async load(){try{this.render(await this.api('/api/learning/sync'));}catch(error){this.root.replaceChildren(el('h3','','여러 PC에서 이어 공부하기'),el('p','notice',error.message));}}
  render(status){
    const root=this.root;root.replaceChildren();this.status=status;
    root.append(el('h3','','여러 PC에서 이어 공부하기'),
      el('p','muted','두 PC에서 같은 OneDrive·Google Drive 폴더를 선택하세요. 이어보기 위치, 질문·설명·복습·완료 표시·질문하기 대화와 이미 만든 한국어 번역을 옮길 수 있습니다. 다른 PC에도 같은 강의와 영어 자막을 먼저 준비하세요. 영상·계정 정보·초안·로그는 공유하지 않습니다. Git 저장소 안의 폴더는 쓸 수 없습니다.'),
      el('p','muted',`이 PC: ${status.deviceName} · 기기 ID ${status.deviceId.slice(0,8)}`));
    this.notice=el('p','notice');this.notice.setAttribute('role','status');
    const wrap=el('label','learning-field'),title=el('span','','동기화 폴더 (전체 경로)'),input=el('input');input.type='text';input.name='syncFolder';input.placeholder='예: C:\\Users\\나\\OneDrive\\Duvi-sync';input.value=status.folder||'';input.className='learning-text-input';wrap.append(title,input);
    const save=button('폴더 저장',()=>busy(save,async()=>{try{this.render(await this.api('/api/learning/sync/folder',{folder:input.value.trim()}));this.notice.textContent='동기화 폴더를 저장했습니다.';}catch(error){this.notice.textContent=error.message;}}));
    const actions=el('div','learning-actions');actions.append(save);
    if(status.folder){
      const push=button('이 PC 기록을 동기화 폴더로 내보내기',()=>busy(push,async()=>{try{const result=await this.api('/api/learning/sync/export',{positions:this.resumeSync.snapshot()});this.notice.textContent=`기록 ${result.records}개, 이어보기 위치 ${result.positionCount}강, 새로 쓰거나 바뀐 번역 ${result.translationsWritten}강을 내보냈습니다. 클라우드 동기화가 끝난 뒤 다른 PC에서 가져오세요. ${result.translationWarnings.join(' ')}`;}catch(error){this.notice.textContent=error.message;}}),'primary');
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
      this.previewBox.append(el('p','muted','미리보기는 10분간 유효합니다. 같은 강의에 두 번역이 있으면 문장 구분이 같은 경우에만 더 많이 번역한 쪽을 씁니다. 분량도 같으면 나중에 만든 쪽을 씁니다. 교체 전 번역은 이 PC에 보관합니다.'));
      const confirm=el('label','learning-confirm'),checkbox=el('input');checkbox.type='checkbox';confirm.append(checkbox,document.createTextNode('위 내용을 확인했습니다.'));
      const apply=button('확인한 내용으로 합치기',()=>busy(apply,async()=>{
        if(!checkbox.checked){this.notice.textContent='미리보기 확인에 체크하세요.';return;}
        try{
          const result=await this.api('/api/learning/sync/import',{revision:plan.revision,token:plan.token});
          let positions;
          try{positions=`이어보기 위치 ${this.resumeSync.merge(result.positions)}강을 적용했습니다.`;}
          catch{positions='이어보기 위치를 브라우저에 저장하지 못했습니다.';}
          this.previewBox.replaceChildren();await this.onImported();
          this.notice.textContent=`${plan.deviceName}의 기록을 합쳤습니다. 새 기록 ${result.summary.added}개 · 바꾼 기록 ${result.summary.updated}개 · 따로 고친 기록 ${result.summary.conflicts.length}개. 한국어 번역 ${result.summary.translationsAdded+result.summary.translationsUpdated}강을 가져왔습니다. ${positions} 강의를 다시 열어 확인하세요. ${result.summary.translationWarnings.join(' ')}`;
        }
        catch(error){this.notice.textContent=error.message+' 미리보기를 다시 확인하세요.';}
      }),'primary');
      this.previewBox.append(confirm,apply);
    }catch(error){this.notice.textContent=error.message;}
  }
}
