import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from './backend/http-server.mjs';
import {createVault} from './backend/vault.mjs';
import {ChatGPTAuth} from './backend/chatgpt-auth.mjs';
import {LectureLibrary} from './backend/library.mjs';
import {TranslationService} from './backend/chatgpt-translate.mjs';
const project=fileURLToPath(new URL('.',import.meta.url)),root=path.join(project,'backend'),port=6103;
// A separate encrypted vault and copied library ensure the active player is untouched.
const stateDirectory=path.join(process.env.LOCALAPPDATA||project,'StudyLibraryPreview');
const auth=new ChatGPTAuth({vault:createVault(stateDirectory)});await auth.init();
const library=new LectureLibrary({root});
const translations=new TranslationService({auth,library,root,cacheDirectory:path.join(root,'translations')});
const server=createServer({auth,translations,library,root,staticRoot:path.join(project,'dist/client'),port});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'6103 포트가 사용 중입니다.':'미리보기 서버를 시작할 수 없습니다.');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Study library: http://127.0.0.1:${port}`));
