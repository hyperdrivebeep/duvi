import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createVault} from '../backend/vault.mjs';
import {ChatGPTAuth} from '../backend/chatgpt-auth.mjs';
import {LectureLibrary,validKey} from '../backend/library.mjs';
import {TranslationService} from '../backend/chatgpt-translate.mjs';

const [number,model]=process.argv.slice(2);
if(!validKey(number)||!model)throw new Error('Usage: node scripts/align-captions.mjs LECTURE_ID MODEL');
const project=fileURLToPath(new URL('..',import.meta.url)),root=path.join(project,'backend');
// Refuse to compete with a translation running in the user's player.
const session=await(await fetch('http://127.0.0.1:6103/api/session')).json();
if(session.job?.status==='running')throw new Error('A translation is running in Duvi. Finish it before aligning captions.');
const auth=new ChatGPTAuth({vault:createVault(path.join(process.env.LOCALAPPDATA||project,'StudyLibraryPreview'))});await auth.init();
const service=new TranslationService({auth,root,library:new LectureLibrary({root}),cacheDirectory:path.join(root,'translations')});
await service.start({number,model,scope:'lecture',sentenceAligned:true});
let last='';const report=()=>{const job=service.publicJob();if(job.message!==last){last=job.message;console.log(job.message);}};
const timer=setInterval(report,2000);process.on('SIGINT',()=>void service.stop());
try{report();await service.task;report();if(service.job.status!=='completed'){console.error(service.publicJob().error?.code||service.job.status);process.exitCode=1;}}
finally{clearInterval(timer);}
