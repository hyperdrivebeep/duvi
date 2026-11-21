import path from 'node:path';
import {readFile, lstat, mkdir, writeFile, rename, rm} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import {MAX_BYTES} from './learning-validation.mjs';

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const invalid = () => {throw new Error('지원하지 않는 동기화 파일입니다.');};
async function info(file) {
  try {return await lstat(file);} catch (e) {if (e.code !== 'ENOENT') throw e; return null;}
}
export async function directory(parent, parts, create=false) {
  for (const part of parts) {
    parent = path.join(parent, part);
    if (create) await mkdir(parent).catch(e => {if (e.code !== 'EEXIST') throw e;});
    const details = await info(parent);
    if (!details) return null;
    if (!details.isDirectory() || details.isSymbolicLink()) invalid();
  }
  return parent;
}
export async function load(file) {
  const details = await info(file);
  if (!details) return null;
  if (!details.isFile() || details.isSymbolicLink() || details.size > MAX_BYTES) invalid();
  const bytes = await readFile(file);
  if (bytes.length > MAX_BYTES) invalid();
  const value = JSON.parse(bytes);
  if (!value) invalid();
  return value;
}
export async function save(file, value) {
  const bytes = JSON.stringify(value);
  if (Buffer.byteLength(bytes) > MAX_BYTES) invalid();
  const temp = file + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temp, bytes, {flag:'wx', mode:0o600});
    await rename(temp, file);
  } finally {await rm(temp, {force:true});}
}
