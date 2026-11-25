import {el,button} from './learning-dom.mjs';

// 설정 → 읽기 전용 저장소: the learner's repositories that 확인 문제 and 돌아보기 read. Duvi reads files, `git log` and test
// result files there and never runs, writes or pushes. The list is per PC (backend/learning/sources.json).
export function sourceLocation({repo,path,line}={}){return repo&&path?`${repo}/${path}${line?`:${line}`:''}`:'';}

export function renderSourcesSettings(root,views){
  let data=null,location='',notice='';
  const box=el('div','sources-settings');root.replaceChildren(box);
  async function save(repos){
    notice='';
    try{data=await views.setSources({repos:repos.map(row=>({path:row.path,tests:row.tests||[]}))});}
    catch(error){notice=error.message||'저장하지 못했습니다.';}
    render();
  }
  function render(){
    box.replaceChildren(el('p','muted','확인 문제의 발췌와 돌아보기의 커밋·테스트 근거를 읽는 폴더입니다. 읽기만 하고 실행·수정·push하지 않습니다.'));
    if(location){
      const row=el('p','sources-location',`열려던 위치: ${location} `);
      row.append(button('위치 복사',async()=>{try{await navigator.clipboard.writeText(location);notice='위치를 복사했습니다. 편집기에서 여세요.';}catch{notice='복사하지 못했습니다. 위치를 직접 선택해 복사하세요.';}render();},'plain'));
      box.append(row);
    }
    if(!data){box.append(el('p',notice?'notice':'muted',notice||'불러오는 중…'));return;}
    const list=el('ul','sources-list');
    for(const repo of data.repos){
      const item=el('li','',`${repo.available?'✓':'✕'} ${repo.label} · ${repo.path}${repo.available?'':' · 폴더를 찾을 수 없음'}`);
      if(data.origin==='settings')item.append(' ',button('빼기',()=>save(data.repos.filter(row=>row!==repo)),'plain'));
      list.append(item);
    }
    if(!data.repos.length)box.append(el('p','','설정된 저장소 없음'));else box.append(list);
    if(data.origin==='env')box.append(el('p','muted','지금 목록은 환경 변수 DUVI_EVIDENCE_REPOS에서 왔습니다. 여기서 추가하면 이 PC의 목록으로 바뀝니다.'));
    const form=el('form','sources-add'),input=el('input');input.type='text';input.placeholder=data.example||'C:\\Users\\<사용자>\\glorious-purpose';input.setAttribute('aria-label','추가할 저장소 폴더 (전체 경로)');
    const add=button('추가',null,'primary');add.type='submit';form.append(input,add);
    form.addEventListener('submit',event=>{event.preventDefault();const path=input.value.trim();if(path)void save([...data.repos,{path,tests:[]}]);});
    box.append(form);
    if(notice){const p=el('p','notice',notice);p.setAttribute('role','status');box.append(p);}
  }
  /** target: a {repo,path,line} link from a check question, shown so the learner can open it in their own editor. */
  async function reload(target){
    location=sourceLocation(target);notice='';render();
    try{data=await views.sources();}catch(error){notice=error.message||'저장소 목록을 읽지 못했습니다.';}
    render();
  }
  return {reload};
}
