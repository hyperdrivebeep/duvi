import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// The repository is public (AGENTS.md): no one's home folder, local workspace folder or e-mail address in tracked text.
// Placeholders, known shared/sandbox homes, and addresses at reserved test domains are fine.
// Vendored third-party code and the lockfile are skipped.
const root = new URL('..', import.meta.url);
const BINARY = /\.(webp|png|jpe?g|gif|ico|woff2?|ttf|exe|zip|wasm)$/i, SKIP = /^(package-lock\.json|backend\/vendor\/)/;
// A Unix-style root must start a token, not be a component of a URL or API route.
const USER_HOME = /(?:(?<![\w/:.-])[a-z]:[\\/]{1,2}|(?<=^|[\s`'"([{<])\/(?:(?:mnt\/)?[a-z]\/)?)users[\\/]{1,2}([^\\/\s`'"<>…]+)/gi;
const UNIX_HOME = /(?<=^|[\s`'"([{<])\/home\/([\w.-]+)/g;
// Angle-bracket placeholders such as <user> and <name> aren't account names in either pattern.
const PLACEHOLDERS = new Set(['yourname', 'username']);
const SHARED_USERS = new Set(['나', 'public']), SANDBOX_USERS = new Set(['pyodide', 'web_user']);
const EMAIL = /(?<![\w.+\-/:])[\w.+-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(?![\w-]|\.[\w-])/gi;
const WORKSPACE = /duvi-work[\\/]/g;
// Reserved test domains (RFC 2606, RFC 6761) name nobody.
const RESERVED = /(^|\.)(example|invalid|test|localhost)$|^example\.(com|net|org)$/i;
const DENSITY_ASSET = /^[23]x\.(?:png|jpe?g|gif|webp|svg)$/i;
const PACKAGE_ARCHIVE = /^\d+\.\d+\.\d+(?:-[a-z0-9-]+(?:\.[a-z0-9-]+)*)?\.tgz$/i;

function personalMatches(text) {
  const found = [];
  for (const match of text.matchAll(USER_HOME)) {
    const name = match[1].toLowerCase();
    if (!SHARED_USERS.has(name) && !PLACEHOLDERS.has(name)) found.push(match[0]);
  }
  for (const match of text.matchAll(UNIX_HOME)) {
    if (!SANDBOX_USERS.has(match[1]) && !PLACEHOLDERS.has(match[1].toLowerCase())) found.push(match[0]);
  }
  for (const match of text.matchAll(EMAIL)) {
    const gitRemote = match[1] === 'github.com' && match[0].startsWith('git@') &&
      /^:[\w.-]+\/[\w.-]+/.test(text.slice(match.index+match[0].length));
    if (!RESERVED.test(match[1]) && !DENSITY_ASSET.test(match[1]) && !PACKAGE_ARCHIVE.test(match[1]) && !gitRemote) found.push(match[0]);
  }
  for (const match of text.matchAll(WORKSPACE)) found.push(match[0]);
  return found;
}

test('privacy scanner detects personal home paths across shells and operating systems', () => {
  // Construct synthetic examples without putting raw personal-looking paths in tracked text.
  for (const home of [
    ['C:', 'Users', 'DemoUser'].join('/'),
    ['c:', 'users', 'DemoUser'].join('/'),
    ['c:', 'users', 'DemoUser'].join('\\'),
    ['C:', 'Users', 'DemoUser'].join('\\\\'),
    ['', 'c', 'Users', '9DemoUser'].join('/'),
    ['', 'd', 'users', 'DemoUser'].join('/'),
    ['', 'mnt', 'c', 'Users', 'DemoUser'].join('/'),
    ['', 'Users', 'DemoUser'].join('/'),
    ['', 'home', 'demo-user'].join('/')
  ]) {
    for (const text of [home+'/notes', `Location: "${home}/notes"`, `Paths:\n${home}/notes`]) {
      assert.deepEqual(personalMatches(text), [home], text);
    }
  }

  for (const home of [
    ['C:', 'Users', 'Public'].join('\\'),
    ['', 'c', 'users', 'PUBLIC'].join('/'),
    ['c:', 'users', '<사용자>'].join('/'),
    ['C:', 'Users', '나'].join('\\'),
    ['', 'home', 'pyodide'].join('/'),
    ['', 'home', 'web_user'].join('/'),
    ['C:', 'Users', 'YourName'].join('\\'),
    ['', 'Users', 'USERNAME'].join('/'),
    ['', 'home', 'YourName'].join('/'),
    ['', 'c', 'Users', '<user>'].join('/'),
    ['', 'mnt', 'c', 'Users', '<name>'].join('/'),
    ['', 'home', '<user>'].join('/'),
    ['', 'opt', 'users-guide'].join('/')
  ]) assert.deepEqual(personalMatches(home+'/notes'), [], home);

  for (const text of [
    'GET /api/users/123', 'github.com/users/octo', 'https://github.com/users/octo',
    'https://example.org/home/index', 'https://example.org/c/Users/octo',
    'https://example.org/mnt/c/Users/octo', 'https://example.org/C:/Users/octo'
  ]) assert.deepEqual(personalMatches(text), [], text);
});

test('privacy scanner distinguishes personal email and workspace paths from package and asset notation', () => {
  for (const email of [
    ['demo.user+tag', 'mail.demo'].join('@'),
    ['someone', '2team.demo'].join('@'),
    ['git', 'github.com'].join('@')
  ]) assert.deepEqual(personalMatches(`Contact: ${email}.`), [email], email);
  for (const separator of ['/', '\\']) {
    const prefix = ['duvi-work', ''].join(separator);
    assert.deepEqual(personalMatches(prefix+'fixture'), [prefix]);
  }
  for (const text of [
    'vite@6.4.2', 'pyodide@314.0.8', '@scope/tool@1.2.3-beta.1', 'icon@2x.png', 'pkg@1.2.3-beta.tgz',
    'git@github.com:org/repo', 'person@example.org', 'person@subdomain.example', 'person@host.test', 'Home/End'
  ]) assert.deepEqual(personalMatches(text), [], text);
});

test('tracked text files carry no personal paths or e-mail addresses', () => {
  const files = execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'}).split('\0').filter(file => file && !BINARY.test(file) && !SKIP.test(file));
  assert.ok(files.length > 100, 'git ls-files listed the repository');
  const found = [];
  for (const file of files) {
    const text = readFileSync(new URL(file, root), 'utf8');
    for (const match of personalMatches(text)) found.push(`${file}: ${match}`);
  }
  assert.deepEqual(found, []);
});
