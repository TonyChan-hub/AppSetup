#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') {
  console.error('setup-rn-ios-env only supports macOS.');
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(here, '../scripts/setup-ios-env.sh');
const result = spawnSync('bash', [scriptPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
