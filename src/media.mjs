let apiPromise;
function youtubeAPI(){
  if(window.YT?.Player)return Promise.resolve();
  if(!apiPromise)apiPromise=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{apiPromise=null;reject(new Error('YouTube 재생기를 불러오지 못했습니다.'));},20000);
    window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);resolve();};
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timeout);apiPromise=null;reject(new Error('YouTube에 연결하지 못했습니다.'));};document.head.append(script);
  });return apiPromise;
}
export function youtubePlayerVars(origin){
  // Only cc_load_policy=1 is documented. Omit it rather than forcing a track or overriding viewer preferences.
  return {origin,enablejsapi:1,playsinline:1,controls:0,fs:0,rel:0,iv_load_policy:3,disablekb:1,cc_lang_pref:'en'};
}
export class MediaPlayer extends EventTarget{
  constructor(native,container){
    super();this.native=native;this.container=container;this.type='native';this.version=0;this.seekUntil=0;
    const finishPendingSeek=()=>{if(this.type==='native'&&this.pendingNativeSeek!=null&&native.readyState>=2&&native.seekable.length){const value=this.pendingNativeSeek;this.pendingNativeSeek=null;native.currentTime=value;}};
    for(const name of ['loadedmetadata','loadeddata','canplay','progress'])native.addEventListener(name,finishPendingSeek);
    for(const name of ['timeupdate','seeked','error','play','pause','ended','loadedmetadata','ratechange','volumechange'])native.addEventListener(name,()=>{if(this.type==='native')this.dispatchEvent(new Event(name));});
    setInterval(()=>{if(this.type==='youtube'&&this.ready)this.dispatchEvent(new Event('timeupdate'));},200);
  }
  async load(lecture){
    const version=++this.version;this.pause();this.ready=false;this.seekUntil=0;this.heldFrom=null;this.pauseAfterSeek=false;this.pendingNativeSeek=null;this.pendingYoutubeSeek=null;this.started=false;this.youtubePlaying=false;this.lastError='';
    if(this.youtube){this.youtube.destroy();this.youtube=null;}
    this.type=lecture.player==='youtube'?'youtube':'native';this.native.hidden=this.type==='youtube';this.container.hidden=this.type!=='youtube';
    if(this.type==='native'){
      const base=lecture.youtubeId?`https://i.ytimg.com/vi/${lecture.youtubeId}/`:'';
      this.native.poster=base?`${base}hqdefault.jpg`:'';
      if(base){
        const image=new Image();
        image.onload=()=>{
          // YouTube can return a small placeholder instead of a missing-image error.
          if(version===this.version&&image.naturalWidth>=640&&image.naturalWidth*9===image.naturalHeight*16)this.native.poster=image.src;
        };
        image.src=`${base}maxresdefault.jpg`;
      }
      this.native.src=lecture.videoUrl;return;
    }
    this.native.removeAttribute('src');this.native.load();await youtubeAPI();if(version!==this.version)return;
    const placeholder=document.createElement('div');this.container.replaceChildren(placeholder);
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('YouTube 재생 준비가 지연됩니다. 원본 링크에서 영상 상태를 확인하세요.')),20000);
      this.youtube=new YT.Player(placeholder,{width:'100%',height:'100%',videoId:lecture.youtubeId,playerVars:youtubePlayerVars(location.origin),events:{
        onReady:()=>{clearTimeout(timeout);if(version===this.version)this.ready=true;resolve();},
        onStateChange:event=>{if(version!==this.version)return;
          // BUFFERING (3) preserves playback intent: a second seek during buffering must not pause.
          if(event.data===1){this.youtubePlaying=true;this.started=true;if(this.pendingYoutubeSeek!=null){const target=this.pendingYoutubeSeek;this.pendingYoutubeSeek=null;this.seekTarget=target;this.seekUntil=Date.now()+900;this.youtube.seekTo(target,true);}if(this.pauseAfterSeek){this.pauseAfterSeek=false;if(Date.now()<this.seekUntil)this.youtube.pauseVideo();}}
          else if(event.data!==3)this.youtubePlaying=false;
          this.dispatchEvent(new Event('timeupdate'));
        },
        onPlaybackRateChange:()=>{if(version===this.version)this.dispatchEvent(new Event('ratechange'));},
        onAutoplayBlocked:()=>{if(version===this.version)this.dispatchEvent(new Event('playblocked'));},
        onError:event=>{clearTimeout(timeout);if(version===this.version){this.ready=false;this.lastError=`YouTube에서 이 영상을 재생할 수 없습니다 (코드 ${event.data}). 원본 링크에서 확인하세요.`;this.dispatchEvent(new Event('error'));}resolve();}
      }});
    });
  }
  get currentTime(){
    if(this.type==='native')return this.pendingNativeSeek??this.native.currentTime;
    if(this.pendingYoutubeSeek!=null)return this.pendingYoutubeSeek;
    if(Date.now()<this.seekUntil)return this.seekTarget;
    const reported=this.youtube?.getCurrentTime?.()||0;
    // A paused YouTube player keeps reporting the old time after seekTo until playback resumes; trust the seek until it moves.
    if(this.heldFrom!=null&&this.paused&&Math.abs(reported-this.heldFrom)<0.5)return this.seekTarget;
    this.heldFrom=null;return reported;
  }
  set currentTime(value){if(this.type==='native'){if(this.native.readyState<2||!this.native.seekable.length)this.pendingNativeSeek=value;else{this.pendingNativeSeek=null;this.native.currentTime=value;}}else{if(!this.started){this.pendingYoutubeSeek=value;return;}this.pauseAfterSeek=this.paused;this.heldFrom=this.paused?this.youtube?.getCurrentTime?.()??null:null;this.seekTarget=value;this.seekUntil=Date.now()+900;this.youtube?.seekTo?.(value,true);}}
  get duration(){return this.type==='native'?this.native.duration:this.youtube?.getDuration?.()||0;}
  get seeking(){return this.type==='native'?(this.pendingNativeSeek!=null||this.native.seeking):Date.now()<this.seekUntil;}
  get paused(){return this.type==='native'?this.native.paused:!this.youtubePlaying;}
  get playbackRate(){return this.type==='native'?this.native.playbackRate:this.youtube?.getPlaybackRate?.()||1;}
  get availableRates(){return this.type==='youtube'?this.youtube?.getAvailablePlaybackRates?.()||[]:[];}
  set playbackRate(value){if(this.type==='native')this.native.playbackRate=value;else if(this.ready)this.youtube.setPlaybackRate(value);}
  get volume(){return this.type==='native'?this.native.volume:(this.youtube?.getVolume?.()??100)/100;}
  set volume(value){if(this.type==='native'){this.native.volume=value;this.native.muted=false;}else if(this.ready){this.youtube.setVolume(value*100);this.youtube.unMute();}}
  get muted(){return this.type==='native'?this.native.muted:!!this.youtube?.isMuted?.();}
  set muted(value){if(this.type==='native')this.native.muted=value;else if(this.ready)this.youtube[value?'mute':'unMute']();}
  async play(){this.pauseAfterSeek=false;if(this.type==='native')await this.native.play();else if(this.ready)this.youtube.playVideo();else throw new Error(this.lastError||'YouTube 재생기를 준비하고 있습니다.');}
  pause(){this.youtubePlaying=false;this.native.pause();this.youtube?.pauseVideo?.();}
}
