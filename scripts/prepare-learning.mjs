import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LectureLibrary} from '../backend/library.mjs';
import {prepareRoadmap} from '../backend/learning-curriculum.mjs';

const args = process.argv.slice(2);
if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log('Usage: node scripts/prepare-learning.mjs [--root <backend-directory>]');
} else if (args.length && (args.length !== 2 || args[0] !== '--root' || !args[1] || args[1].startsWith('--'))) {
  console.error('Usage: node scripts/prepare-learning.mjs [--root <backend-directory>]');
  process.exitCode = 1;
} else {
  const root = args.length ? path.resolve(args[1]) : fileURLToPath(new URL('../backend/', import.meta.url));
  try {
    const result = await prepareRoadmap(new LectureLibrary({root}));
    console.log(JSON.stringify({
      version: result.version, added: result.added, reused: result.reused, total: result.total,
      phases: result.folders.length, firstLectureId: result.firstLectureId,
      externalResources: result.externalResources, captions: 'fetched-on-open',
    }, null, 2));
  } catch (error) {
    // Do not print filesystem paths, data contents, provider responses, or credentials.
    console.error(error.code === 'learning_missing_mit'
      ? error.message
      : 'Learning preparation failed. Check the existing MIT catalog/data and directory write access.');
    process.exitCode = 1;
  }
}
