#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

function usage() {
  process.stdout.write('Usage: node tools/run-with-logs.mjs [--name label] [--cwd path] -- command [args...]\\n');
}

function sanitize(value) {
  return String(value || 'command')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'command';
}

function timestamp() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}_${values.hour}-${values.minute}-${values.second}-CT`;
}

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.length === 0) {
  usage();
  process.exit(argv.length === 0 ? 1 : 0);
}

let name = 'command';
let cwd = process.cwd();
const commandStart = argv.indexOf('--');

if (commandStart === -1 || commandStart === argv.length - 1) {
  usage();
  process.exit(1);
}

for (let index = 0; index < commandStart; index += 1) {
  const arg = argv[index];
  if (arg === '--name') {
    name = argv[index + 1];
    index += 1;
    continue;
  }
  if (arg === '--cwd') {
    cwd = resolve(argv[index + 1]);
    index += 1;
    continue;
  }
  process.stderr.write(`Unknown option: ${arg}\\n`);
  usage();
  process.exit(1);
}

const [command, ...args] = argv.slice(commandStart + 1);
const logsDir = resolve(cwd, process.env.ZLP_LOG_DIR || 'logs');
await mkdir(logsDir, { recursive: true });

const baseName = `${timestamp()}-${sanitize(name)}`;
const combinedPath = join(logsDir, `${baseName}.log`);
const stdoutPath = join(logsDir, `${baseName}.out.log`);
const stderrPath = join(logsDir, `${baseName}.err.log`);

const combined = createWriteStream(combinedPath, { flags: 'a' });
const stdoutLog = createWriteStream(stdoutPath, { flags: 'a' });
const stderrLog = createWriteStream(stderrPath, { flags: 'a' });

function write(stream, chunk) {
  stream.write(chunk);
  combined.write(chunk);
}

process.stdout.write(`Writing logs to ${logsDir}\\n`);
process.stdout.write(`Combined: ${combinedPath}\\n`);

const child = spawn(command, args, {
  cwd,
  env: process.env,
  shell: process.platform === 'win32',
  stdio: ['inherit', 'pipe', 'pipe'],
  windowsHide: true,
});

child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  write(stdoutLog, chunk);
});

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
  write(stderrLog, chunk);
});

child.on('error', (error) => {
  const message = `${error instanceof Error ? error.message : String(error)}\\n`;
  process.stderr.write(message);
  write(stderrLog, message);
});

const exitCode = await new Promise((resolveExit) => {
  child.on('close', (code, signal) => {
    if (signal) {
      const message = `Command terminated by signal ${signal}\\n`;
      process.stderr.write(message);
      write(stderrLog, message);
      resolveExit(1);
      return;
    }
    resolveExit(code ?? 0);
  });
});

await Promise.all([
  new Promise((resolveClose) => combined.end(resolveClose)),
  new Promise((resolveClose) => stdoutLog.end(resolveClose)),
  new Promise((resolveClose) => stderrLog.end(resolveClose)),
]);

process.exit(exitCode);
