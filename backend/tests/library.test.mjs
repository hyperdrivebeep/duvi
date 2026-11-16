import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {LectureLibrary,youtubePlaylistId,PLAYLIST_LIMIT} from '../library.mjs';
import {createServer} from '../http-server.mjs';
import {TranslationService} from '../chatgpt-translate.mjs';

const ids=['VMj-3S1tku0','PaCmpygFfXo','TCH_1BHY58I'];
const url='https://www.youtube.com/playlist?list=PLtestPlaylist123';
const srt='1\n00:00:01,000 --> 00:00:03,000\nHello.\n\n2\n00:00:04,000 --> 00:00:06,000\nWorld.\n';
const playlist=()=>({title:'신경망 기초',channel:'Course author',entries:ids.map((id,index)=>({id,title:`Lecture ${index+1}`,duration:120}))});
async function fixture(t,options={}){
  const root=await mkdtemp(path.join(os.tmpdir(),'duvi-library-'));
  t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(path.join(root,'data'));
  await writeFile(path.join(root,'data/catalog.json'),JSON.stringify([{number:1}]));
  await writeFile(path.join(root,'data/1.json'),JSON.stringify({number:1,title:'MIT lecture',cues:[{start:0,end:3,en:'Hello.'}]}));
  const library=new LectureLibrary({root,playlistMetadata:async()=>playlist(),fetcher:async()=>Response.json({title:'Imported title'}),...options});
  return {root,library};
}

test('playlist URL parser restricts protocol/host/credentials and accepts shared video links',()=>{
  assert.equal(youtubePlaylistId(url),'PLtestPlaylist123');
  assert.equal(youtubePlaylistId('https://youtu.be/VMj-3S1tku0?list=PLtestPlaylist123&index=4'),'PLtestPlaylist123');
  for(const bad of ['file:///etc/passwd?list=PLtestPlaylist123','https://youtube.com.evil.test/playlist?list=PLtestPlaylist123','https://user@youtube.com/playlist?list=PLtestPlaylist123','https://youtube.com/playlist?list=../../secrets','https://youtube.com/watch?v=VMj-3S1tku0'])assert.throws(()=>youtubePlaylistId(bad));
});
test('MIT migration, concurrent folder mutations, moves and delete preserve lecture data across restart',async t=>{
  const {root,library}=await fixture(t);
  assert.deepEqual((await library.folders.list()).folders[0].lectureIds,['1']);
  const [a,b]=await Promise.all([library.folders.create('Python'),library.folders.create('영어')]);
  assert.equal((await library.folders.list()).folders.length,3);
  await library.folders.move({lectureId:'1',fromFolderId:'mit-python',toFolderId:a.id});
  await library.folders.rename(a.id,'기초 Python');
  await library.folders.remove(a.id);
  const restarted=new LectureLibrary({root});
  assert.equal((await restarted.get(1)).title,'MIT lecture');
  assert.equal((await restarted.folders.list()).folders.some(f=>f.lectureIds.includes('1')),false);
  assert.ok((await restarted.folders.list()).folders.some(f=>f.id===b.id));
  await assert.rejects(library.folders.move({lectureId:'1',fromFolderId:'missing',toFolderId:b.id}),{code:'not_found'});
  assert.throws(()=>library.folders.create('   '));
});
test('playlist import preserves order, skips invalid entries, retains restricted videos and reuses duplicates',async t=>{
  const data=playlist();data.entries.splice(1,0,null);data.entries.push(data.entries[0]);data.entries[2].availability='private';
  const {root,library}=await fixture(t,{playlistMetadata:async()=>data});
  const first=await library.importPlaylist({url});
  assert.equal(first.added,3);assert.equal(first.skipped.length,1);
  assert.deepEqual(first.folder.lectureIds,ids.map(id=>'yt_'+id));
  assert.equal((await library.get('yt_'+ids[1])).unavailable,true);
  const second=await library.importPlaylist({url});
  assert.equal(second.folder.id,first.folder.id);assert.equal(second.added,0);assert.equal(second.reused,3);
  assert.equal((await new LectureLibrary({root}).list()).length,4);
  assert.equal((await library.get('yt_'+ids[0])).captionStatus,'pending');
});
test('import into existing folder appends in playlist order and preserves existing lectures',async t=>{
  const {library}=await fixture(t);const folder=await library.folders.create('내 수업');
  await library.folders.attach(folder.id,['1']);
  const result=await library.importPlaylist({url,folderId:folder.id});
  assert.deepEqual(result.folder.lectureIds,['1',...ids.map(id=>'yt_'+id)]);
  assert.equal(result.firstLectureId,'yt_'+ids[0]);
  await library.folders.move({lectureId:'1',fromFolderId:folder.id,toFolderId:folder.id});
  assert.deepEqual((await library.folders.list()).folders.find(f=>f.id===folder.id).lectureIds,result.folder.lectureIds);
});
test('unavailable, empty and oversized playlists leave folders and lectures untouched',async t=>{
  const {library}=await fixture(t);
  for(const entries of [[],Array.from({length:PLAYLIST_LIMIT+1},()=>({id:ids[0]}))]){
    library.playlistMetadata=async()=>({entries});await assert.rejects(library.importPlaylist({url}));
  }
  assert.equal((await library.folders.list()).folders.length,1);assert.equal((await library.list()).length,1);
});
test('importing an overlapping playlist restores its source order within an existing folder',async t=>{
  const {library}=await fixture(t);const result=await library.importPlaylist({url});
  const target=await library.folders.create('순서 확인');
  await library.folders.attach(target.id,['1','yt_'+ids[2],'yt_'+ids[0]]);
  const imported=await library.importPlaylist({url,folderId:target.id});
  assert.deepEqual(imported.folder.lectureIds,['1',...ids.map(id=>'yt_'+id)]);
  assert.equal((await library.folders.list()).folders.find(f=>f.id===result.folder.id).lectureIds.length,3);
});
test('caption failure preserves playlist membership and uploaded subtitles repair the lecture',async t=>{
  const {root,library}=await fixture(t,{metadata:async()=>({subtitles:{}})});
  const result=await library.importPlaylist({url});const key='yt_'+ids[0];
  await assert.rejects(library.prepareCaptions({lectureId:key}),{code:'no_english_captions'});
  assert.equal((await library.get(key)).captionStatus,'failed');
  const recovered=await library.prepareCaptions({lectureId:key,subtitleText:srt});
  assert.equal(recovered.lecture.cues.length,2);assert.equal(recovered.lecture.captionStatus,'ready');
  assert.equal(recovered.lecture.title,'Lecture 1');
  const duplicate=await library.importPlaylist({url});assert.equal(duplicate.folder.id,result.folder.id);
  assert.equal((await new LectureLibrary({root}).get(key)).cues.length,2);
});
test('simultaneous caption requests share extraction and folder writes do not lose changes',async t=>{
  let calls=0;
  const {library}=await fixture(t,{metadata:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,20));return {subtitles:{en:[{ext:'json3',url:'https://www.youtube.com/api/timedtext?v=test'}]}};},fetcher:async()=>Response.json({events:[{tStartMs:0,dDurationMs:2000,segs:[{utf8:'Hello.'}]}]})});
  const result=await library.importPlaylist({url});
  await Promise.all([library.prepareCaptions({lectureId:'yt_'+ids[0]}),library.prepareCaptions({lectureId:'yt_'+ids[0]}),library.folders.rename(result.folder.id,'동시에 저장')]);
  assert.equal(calls,1);assert.equal((await library.get('yt_'+ids[0])).cues.length,1);
});
test('translation refuses a playlist lecture without captions',async t=>{
  const {root,library}=await fixture(t);await library.importPlaylist({url});
  const auth={state:{activeId:'test'},models:async()=>[{id:'test'}]};
  const service=new TranslationService({auth,library,root,cacheDirectory:path.join(root,'translations')});
  await assert.rejects(service.start({number:'yt_'+ids[0],model:'test',scope:'sample'}),{code:'no_captions'});
  assert.equal(service.starting,false);
});
test('manual subtitle upload during automatic extraction is explicitly rejected, never discarded',async t=>{
  let finish;const gate=new Promise(resolve=>finish=resolve);
  const {library}=await fixture(t,{metadata:async()=>{await gate;return {subtitles:{en:[{ext:'json3',url:'https://www.youtube.com/api/timedtext?v=test'}]}};},fetcher:async()=>Response.json({events:[{tStartMs:0,dDurationMs:2000,segs:[{utf8:'Automatic.'}]}]})});
  await library.importPlaylist({url});const lectureId='yt_'+ids[0];
  const automatic=library.prepareCaptions({lectureId});
  const manual=Promise.resolve().then(()=>library.prepareCaptions({lectureId,subtitleText:srt}));
  const rejected=assert.rejects(manual,{code:'busy'});
  finish();await automatic;await rejected;
});
test('HTTP folder and playlist routes require session, same origin and CSRF',async t=>{
  const {root,library}=await fixture(t);
  const auth={publicState:()=>({accounts:[]})},translations={publicJob:()=>null};
  const port=6197,base=`http://127.0.0.1:${port}`,server=createServer({auth,translations,library,root,port});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const session=await fetch(base+'/api/session');const cookie=session.headers.get('set-cookie').split(';')[0],{csrf}=await session.json();
  const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json','X-CSRF-Token':csrf};
  const post=(route,body,extra={})=>fetch(base+route,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body)});
  for(const route of ['/api/folders/create','/api/folders/rename','/api/folders/delete','/api/folders/move','/api/library/playlist','/api/library/captions'])assert.equal((await post(route,{}, {'X-CSRF-Token':'wrong'})).status,403);
  const folderResponse=await post('/api/folders/create',{name:'HTTP 폴더'});assert.equal(folderResponse.status,200);const folder=await folderResponse.json();
  const imported=await post('/api/library/playlist',{url,folderId:folder.id});assert.equal(imported.status,200);assert.equal((await imported.json()).total,3);
  assert.equal((await fetch(base+'/api/folders',{headers:{Cookie:cookie}})).status,200);
  assert.equal((await fetch(base+'/library/folders.json')).status,404);
});
