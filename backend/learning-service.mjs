import {LearningStore} from './learning.mjs';
import {LearningBackup} from './learning-backup.mjs';
import {LearningTutor} from './learning-tutor.mjs';
import {LearningSync} from './learning-sync.mjs';

const gates=new Map();
export class LearningService{
  constructor({root,auth,library,translations}){
    this.store=new LearningStore({root});
    this.backup=new LearningBackup({store:this.store,library,translations});
    this.tutor=new LearningTutor({store:this.store,auth,library,translations});
    this.sync=new LearningSync({store:this.store});
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
