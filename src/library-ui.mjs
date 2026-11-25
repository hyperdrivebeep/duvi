import {createIcons,Folder,FolderPlus,ListVideo,ChevronRight,ChevronDown,Ellipsis,FolderInput,Plus} from 'lucide';
import {lectureResource,resourceCompleted,completionSummary} from './learning-model.mjs';

const $=id=>document.getElementById(id);
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
function icon(name){const node=element('i');node.dataset.lucide=name;return node;}
function iconButton(name,label,action){const node=element('button','icon-button');node.type='button';node.setAttribute('aria-label',label);node.title=label;node.append(icon(name));node.onclick=action;return node;}
function paintIcons(){createIcons({icons:{Folder,FolderPlus,ListVideo,ChevronRight,ChevronDown,Ellipsis,FolderInput,Plus},attrs:{'aria-hidden':'true'}});}

export class LibraryUI{
  constructor({api,load,openDialog,closeDialog,closeLibrary=()=>{},playPositions,format}){
    Object.assign(this,{api,load,openDialog,closeDialog,closeLibrary,playPositions,format});
    this.rows=[];this.folders=[];this.mode='video';this.busy=false;this.refreshVersion=0;
    try{this.collapsed=new Set(JSON.parse(localStorage.getItem('duvi-collapsed-folders')||'[]'));}catch{this.collapsed=new Set();}
    $('librarySearch').oninput=()=>this.render();
    $('addLecture').onclick=()=>this.openImport('video');
    $('addPlaylist').onclick=()=>this.openImport('playlist');
    $('createFolder').onclick=()=>this.editFolder();
    $('videoMode').onclick=()=>this.setMode('video');$('playlistMode').onclick=()=>this.setMode('playlist');
    $('importForm').onsubmit=event=>{event.preventDefault();void this.import();};
    $('folderForm').onsubmit=event=>{event.preventDefault();void this.saveFolder();};
    $('deleteFolder').onclick=()=>this.deleteFolder();
    $('moveForm').onsubmit=event=>{event.preventDefault();void this.move();};
    $('youtubeUrl').addEventListener('input',()=>{
      try{const url=new URL($('youtubeUrl').value);if(url.pathname==='/playlist'&&url.searchParams.has('list'))this.setMode('playlist');}catch{}
    });
    paintIcons();
  }
  async refresh(selected=$('lecture').value){
    const version=++this.refreshVersion,before=$('lecture').value;
    const [rows,state]=await Promise.all([this.api('/api/library'),this.api('/api/folders')]);
    if(version!==this.refreshVersion)return this.rows;
    const current=$('lecture').value,wanted=current!==before?current:selected;
    this.rows=rows;this.folders=state.folders;
    $('lecture').replaceChildren(...rows.map(row=>new Option(row.title,String(row.number))));
    $('lecture').value=rows.some(row=>String(row.number)===String(wanted))?String(wanted):String(rows[0]?.number||'');
    this.render();return rows;
  }
  setLearning(learning){this.learning=learning;this.render();}
  rememberCollapsed(){try{localStorage.setItem('duvi-collapsed-folders',JSON.stringify([...this.collapsed]));}catch{}}
  revealFolder(id){
    const list=$('libraryList'),section=[...list.querySelectorAll('.folder-section')].find(node=>node.dataset.folderId===id);
    if(section)list.scrollTop+=section.getBoundingClientRect().top-list.getBoundingClientRect().top;
  }
  async select(key){
    this.closeLibrary();$('lecture').value=String(key);this.render();
    try{await this.load(key);}catch(error){$('status').textContent=error.message;}
  }
  render(){
    const list=$('libraryList'),search=$('librarySearch').value.trim().toLocaleLowerCase();
    const focused=document.activeElement?.dataset.libraryFocus;
    const scroll=list.scrollTop,byId=new Map(this.rows.map(row=>[String(row.number),row]));
    const assigned=new Set(this.folders.flatMap(folder=>folder.lectureIds));
    const groups=[...this.folders,{id:'',name:'미분류',lectureIds:this.rows.filter(row=>!assigned.has(String(row.number))).map(row=>String(row.number))}];
    const visible=new Set();list.replaceChildren();
    for(const folder of groups){
      const phase=this.learning?.roadmap?.phases.find(p=>p.id===folder.id),external=phase?.resources.filter(r=>!r.lectureId)||[];
      const all=folder.lectureIds.map(key=>byId.get(key)).filter(Boolean);
      if(!folder.id&&!all.length)continue;
      const folderMatches=folder.name.toLocaleLowerCase().includes(search);
      const rows=all.filter(row=>!search||folderMatches||(row.title+' '+row.course).toLocaleLowerCase().includes(search));
      if(search&&!rows.length&&!folderMatches)continue;
      rows.forEach(row=>visible.add(String(row.number)));
      const section=element('section','folder-section'),header=element('div','folder-header');
      section.dataset.folderId=folder.id;
      const expanded=!!search||!this.collapsed.has(folder.id),toggle=element('button','folder-toggle');toggle.type='button';
      toggle.dataset.libraryFocus='toggle-'+folder.id;
      toggle.setAttribute('aria-expanded',String(expanded));toggle.title=folder.name;
      const children=element('div','folder-lectures');children.id='folder-'+(folder.id||'unfiled');children.hidden=!expanded;
      toggle.setAttribute('aria-controls',children.id);
      toggle.append(icon(expanded?'chevron-down':'chevron-right'),icon('folder'),element('span','folder-name',folder.name),element('span','folder-count',phase?(all.length?`영상 ${all.length}`:`과제 ${external.length}`):String(all.length)));
      toggle.onclick=()=>{if(this.collapsed.has(folder.id))this.collapsed.delete(folder.id);else this.collapsed.add(folder.id);this.rememberCollapsed();this.render();};
      header.append(toggle);
      if(folder.id){const manage=iconButton('ellipsis',`${folder.name} 폴더 관리`,()=>this.editFolder(folder));manage.dataset.libraryFocus='manage-'+folder.id;header.append(manage);}
      if(phase){const summary=completionSummary(this.learning.roadmap,this.learning.progress,phase.resources),progress=element('div','folder-learning-progress'),meter=element('progress','learning-meter');meter.max=summary.total||1;meter.value=summary.done;meter.setAttribute('aria-label',`${folder.name} 학습 진행률`);progress.append(element('span','',`${summary.total&&summary.done===summary.total?'✓ ':''}학습 ${summary.done}/${summary.total}개 완료 · ${summary.percent}%`),meter);section.append(progress);}
      if(!rows.length&&!external.length)children.append(element('p','folder-empty','아직 강의가 없습니다. 아래에서 추가하세요.'));
      if(external.length){const tasks=element('div','folder-learning-tasks');if(!all.length)tasks.append(element('p','muted','영상 대신 읽기·실습으로 진행하는 단계입니다.'));const open=element('button','plain',`읽기·실습 ${external.length}개 보기 →`);open.type='button';open.onclick=()=>this.learning.onPhase(phase.id);tasks.append(open);children.append(tasks);}
      for(const row of rows)children.append(this.lectureRow(row,folder,all.indexOf(row)+1));
      if(all.length||!external.length){const add=element('button','folder-add plain','강의 추가');add.prepend(icon('plus'));add.onclick=()=>this.openImport('video',folder.id);children.append(add);}
      section.prepend(header);section.append(children);list.append(section);
    }
    if(!list.children.length)list.append(element('p','empty','일치하는 폴더나 강의가 없습니다. 다른 검색어를 입력하세요.'));
    $('libraryCount').textContent=`${this.folders.length}개 폴더 · ${visible.size}개 강의`;
    paintIcons();list.scrollTop=scroll;
    if(focused){const target=[...list.querySelectorAll('[data-library-focus]')].find(node=>node.dataset.libraryFocus===focused);target?.focus({preventScroll:true});}
  }
  lectureRow(row,folder,position){
    const item=element('div','lecture-item'),button=element('button','lecture-row');button.type='button';
    button.dataset.key=String(row.number);button.dataset.libraryFocus=`lecture-${folder.id}-${row.number}`;
    button.setAttribute('aria-current',String(String(row.number)===$('lecture').value));button.title=row.title;
    const thumb=element('span','thumbnail');
    if(row.youtubeId){const img=element('img');img.src=`https://i.ytimg.com/vi/${row.youtubeId}/mqdefault.jpg`;img.alt='';img.loading='lazy';img.onerror=()=>{thumb.hidden=true;button.classList.add('no-thumbnail');};thumb.append(img);}
    else{thumb.hidden=true;button.classList.add('no-thumbnail');}
    if(row.duration)thumb.append(element('span','duration',this.format(row.duration)));
    const copy=element('span','lecture-copy');copy.append(element('span','lecture-name',row.title.split(' | ')[0]));
    const status=row.unavailable?'재생 제한 · 원본 확인':row.captionStatus==='pending'?'열면 영어 자막 준비':row.captionStatus==='failed'?'영어 자막 확인 필요':row.course;
    copy.append(element('span','lecture-course',status));
    const resource=lectureResource(this.learning?.roadmap,String(row.number),row.title),done=resourceCompleted(this.learning?.roadmap,this.learning?.progress,resource);
    if(done)copy.append(element('span','lecture-completed','✓ 완료'));
    if(this.playPositions[row.number]>5)copy.append(element('span','resume-time',this.format(this.playPositions[row.number])+'부터 이어보기'));
    button.append(element('span','lecture-ordinal',String(position).padStart(2,'0')),thumb,copy);button.onclick=()=>this.select(row.number);
    const move=iconButton('folder-input',`${row.title} 강의 이동`,()=>this.openMove(row,folder));move.classList.add('lecture-move');move.dataset.libraryFocus=`move-${folder.id}-${row.number}`;
    item.append(button);if(this.learning){const complete=element('button','lecture-complete-toggle',done?'✓':'○');complete.type='button';complete.setAttribute('aria-label',`${row.title} ${done?'완료 취소':'완료 표시'}`);complete.setAttribute('aria-pressed',String(done));complete.title=done?'완료 취소':'완료로 표시';complete.dataset.libraryFocus=`complete-${folder.id}-${row.number}`;complete.onclick=async()=>{complete.disabled=true;try{await this.learning.onComplete(resource);}catch{}finally{complete.disabled=false;}};item.append(complete);}item.append(move);return item;
  }
  populateFolders(id,emptyLabel,selected=''){
    $(id).replaceChildren(new Option(emptyLabel,''),...this.folders.map(folder=>new Option(folder.name,folder.id)));
    $(id).value=this.folders.some(folder=>folder.id===selected)?selected:'';
  }
  setMode(mode){
    if(this.busy)return;this.mode=mode;const playlist=mode==='playlist';
    $('videoMode').setAttribute('aria-pressed',String(!playlist));$('playlistMode').setAttribute('aria-pressed',String(playlist));
    $('urlLabel').textContent=playlist?'YouTube 재생목록 주소':'YouTube 영상 주소';
    $('youtubeUrl').placeholder=playlist?'https://www.youtube.com/playlist?list=…':'https://www.youtube.com/watch?v=…';
    $('importHelp').textContent=playlist?'재생목록의 영상을 원래 순서대로 가져옵니다. 새 폴더에는 재생목록 제목을 사용합니다. 영어 자막은 강의를 열 때 준비합니다. (최대 500개)':'YouTube 영상 주소를 넣으면 영어 자막을 가져옵니다. 재생목록이 포함된 영상 주소도 여기서는 영상 하나만 추가합니다.';
    $('importOptions').hidden=playlist;$('importYoutube').textContent=playlist?'재생목록 가져오기':'강의 가져오기';
    this.populateFolders('importFolder',playlist?'새 폴더 · 재생목록 제목 사용':'미분류',$('importFolder').value);
  }
  openImport(mode,folderId=''){
    if(!this.busy){this.setMode(mode);$('importFolder').value=folderId;}
    this.openDialog('importDialog');
  }
  async import(){
    if(this.busy)return;
    const playlist=this.mode==='playlist',folderId=$('importFolder').value;
    this.busy=true;$('importFields').disabled=true;$('importYoutube').disabled=true;
    $('videoMode').disabled=$('playlistMode').disabled=true;$('openImported').hidden=true;$('importSkipped').hidden=true;
    $('importStatus').textContent=playlist?'재생목록의 제목과 영상 순서를 가져오는 중… 잠시 걸릴 수 있습니다. 창을 닫아도 계속됩니다.':'YouTube 제목과 영어 자막을 가져오는 중…';$('importProgress').hidden=false;
    try{
      let selected,result;
      if(playlist){
        result=await this.api('/api/library/playlist',{url:$('youtubeUrl').value,folderId});
        this.collapsed.delete(result.folder.id);this.rememberCollapsed();
        await this.refresh();
        // Older running servers return the ordered import as a contiguous folder block.
        selected=result.firstLectureId||result.folder.lectureIds[folderId?result.folder.lectureIds.length-result.total:0];
        $('importStatus').textContent=`‘${result.folder.name}’에 ${result.total}개 강의를 순서대로 정리했습니다. 새 강의 ${result.added}개, 기존 강의 ${result.reused}개${result.skipped.length?`, 가져오지 못한 항목 ${result.skipped.length}개`:''}.`;
        $('importSkipped').replaceChildren(...result.skipped.map(item=>element('li','',`${item.position}. ${item.title} — 영상 주소를 확인할 수 없습니다.`)));$('importSkipped').hidden=!result.skipped.length;
      }else{
        const file=$('subtitleFile').files[0];if(file&&file.size>2*1024*1024)throw new Error('자막 파일은 2MB 이하로 넣어주세요.');
        result=await this.api('/api/library/import',{url:$('youtubeUrl').value,folderId,subtitleText:file?await file.text():undefined,title:$('customTitle').value});
        this.collapsed.delete(folderId);this.rememberCollapsed();selected=result.lecture.number;await this.refresh();
        $('importStatus').textContent=result.existing?'이미 등록된 강의를 선택한 폴더에 정리했습니다.':`${result.lecture.cues.length}개 영어 자막과 함께 강의를 추가했습니다.`;
      }
      $('librarySearch').value='';this.render();this.revealFolder(playlist?result.folder.id:folderId);$('openImported').hidden=false;
      $('openImported').onclick=()=>{this.closeDialog('importDialog');void this.select(selected);};
    }catch(error){$('importStatus').textContent=error.message;if(!playlist)$('importOptions').open=true;}
    finally{this.busy=false;$('importFields').disabled=false;$('importYoutube').disabled=false;$('videoMode').disabled=$('playlistMode').disabled=false;$('importProgress').hidden=true;}
  }
  editFolder(folder=null){
    this.editingFolder=folder;$('folderHeading').textContent=folder?'폴더 관리':'새 폴더';$('folderName').value=folder?.name||'';
    $('folderStatus').textContent='';$('deleteFolder').hidden=$('folderDeleteHelp').hidden=!folder;
    $('saveFolder').textContent=folder?'저장':'만들기';this.openDialog('folderDialog');$('folderName').focus();
  }
  async saveFolder(){
    $('saveFolder').disabled=$('deleteFolder').disabled=true;
    try{
      const folder=await this.api(this.editingFolder?'/api/folders/rename':'/api/folders/create',{id:this.editingFolder?.id,name:$('folderName').value});
      this.collapsed.delete(folder.id);this.rememberCollapsed();$('librarySearch').value='';await this.refresh();this.revealFolder(folder.id);this.closeDialog('folderDialog');
    }catch(error){$('folderStatus').textContent=error.message;}
    finally{$('saveFolder').disabled=$('deleteFolder').disabled=false;}
  }
  async deleteFolder(){
    if(!this.editingFolder)return;$('saveFolder').disabled=$('deleteFolder').disabled=true;
    try{await this.api('/api/folders/delete',{id:this.editingFolder.id});await this.refresh();this.closeDialog('folderDialog');}
    catch(error){$('folderStatus').textContent=error.message;}
    finally{$('saveFolder').disabled=$('deleteFolder').disabled=false;}
  }
  openMove(row,folder){
    this.moving={lectureId:String(row.number),fromFolderId:folder.id};
    $('moveLectureTitle').textContent=row.title;$('moveStatus').textContent='';
    this.populateFolders('moveFolder','미분류 (모든 폴더에서 꺼내기)',folder.id);
    this.openDialog('moveDialog');
  }
  async move(){
    $('moveLecture').disabled=true;
    try{const toFolderId=$('moveFolder').value;await this.api('/api/folders/move',{...this.moving,toFolderId});this.collapsed.delete(toFolderId);this.rememberCollapsed();$('librarySearch').value='';await this.refresh();this.revealFolder(toFolderId);this.closeDialog('moveDialog');}
    catch(error){$('moveStatus').textContent=error.message;}
    finally{$('moveLecture').disabled=false;}
  }
}
