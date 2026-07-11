#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { readDraftRegistry } from './draft-repo-preflight.mjs';

const execFileAsync = promisify(execFile);
const AGENTS_MAX_BYTES = 8 * 1024;
const CODEX_TARGET_BYTES = 4 * 1024;
const ROUTER_FILES = ['AGENTS.md', 'docs/README.md', 'docs/repository-map.md'];
const REQUIRED_FILES = [...ROUTER_FILES, 'docs/drafts-registry.json'];
const TEXT_EXTENSIONS = new Set(['.json', '.md', '.mjs', '.yaml', '.yml']);

function gitPath(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function finding(code, file, message) {
  return { code, file: gitPath(file), message };
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function readUtf8(rootDir, relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8');
}

async function listTrackedFiles(rootDir) {
  const { stdout } = await execFileAsync('git', ['ls-files', '-z'], {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
  });
  return stdout.split('\0').map(gitPath).filter(Boolean);
}

function markdownTargets(content) {
  return [...content.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)].map(match => match[1].trim());
}

function localTarget(target) {
  const unwrapped = target.replace(/^<|>$/g, '');
  if (!unwrapped || unwrapped.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(unwrapped)) return null;
  return unwrapped.split('#')[0].split('?')[0];
}

function isHistorical(relativePath) {
  const normalized = gitPath(relativePath);
  return normalized.startsWith('changelog/') || normalized === 'Codex.md';
}

export async function runKnowledgeCheck({ rootDir = process.cwd(), trackedFiles } = {}) {
  const root = path.resolve(rootDir);
  const tracked = (trackedFiles ?? (await listTrackedFiles(root))).map(gitPath);
  const trackedSet = new Set(tracked);
  const errors = [];
  const warnings = [];

  for (const requiredFile of REQUIRED_FILES) {
    if (trackedSet.has(requiredFile)) continue;
    const present = await exists(path.join(root, requiredFile));
    errors.push(finding(
      present ? 'untracked-required-file' : 'missing-required-file',
      requiredFile,
      present
        ? 'Required knowledge-routing file exists but is not tracked.'
        : 'Required knowledge-routing file is missing.'
    ));
  }

  const registryFile = path.join(root, 'docs/drafts-registry.json');
  if (await exists(registryFile)) {
    try {
      await readDraftRegistry(registryFile);
    } catch (error) {
      errors.push(finding(
        'invalid-draft-registry',
        'docs/drafts-registry.json',
        error instanceof Error ? error.message : String(error)
      ));
    }
  }

  for (const [relativePath, maxBytes, severity] of [
    ['AGENTS.md', AGENTS_MAX_BYTES, errors],
    ['Codex.md', CODEX_TARGET_BYTES, warnings],
  ]) {
    if (!(await exists(path.join(root, relativePath)))) continue;
    const fileStat = await stat(path.join(root, relativePath));
    if (fileStat.size > maxBytes) {
      severity.push(
        finding(
          'entrypoint-size',
          relativePath,
          `${relativePath} is ${fileStat.size} bytes; target is at most ${maxBytes} bytes.`
        )
      );
    }

    const content = await readUtf8(root, relativePath);
    const datedBullets = content.match(/^\s*[-*]\s+20\d{2}-\d{2}-\d{2}\b/gm) ?? [];
    if (datedBullets.length > 0) {
      severity.push(
        finding(
          'entrypoint-history',
          relativePath,
          `${relativePath} contains ${datedBullets.length} dated bullet(s); chronology belongs in changelog/.`
        )
      );
    }
  }

  for (const routerFile of ROUTER_FILES) {
    if (!(await exists(path.join(root, routerFile)))) continue;
    const content = await readUtf8(root, routerFile);
    for (const target of markdownTargets(content)) {
      const relativeTarget = localTarget(target);
      if (!relativeTarget) continue;
      const resolved = path.resolve(path.dirname(path.join(root, routerFile)), relativeTarget);
      const relativeToRoot = path.relative(root, resolved);
      if (relativeToRoot === '..' || relativeToRoot.startsWith(`..${path.sep}`) || !(await exists(resolved))) {
        errors.push(
          finding('broken-router-link', routerFile, `Local route target does not exist: ${target}`)
        );
      }
    }
  }

  if (await exists(path.join(root, 'docs/repository-map.md'))) {
    const repositoryMap = await readUtf8(root, 'docs/repository-map.md');
    if (!repositoryMap.includes('drafts-registry.json')) {
      errors.push(
        finding(
          'missing-registry-route',
          'docs/repository-map.md',
          'Repository map must link to docs/drafts-registry.json instead of duplicating the draft list.'
        )
      );
    }
  }

  for (const relativePath of tracked) {
    if (relativePath.startsWith('.superpowers/') || relativePath === 'docs/superpowers' || relativePath.startsWith('docs/superpowers/')) {
      errors.push(
        finding('tracked-local-evidence', relativePath, 'Local Superpowers content must remain untracked.')
      );
    }

    if (isHistorical(relativePath) || !TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) continue;
    const filePath = path.join(root, relativePath);
    if (!(await exists(filePath))) continue;
    const content = await readUtf8(root, relativePath);
    if (relativePath === 'tools/knowledge-check.mjs' || relativePath.startsWith('tools/tests/')) continue;

    if (/\b(?:read|open)\b[^\r\n]{0,100}\bCodex\.md\b/i.test(content)) {
      errors.push(
        finding(
          'mandatory-codex-read',
          relativePath,
          'Active guidance must route by task instead of requiring the full compatibility file.'
        )
      );
    }

    const localEvidenceLink = markdownTargets(content).some(target => {
      const normalized = target.replace(/\\/g, '/').toLowerCase();
      return normalized.includes('.superpowers/') || normalized.includes('docs/superpowers/');
    });
    if (localEvidenceLink) {
      errors.push(
        finding(
          'committed-local-evidence-link',
          relativePath,
          'Committed guidance cannot depend on local Superpowers evidence.'
        )
      );
    }

    const checksDraftRoot = relativePath === 'package.json' || relativePath.startsWith('tools/');
    const staleDraftRoot = content.includes('drafts/_repos')
      || /\bpath\.(?:join|resolve)\(\s*['"]drafts['"]\s*,\s*['"]_repos['"]/u.test(content);
    if (checksDraftRoot && staleDraftRoot) {
      errors.push(
        finding(
          'stale-draft-repo-root',
          relativePath,
          'Tooling must resolve canonical localPath values from docs/drafts-registry.json.'
        )
      );
    }
  }

  return {
    errors,
    warnings,
    inventory: {
      secretScanning: 'not-verifiable-from-files',
      trackedFiles: tracked.length,
    },
  };
}

function formatReport(report) {
  const lines = [];
  for (const [label, findings] of [
    ['ERROR', report.errors],
    ['WARN', report.warnings],
  ]) {
    for (const item of findings) lines.push(`${label} ${item.code} ${item.file}: ${item.message}`);
  }
  lines.push(
    `Knowledge check: ${report.errors.length} error(s), ${report.warnings.length} warning(s); secret scanning ${report.inventory.secretScanning}.`
  );
  return lines.join('\n');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const report = await runKnowledgeCheck();
  if (args.has('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatReport(report)}\n`);
  }
  if (args.has('--strict') && report.errors.length > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
