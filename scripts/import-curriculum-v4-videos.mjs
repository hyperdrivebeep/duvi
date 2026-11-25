// node scripts/import-curriculum-v4-videos.mjs <reviewed yt-catalog.json>
import {readFile, writeFile} from 'node:fs/promises';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const entries = await readJson(process.argv[2]);
const mit = await readJson(new URL('./mit-sources.json', import.meta.url));
const legacySource = await readFile(new URL('../src/learning-roadmap.mjs', import.meta.url), 'utf8');
const existing = new Set([
  ...mit.map(item => item.youtubeId), ...[...legacySource.matchAll(/(?:['"]|[?&]v=)([\w-]{11})(?=['"&])/g)].map(match => match[1]),
]);
const videos = {}, topics = {};
for (const row of entries) {
  if (row.oembed?.status !== 200 || existing.has(row.videoId)) continue;
  let topic = row.topic_or_card;
  if (topic === 'learning-phase-1') continue; // Both clips are reused in E01 or E06.
  // No new split stages. Defer post-training to the point where RL is in place.
  if (topic.includes('/split-')) {
    topic = topic.startsWith('learning-phase-4/') ? 'learning-phase-4' : null;
    if (!topic) continue;
  }
  if (topic === 'learning-phase-5' && row.videoId === 'o6l6tJQgUg4') topic = 'learning-phase-6';
  if (topic === 'I-LEV' && row.videoId === 'o6l6tJQgUg4') continue;
  if (!topic.startsWith('learning-phase-')) topic = `v4-${topic.toLowerCase()}`;
  const items = (topics[topic] ||= []);
  if (items.length >= 3 || items.some(item => item.videoId === row.videoId)) continue;
  videos[row.videoId] ??= {title: row.title, channel: row.channel, url: row.url, oembed: row.oembed};
  items.push({videoId: row.videoId, range: row.segment.range, minutes: row.segment.watch_minutes, reason: row.reason,
    prerequisite: [...new Set([...row.prerequisite, ...(topic.startsWith('learning-phase-') ? [topic] : [])])]});
}
await writeFile(new URL('../src/curriculum-v4-videos.json', import.meta.url), `${JSON.stringify({videos, topics}, null, 2)}\n`);
