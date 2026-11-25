import test from 'node:test';
import assert from 'node:assert/strict';
import {MediaPlayer} from '../src/media.mjs';
test('native poster upgrades only to a real widescreen thumbnail for the current lecture',async()=>{
  const saved={Image:globalThis.Image,setInterval:globalThis.setInterval},images=[];
  try{
    globalThis.Image=class{get src(){return this.url;}set src(value){this.url=value;images.push(this);}};
    globalThis.setInterval=()=>0;
    const native=Object.assign(new EventTarget(),{pause(){}});
    const player=new MediaPlayer(native,{});
    await player.load({youtubeId:'first',videoUrl:'/first.mp4'});
    assert.match(native.poster,/first\/hqdefault/);
    assert.match(images[0]?.url??'',/first\/maxresdefault/);
    Object.assign(images[0],{naturalWidth:120,naturalHeight:90});images[0].onload();
    assert.match(native.poster,/first\/hqdefault/);
    await player.load({youtubeId:'missing',videoUrl:'/missing.mp4'});
    images[1].onerror?.();
    assert.match(native.poster,/missing\/hqdefault/);
    await player.load({youtubeId:'second',videoUrl:'/second.mp4'});
    await player.load({youtubeId:'third',videoUrl:'/third.mp4'});
    Object.assign(images[2],{naturalWidth:1280,naturalHeight:720});images[2].onload();
    assert.match(native.poster,/third\/hqdefault/);
    Object.assign(images[3],{naturalWidth:1280,naturalHeight:720});images[3].onload();
    assert.match(native.poster,/third\/maxresdefault/);
  }finally{Object.assign(globalThis,saved);}
});
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
test('a seek while a started YouTube video is paused is reported until it plays, and a later play is not paused again',async()=>{
  const saved={window:globalThis.window,document:globalThis.document,YT:globalThis.YT,setInterval:globalThis.setInterval,location:globalThis.location,now:Date.now};
  let fake,clock=1000;
  // Like the embed, a paused player keeps reporting the old time after seekTo and jumps only once it plays.
  class FakePlayer{constructor(_,options){fake=this;this.events=options.events;this.state=2;this.time=623;this.target=null;queueMicrotask(()=>options.events.onReady());}pauseVideo(){this.state=2;}playVideo(){this.state=1;if(this.target!=null){this.time=this.target;this.target=null;}this.events.onStateChange({data:1});}seekTo(time){if(this.state===1)this.time=time;else this.target=time;}getPlayerState(){return this.state;}getCurrentTime(){return this.time;}destroy(){}}
  try{
    globalThis.window={YT:{Player:FakePlayer}};globalThis.YT=window.YT;globalThis.document={createElement:()=>({})};globalThis.setInterval=()=>0;globalThis.location={origin:'http://127.0.0.1:6103'};Date.now=()=>clock;
    const native=new EventTarget();Object.assign(native,{pause(){},load(){},removeAttribute(){},paused:true});
    const player=new MediaPlayer(native,{replaceChildren(){}});
    await player.load({player:'youtube',youtubeId:'VMj-3S1tku0'});await player.play();player.pause();
    player.currentTime=614;clock+=5000;
    assert.equal(player.paused,true);assert.equal(player.currentTime,614);
    // Pressing play in YouTube's own controls later must not be paused again by the earlier seek.
    fake.playVideo();assert.equal(player.paused,false);assert.equal(player.currentTime,614);
    fake.time=620;assert.equal(player.currentTime,620);
  }finally{Object.assign(globalThis,{window:saved.window,document:saved.document,YT:saved.YT,setInterval:saved.setInterval,location:saved.location});Date.now=saved.now;}
});
