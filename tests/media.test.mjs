import test from 'node:test';
import assert from 'node:assert/strict';
import {MediaPlayer} from '../src/media.mjs';
test('cold YouTube resume keeps the poster until playback, then seeks to the requested cue',async()=>{
  const oldWindow=globalThis.window,oldDocument=globalThis.document,oldYT=globalThis.YT,oldTimer=globalThis.setInterval;
  let fake;
  class FakePlayer{constructor(_,options){fake=this;this.events=options.events;this.seeks=[];this.state=2;queueMicrotask(()=>options.events.onReady());}pauseVideo(){this.state=2;}playVideo(){this.state=1;this.events.onStateChange({data:1});}seekTo(time){this.seeks.push(time);}getPlayerState(){return this.state;}getCurrentTime(){return 0;}destroy(){}}
  try{
    globalThis.window={YT:{Player:FakePlayer}};globalThis.YT=window.YT;globalThis.document={createElement:()=>({})};globalThis.setInterval=()=>0;
    const native=new EventTarget();Object.assign(native,{pause(){},load(){},removeAttribute(){},paused:true});
    const player=new MediaPlayer(native,{replaceChildren(){}});
    // load() also reads location.origin, only to configure the official iframe.
    const oldLocation=globalThis.location;globalThis.location={origin:'http://127.0.0.1:6103'};
    try{await player.load({player:'youtube',youtubeId:'aircAruvnKk'});player.currentTime=75;assert.deepEqual(fake.seeks,[]);assert.equal(player.currentTime,75);assert.equal(player.paused,true);await player.play();assert.deepEqual(fake.seeks,[75]);assert.equal(player.paused,false);}finally{globalThis.location=oldLocation;}
  }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;globalThis.YT=oldYT;globalThis.setInterval=oldTimer;}
});
