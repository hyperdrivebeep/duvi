import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {atomicJSON} from './vault.mjs';
import {AppError} from './chatgpt-auth.mjs';

function folderName(value){
  if(typeof value!=='string'||!value.trim()||value.trim().length>120)throw new AppError('폴더 이름은 1~120자로 입력하세요.');
  return value.trim();
}

export class FolderStore{
  constructor(library){this.library=library;this.file=path.join(library.directory,'folders.json');this.writes=Promise.resolve();}
  async read(){
    try{return JSON.parse(await readFile(this.file,'utf8'));}
    catch(error){
      if(error.code!=='ENOENT')throw error;
      const rows=await this.library.list();
      return {version:1,folders:[{id:'mit-python',name:'MIT Python 기초',lectureIds:rows.filter(row=>!String(row.number).startsWith('yt_')).map(row=>String(row.number))}]};
    }
  }
  async list(){await this.writes;return this.read();}
  change(callback){
    const operation=this.writes.then(async()=>{
      const state=await this.read();const result=await callback(state);
      await atomicJSON(this.file,state);return result;
    });
    this.writes=operation.catch(()=>{});return operation;
  }
  find(state,id){
    const folder=state.folders.find(folder=>folder.id===id);
    if(!folder)throw new AppError('폴더를 찾을 수 없습니다. 목록을 새로고침하세요.','not_found',404);
    return folder;
  }
  async check(id){if(id)this.find(await this.list(),id);}
  create(name){
    name=folderName(name);
    return this.change(state=>{const folder={id:randomUUID(),name,lectureIds:[]};state.folders.push(folder);return folder;});
  }
  rename(id,name){
    name=folderName(name);
    return this.change(state=>{const folder=this.find(state,id);folder.name=name;return folder;});
  }
  remove(id){return this.change(state=>{this.find(state,id);state.folders=state.folders.filter(folder=>folder.id!==id);return {ok:true};});}
  async move({lectureId,fromFolderId,toFolderId}){
    const key=String(lectureId);await this.library.get(key);
    return this.change(state=>{
      const source=fromFolderId?this.find(state,fromFolderId):null;
      const target=toFolderId?this.find(state,toFolderId):null;
      if(source&&!source.lectureIds.includes(key))throw new AppError('강의 위치가 변경됐습니다. 목록을 새로고침하세요.','conflict',409);
      if(source===target)return {ok:true};
      if(source)source.lectureIds=source.lectureIds.filter(id=>id!==key);
      // "Unfiled" means the lecture belongs to no folder, including shared playlists.
      if(!target)for(const folder of state.folders)folder.lectureIds=folder.lectureIds.filter(id=>id!==key);
      else if(!target.lectureIds.includes(key))target.lectureIds.push(key);
      return {ok:true};
    });
  }
  attach(id,keys){
    return this.change(state=>{
      const folder=this.find(state,id);
      folder.lectureIds=[...new Set([...folder.lectureIds,...keys.map(String)])];return folder;
    });
  }
  addPlaylist({id,title,keys,folderId}){
    return this.change(state=>{
      let folder=folderId?this.find(state,folderId):state.folders.find(folder=>folder.sourcePlaylistId===id);
      if(!folder){folder={id:randomUUID(),name:String(title||'YouTube 재생목록').slice(0,120),lectureIds:[],sourcePlaylistId:id};state.folders.push(folder);}
      // Reimport reuses the folder and lectures; preserve user additions at the end.
      const imported=new Set(keys),unrelated=folder.lectureIds.filter(key=>!imported.has(key));
      folder.lectureIds=folderId?[...unrelated,...imported]:[...imported,...unrelated];
      return folder;
    });
  }
}
