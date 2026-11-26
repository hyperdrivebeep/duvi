import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('the roadmap keeps its named close button in a sticky header within the scrolling dialog', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/learning.css', import.meta.url), 'utf8');
  const roadmap = html.match(/<dialog id="learningDialog"[^>]*>(.*?)<\/dialog>/s)?.[1];
  assert.ok(roadmap);
  assert.match(roadmap, /^<header class="dialog-header">.*?<button id="closeLearning" aria-label="학습 로드맵 닫기">닫기<\/button><\/header>/s);
  assert.match(css, /#learningDialog\s*>\s*\.dialog-header\s*\{[^}]*position:\s*sticky\b[^}]*top:\s*0\b/);
  assert.match(css, /#learningDialog\s*\{[^}]*scroll-padding-top:\s*[^;}]+/);
});
