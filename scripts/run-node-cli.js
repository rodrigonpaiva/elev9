#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const [, , scriptPath, ...args] = process.argv;

if (!scriptPath) {
  console.error('Usage: node scripts/run-node-cli.js <script-path> [...args]');
  process.exit(1);
}

if (
  process.env.FORCE_COLOR !== undefined &&
  process.env.NO_COLOR !== undefined
) {
  delete process.env.NO_COLOR;
}

const result = spawnSync(process.execPath, [resolve(scriptPath), ...args], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
