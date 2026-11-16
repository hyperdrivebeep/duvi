import path from 'node:path';
import {ROADMAP, VIDEO_METADATA} from '../src/learning-roadmap.mjs';
import {atomicJSON} from './vault.mjs';
import {AppError} from './chatgpt-auth.mjs';

/** Attach curriculum references; never import captions or mark learning complete. */
export async function prepareRoadmap(library) {
  const resources = ROADMAP.phases.flatMap(phase => phase.resources);
  const lectureIds = [...new Set(resources.filter(item => item.lectureId).map(item => item.lectureId))];
  // Check the existing MIT data before making any writes. Numeric IDs belong to setup.
  const missing = [];
  for (const key of lectureIds.filter(key => !key.startsWith('yt_'))) {
    try { await library.get(key); }
    catch (error) { if (error.code !== 'not_found') throw error; missing.push(key); }
  }
  if (missing.length) throw new AppError(
    `기존 MIT 강의 데이터가 필요합니다 (${missing.join(', ')}). 준비된 backend 경로를 선택하거나 기존 setup을 먼저 완료하세요.`,
    'learning_missing_mit', 409,
  );
  // list() also validates the catalog before creating new metadata files.
  const existing = await library.list();
  const byYoutubeId = new Map(existing.filter(item => item.youtubeId).map(item => [item.youtubeId, String(item.number)]));
  const resolved = new Map();
  let added = 0, reused = 0;
  for (const key of lectureIds) {
    if (!key.startsWith('yt_')) { resolved.set(key, key); reused++; continue; }
    const metadata = VIDEO_METADATA[key];
    const existingKey = byYoutubeId.get(metadata.youtubeId);
    if (existingKey) { resolved.set(key, existingKey); reused++; continue; }
    await library.mutateLecture(key, async () => {
      try { await library.get(key); reused++; return; }
      catch (error) { if (error.code !== 'not_found') throw error; }
      await atomicJSON(path.join(library.directory, `${key}.json`), {
        number: key, title: metadata.title, course: metadata.channel, youtubeId: metadata.youtubeId,
        player: 'youtube', pageUrl: `https://www.youtube.com/watch?v=${metadata.youtubeId}`,
        cues: [], captionStatus: 'pending', createdAt: new Date().toISOString(),
      });
      added++;
    });
    resolved.set(key, key);
  }
  const folders = await library.folders.change(state => ROADMAP.phases.map(phase => {
    const ordered = [...new Set(phase.resources.filter(item => item.lectureId).map(item => resolved.get(item.lectureId)))];
    let folder = state.folders.find(item => item.id === phase.id);
    if (!folder) {
      folder = {id: phase.id, name: phase.title, lectureIds: []};
      state.folders.push(folder);
    }
    // Keep renamed folders, custom properties, and user additions after curriculum items.
    const curriculum = new Set(ordered);
    folder.lectureIds = [...ordered, ...folder.lectureIds.filter(key => !curriculum.has(String(key)))];
    return {...folder, lectureIds: [...folder.lectureIds]};
  }));
  return {
    version: ROADMAP.version, added, reused, total: lectureIds.length, folders,
    firstLectureId: '1', externalResources: resources.filter(item => !item.lectureId).length,
  };
}
