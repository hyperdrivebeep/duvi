import path from 'node:path';
import {readdir,opendir} from 'node:fs/promises';
import {digest, directory, load, save} from './sync-files.mjs';
import {checkAssetJobs} from './learning-backup.mjs';
import {validKey} from './library.mjs';
import {cache as validateCache} from './learning-backup-schema.mjs';
import {fingerprint, PROMPT_VERSION} from './chatgpt-translate.mjs';
import {ALIGNMENT_VERSION, timedWords} from './sentence-alignment.mjs';
import {keys} from './learning-validation.mjs';

const invalid = () => {throw new Error('번역 파일의 형식 또는 내용 검증에 실패했습니다.');};
function filenames(dir) {
  return readdir(dir).then(names => names.filter(n => n.endsWith('.json') && validKey(n.slice(0,-5))).sort());
}
function inspect(raw, key, lecture) {
  const cache = validateCache(raw);
  if (String(cache.lecture) !== key || cache.promptVersion !== PROMPT_VERSION ||
      cache.sourceHash !== fingerprint(lecture) || !lecture.cues.length) invalid();
  // Reconstruct exactly the contiguous word spans that the aligner can emit.
  // A matching source hash alone doesn't prove that the supplied English/timing belongs to it.
  if (cache.cues || cache.alignmentVersion || cache.alignmentRevision || cache.timing) {
    if (cache.alignmentVersion !== ALIGNMENT_VERSION || !cache.alignmentRevision?.trim() ||
        cache.timing !== 'estimated-from-source-cues' || !cache.cues?.length) invalid();
    const words = timedWords(lecture.cues);
    let offset = 0;
    for (const cue of cache.cues) {
      const end = offset + cue.en.split(/\s+/).length, span = words.slice(offset,end);
      const en = span.map(w=>w.text).join(' ');
      if (cue.start !== span[0]?.start || cue.end !== span.at(-1)?.end ||
          !(cue.en === en || (!/[.!?]["')\]]?$/.test(en) && ['.','?','!'].some(p=>cue.en === en+p)))) invalid();
      offset = end;
    }
    if (offset !== words.length) invalid();
  }
  const total = (cache.cues || lecture.cues).length, entries = Object.entries(cache.translations);
  if (!entries.length || entries.some(([id,row]) => +id >= total || !row.ko.trim())) invalid();
  const updated = Date.parse(cache.updatedAt) || Math.max(...entries.map(([,row])=>Date.parse(row.updatedAt)));
  return {cache, count:entries.length, updated};
}
export class TranslationSync {
  constructor(root, library, service, checkFolder) {Object.assign(this,{root, library, service, checkFolder});}
  async publish(folder, device) {
    const result = {translationsWritten:0, translationWarnings:[]};
    const local = await directory(this.root,['translations']);
    if (!local) return result;
    let target;
    for (const name of await filenames(local)) {
      const key = name.slice(0,-5);
      try {
        const {cache} = inspect(await load(path.join(local,name)), key, await this.library.get(key));
        if (!target) {
          const base = await this.checkFolder(await directory(folder,['translations'],true));
          target = await this.checkFolder(await directory(base,[device],true));
        }
        const file = path.join(target,name);
        const packet = {version:1, hash:digest(cache), cache};
        // Repair incomplete or damaged cloud copies on the next explicit export.
        const previous = await load(file).catch(()=>null);
        if (JSON.stringify(previous) === JSON.stringify(packet)) continue;
        await save(file,packet);
        result.translationsWritten++;
      } catch {result.translationWarnings.push(`${key} 강의 번역을 검증하거나 저장할 수 없어 제외했습니다.`);}
    }
    return result;
  }

  // Token entries contain only fingerprints, not an entire library of caption text.
  // Commit reloads both files and checks for background asset jobs before writing.
  async receive(folder, device, preview) {
    const summary = {translationsAdded:0, translationsUpdated:0, translationsKept:0,
      translationWarnings:[...(preview?.warnings || [])]};
    const selected = [];
    let remote, names;
    try {
      remote = await directory(folder,['translations',device]);
      names = preview ? preview.selected.map(row=>row.name) : [];
      if(!preview && remote){
        for await(const {name} of await opendir(remote)){
          if(!name.endsWith('.json')||!validKey(name.slice(0,-5)))continue;
          if(names.length===526){
            summary.translationWarnings.push('한 기기의 번역은 한 번에 최대 526강까지만 확인합니다.');
            break;
          }
          names.push(name);
        }
        names.sort();
      }
    } catch {
      summary.translationWarnings.push('번역 폴더를 읽을 수 없습니다. 클라우드 동기화가 끝난 뒤 다시 확인하세요.');
      names = [];
    }
    if (preview) summary.translationsKept = preview.kept;
    for (const [i,name] of names.entries()) {
      const key = name.slice(0,-5);
      try {
        const packet = await load(path.join(remote,name));
        keys(packet,['version','hash','cache']);
        if (packet.version !== 1 || packet.hash !== digest(packet.cache)) invalid();
        const lecture = await this.library.get(key);
        const incoming = inspect(packet.cache,key,lecture);
        const local = await directory(this.root,['translations']);
        const raw = local && await load(path.join(local,name));
        const localHash = raw && digest(raw);
        if (preview && (preview.selected[i].hash !== packet.hash || preview.selected[i].localHash !== localHash))
          throw new Error('changed');
        if (raw) {
          const mine = inspect(raw,key,lecture);
          // Never change the boundaries used by local indexed translations or saved anchors.
          if (mine.cache.alignmentRevision !== incoming.cache.alignmentRevision ||
              digest(mine.cache.cues || lecture.cues) !== digest(incoming.cache.cues || lecture.cues) ||
              Object.keys(mine.cache.translations).some(id=>!incoming.cache.translations[id]) ||
              (mine.count === incoming.count && mine.updated >= incoming.updated)) {
            summary.translationsKept++;
            continue;
          }
        }
        if (preview) {
          checkAssetJobs(this.library,this.service);
          const dest = await directory(this.root,['translations'],true);
          if (raw) {
            const snapshot = await directory(this.root,['learning','before-sync-translations'],true);
            await save(path.join(snapshot,name),raw);
          }
          await save(path.join(dest,name),incoming.cache);
        } else selected.push({name,hash:packet.hash,localHash});
        summary[raw ? 'translationsUpdated' : 'translationsAdded']++;
      } catch (e) {
        const reason = e.code === 'not_found' ? '이 PC에도 같은 강의와 영어 자막을 먼저 준비하세요.' :
          e.code === 'busy' ? e.message :
          '파일 손상, 원본·문장 버전 변경 또는 읽기·쓰기 오류입니다. 원본을 확인하고 다시 미리보기 하세요.';
        summary.translationWarnings.push(`${key} 강의 번역을 건너뜁니다. ${reason}`);
      }
    }
    return {summary, plan:{selected, warnings:summary.translationWarnings, kept:summary.translationsKept}};
  }
}
