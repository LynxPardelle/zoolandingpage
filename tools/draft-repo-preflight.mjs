import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function parseArgs(rawArgs) {
  const args = { repo: [] };
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
    if (key === 'repo') {
      args.repo.push(...value.split(',').map(part => part.trim()).filter(Boolean));
      continue;
    }
    args[key] = value;
  }
  return args;
}

function isTruthy(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

async function git(cwd, args) {
  const result = await execFileAsync('git', args, { cwd, windowsHide: true });
  return result.stdout.trim();
}

async function isGitRepo(cwd) {
  if (!existsSync(cwd)) return false;
  try {
    const inside = await git(cwd, ['rev-parse', '--is-inside-work-tree']);
    return inside === 'true';
  } catch {
    return false;
  }
}

async function discoverDraftRepos(baseDir) {
  if (!existsSync(baseDir)) return [];
  const entries = await readdir(baseDir, { withFileTypes: true });
  const repos = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('draft-')) continue;
    const fullPath = path.join(baseDir, entry.name);
    if (await isGitRepo(fullPath)) {
      repos.push(fullPath);
    }
  }
  return repos.sort();
}

async function resolveTargetRepos(args, cwd = process.cwd()) {
  const explicitRepos = args.repo.map(repoPath => path.resolve(cwd, repoPath));
  if (explicitRepos.length > 0) {
    return explicitRepos;
  }

  const siblingBase = path.resolve(cwd, '..');
  return [cwd, ...(await discoverDraftRepos(siblingBase))];
}

async function inspectRepo(repoPath, { pull = false } = {}) {
  if (!(await isGitRepo(repoPath))) {
    return { repoPath, status: 'not-git-repo', pulled: false };
  }

  const porcelain = await git(repoPath, ['status', '--porcelain']);
  if (porcelain) {
    return { repoPath, status: 'dirty', pulled: false, details: porcelain.split('\n') };
  }

  if (!pull) {
    return { repoPath, status: 'clean', pulled: false };
  }

  const output = await git(repoPath, ['pull', '--ff-only']);
  return { repoPath, status: 'clean', pulled: true, details: output ? [output] : [] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pull = isTruthy(args.pull, true);
  const repos = await resolveTargetRepos(args);
  const results = [];
  let failed = false;

  for (const repoPath of repos) {
    const result = await inspectRepo(repoPath, { pull });
    results.push(result);
    if (['dirty', 'not-git-repo'].includes(result.status)) {
      failed = true;
    }
  }

  console.log(JSON.stringify({ ok: !failed, pull, repos: results }, null, 2));
  if (failed) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { discoverDraftRepos, inspectRepo, parseArgs, resolveTargetRepos };
