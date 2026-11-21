import {el,button} from './learning-dom.mjs';
import {formatTime} from './learning-model.mjs';
import {stripWindow,stripWindows,stripMarkers} from './learning-stream-model.mjs';
/** Duvi's time strip under the video: a ten-minute span with this lecture's question markers. A marker jumps there and pauses. */
export class TimeStrip{
  constructor(root,{jump}){
    Object.assign(this,{root,jump});this.items=[];this.duration=0;this.seconds=0;this.pinned=null;this.windowKey='';this.markerKey='';
    root.setAttribute('role','group');root.setAttribute('aria-label','강의 시각 띠 · 이 강의의 질문 표시');
    this.range=el('select','strip-range');this.range.setAttribute('aria-label','시각 띠 구간');
    this.range.addEventListener('change',()=>{this.pinned=Number(this.range.value);this.paint();});
    this.track=el('div','strip-track');this.played=el('div','strip-played');this.head=el('div','strip-head');this.marks=el('div','strip-marks');
    this.track.append(this.played,this.marks,this.head);
    this.clock=el('span','strip-clock');
    root.append(this.range,this.track,this.clock);
  }
  set(items,duration){
    this.items=items;duration=duration||0;
    if(this.duration!==duration||!this.range.options.length){
      this.duration=duration;this.pinned=null;this.windowKey='';
      this.range.replaceChildren(...stripWindows(duration).map(row=>new Option(row.label,String(row.start))));
    }
    this.paint();
  }
  update(seconds){this.seconds=seconds;this.paint();}
  paint(){
    const current=stripWindow(this.seconds,this.duration);
    // A span the learner picked stays until playback reaches it; from then on the strip follows playback again.
    if(this.pinned===current.start)this.pinned=null;
    const span=this.pinned===null?current:stripWindow(this.pinned,this.duration),windowKey=`${span.start}:${span.end}`;
    if(windowKey!==this.windowKey){
      this.range.value=String(span.start);this.windowKey=windowKey;
    }
    const markers=stripMarkers(this.items,span),markerKey=JSON.stringify(markers);
    // Rebuild only when markers change, so a focused marker keeps focus while the video plays.
    if(markerKey!==this.markerKey){
      this.markerKey=markerKey;
      this.marks.replaceChildren(...markers.map(marker=>{
        const node=button('',()=>this.jump(marker.seconds),`strip-marker${marker.filled?' filled':''}`);
        node.style.left=`${marker.left*100}%`;node.setAttribute('aria-label',`${marker.label} · 이 장면으로 이동하고 멈춤`);node.title=marker.label;return node;
      }));
    }
    const ratio=Math.min(1,Math.max(0,(this.seconds-span.start)/Math.max(1,span.end-span.start)));
    this.played.style.width=`${ratio*100}%`;this.head.style.left=`${ratio*100}%`;
    this.head.hidden=this.seconds<span.start||this.seconds>span.end;
    const clock=formatTime(this.seconds);if(this.clock.textContent!==clock)this.clock.textContent=clock;
  }
}
