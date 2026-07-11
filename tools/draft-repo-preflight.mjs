import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, realpath } from 'node:fs/promises';
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

async function run(command, args, options = {}) {
  const result = await execFileAsync(command, args, { windowsHide: true, ...options });
  return result.stdout.trim();
}

async function isGitRepo(cwd) {
  if (!existsSync(cwd)) return false;
  try {
    const topLevel = await git(cwd, ['rev-parse', '--show-toplevel']);
    return path.relative(path.resolve(cwd), path.resolve(topLevel)) === '';
  } catch {
    return false;
  }
}

function isContainedPath(rootPath, targetPath, { allowRoot = false } = {}) {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  if (!relative) return allowRoot;
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
}

function githubRepoIdentity(remoteUrl) {
  return String(remoteUrl ?? '')
    .trim()
    .replaceAll('\\', '/')
    .replace(/^git@github\.com:/i, '')
    .replace(/^ssh:\/\/git@github\.com\//i, '')
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.git$/i, '')
    .toLowerCase();
}

function requiredCanonicalString(value, label) {
  if (typeof value !== 'string' || !value || value !== value.trim()) {
    throw new Error(`Draft registry ${label} must be a non-empty canonical string.`);
  }
  return value;
}

function validateDomain(value, label) {
  const domain = requiredCanonicalString(value, label);
  if (domain.length > 253 || domain !== domain.toLowerCase() || !/^[a-z0-9.-]+$/.test(domain)) {
    throw new Error(`Draft registry ${label} is not a canonical ASCII hostname.`);
  }
  for (const hostnameLabel of domain.split('.')) {
    if (!hostnameLabel || hostnameLabel.length > 63 || hostnameLabel.startsWith('-') || hostnameLabel.endsWith('-')) {
      throw new Error(`Draft registry ${label} is not a canonical ASCII hostname.`);
    }
  }
  return domain;
}

async function discoverDraftRepos(baseDir) {
  if (!existsSync(baseDir)) return [];
  const entries = await readdir(baseDir, { withFileTypes: true });
  const repos = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.includes('.') || entry.name.startsWith('_')) continue;
    try {
      validateDomain(entry.name, 'draft directory');
    } catch {
      continue;
    }
    const fullPath = path.join(baseDir, entry.name);
    if (await isGitRepo(fullPath)) {
      repos.push(fullPath);
    }
  }
  return repos.sort();
}

async function readDraftRegistry(registryPath) {
  if (!registryPath || !existsSync(registryPath)) {
    throw new Error(`Draft registry not found: ${registryPath}`);
  }
  const raw = JSON.parse(await readFile(registryPath, 'utf8'));
  if (raw?.version !== 1) throw new Error('Draft registry version must be 1.');
  const owner = requiredCanonicalString(raw.owner, 'owner');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner) || owner.endsWith('-')) {
    throw new Error('Draft registry owner is not a valid GitHub owner.');
  }
  const defaultBaseDir = requiredCanonicalString(raw.defaultBaseDir, 'defaultBaseDir');
  if (defaultBaseDir !== 'drafts') {
    throw new Error("Draft registry defaultBaseDir must be 'drafts'.");
  }
  if (!Array.isArray(raw.drafts) || raw.drafts.length === 0) {
    throw new Error('Draft registry drafts must be a non-empty array.');
  }

  const seen = {
    domains: new Set(),
    repos: new Set(),
    localPaths: new Set(),
  };
  const drafts = raw.drafts.map((draft, index) => {
    const prefix = `drafts[${index}]`;
    const domain = validateDomain(draft?.domain, `${prefix}.domain`);
    const repo = requiredCanonicalString(draft?.repo, `${prefix}.repo`);
    if (!/^[A-Za-z0-9._-]+$/.test(repo)) {
      throw new Error(`Draft registry ${prefix}.repo is invalid.`);
    }
    const githubUrl = requiredCanonicalString(draft?.githubUrl, `${prefix}.githubUrl`);
    const expectedGithubUrl = `https://github.com/${owner}/${repo}.git`;
    if (githubUrl !== expectedGithubUrl) {
      throw new Error(`Draft registry ${prefix}.githubUrl must be ${expectedGithubUrl}.`);
    }
    const localPath = requiredCanonicalString(draft?.localPath, `${prefix}.localPath`);
    const localParts = localPath.split('/');
    if (localParts.length !== 2 || localParts[0] !== 'drafts') {
      throw new Error(`Draft registry ${prefix}.localPath must be a direct child of drafts/.`);
    }
    validateDomain(localParts[1], `${prefix}.localPath`);

    for (const [label, value, values] of [
      ['domain', domain, seen.domains],
      ['repo', repo.toLowerCase(), seen.repos],
      ['localPath', localPath.toLowerCase(), seen.localPaths],
    ]) {
      if (values.has(value)) throw new Error(`Draft registry has duplicate ${label}: ${value}.`);
      values.add(value);
    }

    return { domain, repo, githubUrl, localPath };
  });
  return {
    registryPath,
    owner,
    defaultBaseDir,
    drafts,
  };
}

function registeredDraftRepoPath(draft, cwd, defaultBaseDir = 'drafts') {
  const localPath = String(draft?.localPath || path.posix.join(defaultBaseDir, String(draft?.repo ?? '')));
  if (
    !localPath
    || localPath !== localPath.trim()
    || localPath.includes('\\')
    || /[:\u0000-\u001f\u007f]/.test(localPath)
    || path.isAbsolute(localPath)
    || path.win32.isAbsolute(localPath)
    || localPath.split('/').some(segment => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`Draft registry localPath is unsafe: ${localPath}`);
  }
  const draftsRoot = path.resolve(cwd, defaultBaseDir);
  const repoPath = path.resolve(cwd, localPath);
  if (!isContainedPath(draftsRoot, repoPath)) {
    throw new Error(`Draft registry localPath escapes ${defaultBaseDir}: ${localPath}`);
  }
  return repoPath;
}

async function inspectRegisteredDraftRepo(draft, { cwd = process.cwd(), defaultBaseDir = 'drafts' } = {}) {
  const repoPath = registeredDraftRepoPath(draft, cwd, defaultBaseDir);
  if (!existsSync(repoPath)) return { ...draft, repoPath, status: 'missing', cloned: false };

  const draftsRoot = path.resolve(cwd, defaultBaseDir);
  try {
    const [realCwd, realDraftsRoot, realRepoPath] = await Promise.all([
      realpath(cwd),
      realpath(draftsRoot),
      realpath(repoPath),
    ]);
    if (!isContainedPath(realCwd, realDraftsRoot) || !isContainedPath(realDraftsRoot, realRepoPath)) {
      return { ...draft, repoPath, status: 'path-escape', cloned: false };
    }
  } catch {
    return { ...draft, repoPath, status: 'path-unresolvable', cloned: false };
  }

  if (!(await isGitRepo(repoPath))) {
    return { ...draft, repoPath, status: 'not-git-repo', cloned: false };
  }
  let remoteUrl = '';
  try {
    remoteUrl = await git(repoPath, ['remote', 'get-url', 'origin']);
  } catch {
    return { ...draft, repoPath, status: 'missing-origin', cloned: false };
  }
  if (githubRepoIdentity(remoteUrl) !== githubRepoIdentity(draft.githubUrl)) {
    return { ...draft, repoPath, status: 'remote-mismatch', cloned: false };
  }
  return { ...draft, repoPath, status: 'present', cloned: false };
}

async function ensureRegisteredDraftRepos(registry, { cwd = process.cwd(), clone = true } = {}) {
  const results = [];
  for (const draft of registry.drafts) {
    const repoPath = registeredDraftRepoPath(draft, cwd, registry.defaultBaseDir);
    const inspected = await inspectRegisteredDraftRepo(draft, {
      cwd,
      defaultBaseDir: registry.defaultBaseDir,
    });
    if (inspected.status === 'present') {
      results.push(inspected);
      continue;
    }
    if (inspected.status !== 'missing') {
      results.push(inspected);
      continue;
    }
    if (!clone) {
      results.push({ ...draft, repoPath, status: 'missing', cloned: false });
      continue;
    }
    const draftsRoot = path.resolve(cwd, registry.defaultBaseDir || 'drafts');
    await mkdir(draftsRoot, { recursive: true });
    await mkdir(path.dirname(repoPath), { recursive: true });
    const [realCwd, realDraftsRoot, realParent] = await Promise.all([
      realpath(cwd),
      realpath(draftsRoot),
      realpath(path.dirname(repoPath)),
    ]);
    if (!isContainedPath(realCwd, realDraftsRoot) || !isContainedPath(realDraftsRoot, realParent, { allowRoot: true })) {
      results.push({ ...draft, repoPath, status: 'path-escape', cloned: false });
      continue;
    }
    await run('git', ['clone', draft.githubUrl, repoPath], { cwd });
    results.push({ ...(await inspectRegisteredDraftRepo(draft, {
      cwd,
      defaultBaseDir: registry.defaultBaseDir,
    })), cloned: true });
  }
  return results;
}

async function resolveTargetRepos(args, cwd = process.cwd()) {
  const explicitRepos = args.repo.map(repoPath => path.resolve(cwd, repoPath));
  if (explicitRepos.length > 0) {
    return {
      registry: null,
      registeredRepos: [],
      unregisteredRepos: [],
      repos: explicitRepos,
    };
  }

  const registryPath = path.resolve(cwd, args.registry || 'docs/drafts-registry.json');
  const registry = await readDraftRegistry(registryPath);
  const clone = isTruthy(args.clone, true);
  const registeredRepos = await ensureRegisteredDraftRepos(registry, { cwd, clone });
  const draftBase = path.resolve(cwd, registry.defaultBaseDir || 'drafts');
  const discoveredRepos = await discoverDraftRepos(draftBase);
  const registeredPathSet = new Set(registeredRepos.map(result => path.resolve(result.repoPath)));
  const registryRepoPaths = registeredRepos
    .filter(result => result.status === 'present')
    .map(result => result.repoPath);
  const unregisteredRepos = discoveredRepos.filter(repoPath => !registeredPathSet.has(path.resolve(repoPath)));
  const repos = [...new Set([cwd, ...registryRepoPaths, ...unregisteredRepos])].sort();
  return {
    registry,
    registeredRepos,
    unregisteredRepos,
    repos,
  };
}

async function inspectRepo(repoPath, { pull = false, unregistered = false } = {}) {
  if (!(await isGitRepo(repoPath))) {
    return { repoPath, status: 'not-git-repo', pulled: false };
  }

  const porcelain = await git(repoPath, ['status', '--porcelain']);
  if (porcelain) {
    return { repoPath, status: 'dirty', pulled: false, details: porcelain.split('\n') };
  }

  if (!pull || unregistered) {
    return { repoPath, status: 'clean', pulled: false };
  }

  const output = await git(repoPath, ['pull', '--ff-only']);
  return { repoPath, status: 'clean', pulled: true, details: output ? [output] : [] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pull = isTruthy(args.pull, true);
  const resolved = await resolveTargetRepos(args);
  const results = [];
  let failed = false;
  const unregisteredSet = new Set(resolved.unregisteredRepos.map(repoPath => path.resolve(repoPath)));

  for (const repoPath of resolved.repos) {
    const unregistered = unregisteredSet.has(path.resolve(repoPath));
    let result = await inspectRepo(repoPath, { pull, unregistered });
    if (unregistered) {
      result = {
        ...result,
        status: 'unregistered',
        inspectedStatus: result.status,
      };
    }
    results.push(result);
    if (['dirty', 'not-git-repo', 'unregistered'].includes(result.status)) {
      failed = true;
    }
  }
  for (const result of resolved.registeredRepos) {
    if (['missing', 'not-git-repo', 'missing-origin', 'remote-mismatch', 'path-escape', 'path-unresolvable'].includes(result.status)) {
      failed = true;
    }
  }

  console.log(JSON.stringify({
    ok: !failed,
    pull,
    registry: resolved.registry ? {
      registryPath: resolved.registry.registryPath,
      draftCount: resolved.registry.drafts.length,
    } : null,
    registeredRepos: resolved.registeredRepos,
    unregisteredRepos: resolved.unregisteredRepos,
    repos: results,
  }, null, 2));
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

export {
  discoverDraftRepos,
  ensureRegisteredDraftRepos,
  githubRepoIdentity,
  inspectRepo,
  inspectRegisteredDraftRepo,
  parseArgs,
  readDraftRegistry,
  registeredDraftRepoPath,
  resolveTargetRepos,
};
