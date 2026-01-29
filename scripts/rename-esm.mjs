import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distPath = resolve('dist');
const esmSource = resolve(distPath, 'index.js');
const esmTarget = resolve(distPath, 'index.mjs');

if (existsSync(esmSource)) {
  copyFileSync(esmSource, esmTarget);
}
