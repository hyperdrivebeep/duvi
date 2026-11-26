const labels={receiving:'로컬 파일 준비 중…',decoding:'오디오 읽는 중…',loading:'모델 불러오는 중…',transcribing:'영어 음성 인식 중',saving:'자막 저장 중…'};

export function setupLocalASR({$,api,upload,lecture,onSaved}){
  const form=$('asrForm'),dialog=$('asrDialog'),file=$('asrFile'),model=$('asrModel'),rights=$('asrRights');
  const status=$('asrStatus'),bar=$('asrProgress'),run=$('runASR'),cancel=$('cancelASR'),close=$('closeASR');
  let active=false,cancelling=false,stage,controller;
  const eligible=local=>local&&!local.unavailable&&!local.cues?.length&&local.player!=='youtube'&&!String(local.number).startsWith('yt_');
  const sync=()=>{
    file.disabled=model.disabled=rights.disabled=active;
    run.disabled=active||!rights.checked||!file.files.length||!eligible(lecture());
    close.disabled=active;
    cancel.hidden=bar.hidden=!active;
    cancel.disabled=cancelling||stage==='saving';
  };
  function paint(job){
    stage=job.stage;
    const percent=job.percent;
    if(percent==null)bar.removeAttribute('value');else bar.value=percent;
    const next=cancelling?'취소하는 중…':labels[stage]||'';
    if(status.textContent!==next)status.textContent=next;
    sync();
  }
  form.oninput=sync;
  form.onsubmit=async event=>{
    event.preventDefault();
    const local=lecture(),picked=file.files[0];
    if(active||!eligible(local)||!rights.checked||!picked)return;
    const key=String(local.number),route=`/api/local-asr/${encodeURIComponent(key)}`;
    active=true;cancelling=false;controller=new AbortController();paint({stage:'receiving'});
    cancel.onclick=async()=>{
      cancelling=true;sync();status.textContent='취소하는 중…';
      try{
        const {job}=await api(`${route}/cancel`,{});
        // Before the server has accepted the upload, terminate the local request.
        if(!job||stage==='receiving'&&job.state!=='running')controller?.abort();
      }catch(error){cancelling=false;status.textContent=error.message;sync();}
    };
    let completed=false;
    try{
      let job;
      try{({job}=await upload(route,picked,model.value,controller.signal));}
      catch(error){
        if(cancelling&&controller.signal.aborted)throw new Error('로컬 자막 만들기를 취소했습니다.');
        throw error;
      }
      while(job?.state==='running'){
        paint(job);
        await new Promise(resolve=>setTimeout(resolve,450));
        ({job}=await api(route));
      }
      if(job?.state!=='completed')throw new Error(job?.message||'작업 상태를 확인할 수 없습니다.');
      await onSaved(key);
      status.textContent='기계 생성 자막을 저장했습니다. 정확도는 검증되지 않았습니다.';
      completed=true;
    }catch(error){status.textContent=error.message;}
    finally{
      active=false;cancelling=false;stage=null;controller=null;
      form.reset();sync();
      if(completed)close.focus();
    }
  };
  dialog.addEventListener('cancel',event=>{if(active)event.preventDefault();});
  dialog.addEventListener('close',()=>{form.reset();status.textContent='';sync();});
  sync();
}
