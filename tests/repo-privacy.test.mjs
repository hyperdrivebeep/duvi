import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// The repository is public (AGENTS.md): no one's home folder, local workspace folder or e-mail address in tracked text.
// Placeholders such as C:\Users\<사용자>\… or C:\Users\나\…, and addresses at reserved test domains, are fine.
// Vendored third-party code and the lockfile are skipped.
const root = new URL('..', import.meta.url);
const BINARY = /\.(webp|png|jpe?g|gif|ico|woff2?|ttf|exe|zip|wasm)$/i, SKIP = /^(package-lock\.json|backend\/vendor\/)/;
const HOME = /[A-Za-z]:[\\/]{1,2}Users[\\/]{1,2}([^\\/\s`'"<>…]+)|\/(?:home|Users)\/([a-z][\w.-]*)/g, PLACEHOLDER = new Set(['나']);
const EMAIL = /(?<![\w.+\-/:])[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g, WORKSPACE = /duvi-work[\\/]/g;
// Reserved test domains (RFC 2606, RFC 6761) name nobody.
const RESERVED = /(^|\.)(example|invalid|test|localhost)$|^example\.(com|net|org)$/i;

test('tracked text files carry no personal paths or e-mail addresses', () => {
  const files = execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'}).split('\0').filter(file => file && !BINARY.test(file) && !SKIP.test(file));
  assert.ok(files.length > 100, 'git ls-files listed the repository');
  const found = [];
  for (const file of files) {
    const text = readFileSync(new URL(file, root), 'utf8');
    for (const match of text.matchAll(HOME)) if (!PLACEHOLDER.has(match[1] ?? match[2])) found.push(`${file}: ${match[0]}`);
    for (const match of text.matchAll(EMAIL)) if (!RESERVED.test(match[1])) found.push(`${file}: ${match[0]}`);
    for (const match of text.matchAll(WORKSPACE)) found.push(`${file}: ${match[0]}`);
  }
  assert.deepEqual(found, []);
});
