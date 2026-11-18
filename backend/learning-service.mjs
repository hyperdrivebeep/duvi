import {LearningStore} from './learning.mjs';
import {LearningBackup} from './learning-backup.mjs';
import {LearningTutor} from './learning-tutor.mjs';
import {LearningSync} from './learning-sync.mjs';
import {LearningChat} from './learning-chat.mjs';

const gates=new Map();
export class LearningService{
  /** chatProvider replaces the ChatGPT account and fetch for the chat only (the explicit QA mock in server.mjs). */
  constructor({root,auth,library,translations,chatProvider}){
    this.store=new LearningStore({root});
    this.backup=new LearningBackup({store:this.store,library,translations});
    this.tutor=new LearningTutor({store:this.store,auth,library,translations});
    this.sync=new LearningSync({store:this.store});
    this.chat=new LearningChat({store:this.store,auth:chatProvider?.auth||auth,library,translations,...(chatProvider?.fetcher&&{fetcher:chatProvider.fetcher})});
    this.ready=this.store.exclusive(()=>this.backup.recover());
    // Recovery errors are surfaced on API use, without an unhandled rejection at startup.
    this.ready.catch(()=>{});
  }
  withAssets(callback){
    const key=this.store.root;
    const operation=(gates.get(key)||Promise.resolve()).then(async()=>{await this.ready;await this.store.exclusive(()=>this.backup.recover());return callback();});
    const settled=operation.catch(()=>{});gates.set(key,settled);
    settled.finally(()=>{if(gates.get(key)===settled)gates.delete(key);});return operation;
  }
}
