#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') {
  console.error('check-mobile-env only supports macOS.');
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(here, '../scripts/check-mobile-env.sh');
const result = spawnSync('bash', [scriptPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
