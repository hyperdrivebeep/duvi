import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('E01 offline Python unittest suite', t => {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const launchers = [['python3'], ['python'], ...(process.platform === 'win32' ? [['py', '-3']] : [])];
  for (const [command, ...flags] of launchers) {
    const options = {cwd, encoding: 'utf8', timeout: 30_000};
    const probe = spawnSync(command, [...flags, '-c', 'import sys; sys.exit(sys.version_info < (3, 9))'], options);
    if (probe.error?.code === 'ENOENT') continue;
    if (probe.error) throw probe.error;
    if (probe.status !== 0) continue;
    const result = spawnSync(command, [...flags, '-m', 'unittest', 'discover', '-s', 'exercises/e01/tests', '-v'], options);
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    return;
  }
  t.skip('Python 3.9+ not found; see exercises/e01/README.md for the standalone command');
});
