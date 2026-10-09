let apiPromise;
function youtubeAPI(){
  if(window.YT?.Player)return Promise.resolve();
  if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{apiPromise=null;reject(new Error('YouTube 재생기를 불러오지 못했습니다.'));},20000);
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve();};
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timeout);apiPromise=null;reject(new Error('YouTube에 연결하지 못했습니다.'));};document.head.append(script);
  });return apiPromise;
}
export class MediaPlayer extends EventTarget{
  constructor(native,container){
    super();this.native=native;this.container=container;this.type='native';this.version=0;this.seekUntil=0;
    const finishPendingSeek=()=>{if(this.type==='native'&&this.pendingNativeSeek!=null&&native.readyState>=2&&native.seekable.length){const value=this.pendingNativeSeek;this.pendingNativeSeek=null;native.currentTime=value;}};
    for(const name of ['loadedmetadata','loadeddata','canplay','progress'])native.addEventListener(name,finishPendingSeek);
    for(const name of ['timeupdate','seeked','error','play','pause'])native.addEventListener(name,()=>{if(this.type==='native')this.dispatchEvent(new Event(name));});
    setInterval(()=>{if(this.type==='youtube'&&this.ready)this.dispatchEvent(new Event('timeupdate'));},200);
  }
  async load(lecture){
    const version=++this.version;this.pause();this.ready=false;this.seekUntil=0;this.pauseAfterSeek=false;this.pendingNativeSeek=null;this.pendingYoutubeSeek=null;this.started=false;this.lastError='';
    if(this.youtube){this.youtube.destroy();this.youtube=null;}
    this.type=lecture.player==='youtube'?'youtube':'native';this.native.hidden=this.type==='youtube';this.container.hidden=this.type!=='youtube';
    if(this.type==='native'){this.native.poster=lecture.youtubeId?`https://i.ytimg.com/vi/${lecture.youtubeId}/hqdefault.jpg`:'';this.native.src=lecture.videoUrl;return;}
    this.native.removeAttribute('src');this.native.load();await youtubeAPI();if(version!==this.version)return;
    const placeholder=document.createElement('div');this.container.replaceChildren(placeholder);
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('YouTube 재생 준비가 지연됩니다. 원본 링크에서 영상 상태를 확인하세요.')),20000);
      this.youtube=new YT.Player(placeholder,{width:'100%',height:'100%',videoId:lecture.youtubeId,playerVars:{origin:location.origin,playsinline:1,fs:0,rel:0,cc_lang_pref:'en'},events:{
        onReady:()=>{clearTimeout(timeout);if(version===this.version)this.ready=true;resolve();},
        onStateChange:event=>{if(version!==this.version)return;if(event.data===1){this.started=true;if(this.pendingYoutubeSeek!=null){const target=this.pendingYoutubeSeek;this.pendingYoutubeSeek=null;this.seekTarget=target;this.seekUntil=Date.now()+900;this.youtube.seekTo(target,true);}if(this.pauseAfterSeek){this.pauseAfterSeek=false;this.youtube.pauseVideo();}}this.dispatchEvent(new Event('timeupdate'));},
        onError:event=>{clearTimeout(timeout);this.lastError=`YouTube에서 이 영상을 재생할 수 없습니다 (코드 ${event.data}). 원본 링크에서 확인하세요.`;this.dispatchEvent(new Event('error'));resolve();}
      }});
    });
  }
  get currentTime(){return this.type==='native'?(this.pendingNativeSeek??this.native.currentTime):(this.pendingYoutubeSeek??(Date.now()<this.seekUntil?this.seekTarget:this.youtube?.getCurrentTime?.()||0));}
  set currentTime(value){if(this.type==='native'){if(this.native.readyState<2||!this.native.seekable.length)this.pendingNativeSeek=value;else{this.pendingNativeSeek=null;this.native.currentTime=value;}}else{if(!this.started){this.pendingYoutubeSeek=value;return;}this.pauseAfterSeek=this.paused;this.seekTarget=value;this.seekUntil=Date.now()+900;this.youtube?.seekTo?.(value,true);}}
  get duration(){return this.type==='native'?this.native.duration:this.youtube?.getDuration?.()||0;}
  get seeking(){return this.type==='native'?(this.pendingNativeSeek!=null||this.native.seeking):Date.now()<this.seekUntil;}
  get paused(){return this.type==='native'?this.native.paused:this.youtube?.getPlayerState?.()!==1;}
  set playbackRate(value){if(this.type==='native')this.native.playbackRate=value;else this.youtube?.setPlaybackRate?.(value);}
  async play(){this.pauseAfterSeek=false;if(this.type==='native')await this.native.play();else if(this.ready)this.youtube.playVideo();else throw new Error(this.lastError||'YouTube 재생기를 준비하고 있습니다.');}
  pause(){this.native.pause();this.youtube?.pauseVideo?.();}
}
