import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const scripts = packageJson.scripts ?? {};
const entries = Object.entries(scripts).sort(([a], [b]) => a.localeCompare(b));

if (entries.length === 0) {
  console.log('No npm scripts defined.');
  process.exit(0);
}

console.log('Available npm scripts:');
for (const [name, command] of entries) {
  console.log(`- ${name}: ${command}`);
}
