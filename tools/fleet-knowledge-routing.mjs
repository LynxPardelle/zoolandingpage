import { execFile } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { readDraftRegistry } from './draft-repo-preflight.mjs';

const execFileAsync = promisify(execFile);
const HUB_URL = 'https://github.com/LynxPardelle/zoolandingpage/blob/main/';
const START = '<!-- zoolanding-hub-routing:start -->';
const END = '<!-- zoolanding-hub-routing:end -->';
const TOOL_ROOT = path.dirname(fileURLToPath(import.meta.url));
const PR_SAFETY_TEMPLATE = path.join(TOOL_ROOT, 'templates', 'draft-repo', '.github', 'workflows', 'pr-safety.yml');

const DRAFT_ROUTES = [
  ['Edit draft content or routes', null, 'Local `site-config.json`, page JSON, and task-specific local docs'],
  ['Create or bootstrap a draft', 'ai-notes/how-to/create-secure-draft-repo.md'],
  ['Promote, deploy, or configure branches', 'docs/11-draft-lifecycle.md', 'Hub lifecycle guide and local `.github/workflows/`'],
  ['Upload public assets', 'docs/12-public-assets-and-file-uploads.md'],
  ['Configure domains or aliases', 'docs/13-managed-alias-front-door.md'],
  ['Work across repositories', 'docs/repository-map.md'],
];

async function git(cwd, args) {
  const result = await execFileAsync('git', args, { cwd, windowsHide: true });
  return result.stdout.trim();
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function routesFor(definition) {
  if (definition.type === 'draft') return DRAFT_ROUTES;
  return definition.routes.map(route => [route.task, route.path]);
}

function routeTarget(pathValue, label) {
  return pathValue ? `[${label ?? pathValue}](${HUB_URL}${pathValue})` : label;
}

function routingBlock(definition, audience = 'agents') {
  const routes = routesFor(definition);
  const rows = routes.map(([task, routePath, label]) => `| ${task} | ${routeTarget(routePath, label)} |`).join('\n');
  const intro = audience === 'readme'
    ? 'Shared procedures are routed through the Zoolandingpage hub. Start with [AGENTS.md](AGENTS.md) and open only the document needed for the current task.'
    : 'Read only the row needed for the current task, then inspect the local executable configuration or workflow that owns the behavior.';
  return `${START}\n## Zoolanding Knowledge Router\n\n${intro}\n\n| Task | Read |\n| --- | --- |\n${rows}\n\nCritical repository-specific safety, deployment, and rollback rules remain local.\n${END}`;
}

function upsertManagedBlock(content, block) {
  const source = String(content ?? '');
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start >= 0 && end >= start) {
    return `${source.slice(0, start)}${block}${source.slice(end + END.length)}`;
  }
  const headingEnd = source.startsWith('# ') ? source.indexOf('\n') + 1 : 0;
  if (headingEnd > 0) {
    return `${source.slice(0, headingEnd).trimEnd()}\n\n${block}\n\n${source.slice(headingEnd).trimStart()}`;
  }
  return `${block}${source.trim() ? `\n\n${source.trimStart()}` : '\n'}`;
}

async function assertClean(repoPath, allowDirty) {
  if (allowDirty) return;
  if (await git(repoPath, ['status', '--porcelain'])) throw new Error(`dirty worktree: ${repoPath}`);
}

function normalizeGithubRemote(value) {
  return String(value ?? '')
    .trim()
    .replace(/^git@github\.com:/i, 'https://github.com/')
    .replace(/\.git\/?$/i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

async function assertRemote(repoPath, definition) {
  const remote = await git(repoPath, ['remote', 'get-url', 'origin']).catch(() => '');
  if (normalizeGithubRemote(remote) !== normalizeGithubRemote(definition.githubUrl)) {
    throw new Error(`origin remote mismatch: ${repoPath}`);
  }
}

async function verifyHubTargets(definition, hubRoot) {
  for (const [, routePath] of routesFor(definition)) {
    if (routePath && !await exists(path.join(hubRoot, routePath))) {
      throw new Error(`Hub route not found: ${routePath}`);
    }
  }
}

async function applyRouting(repoPath, definition, { hubRoot, allowDirty = false } = {}) {
  await assertClean(repoPath, allowDirty);
  await assertRemote(repoPath, definition);
  await verifyHubTargets(definition, hubRoot);
  const changed = [];
  for (const [fileName, title, audience] of [
    ['README.md', `# ${definition.repo}\n`, 'readme'],
    ['AGENTS.md', '# Repository Agent Workflow\n', 'agents'],
  ]) {
    const filePath = path.join(repoPath, fileName);
    const current = await exists(filePath) ? await readFile(filePath, 'utf8') : title;
    const next = upsertManagedBlock(current, routingBlock(definition, audience));
    if (next !== current) {
      await writeFile(filePath, next, 'utf8');
      changed.push(fileName);
    }
  }

  const safetyPath = path.join(repoPath, '.github', 'workflows', 'pr-safety.yml');
  const safety = await readFile(PR_SAFETY_TEMPLATE, 'utf8');
  const currentSafety = await exists(safetyPath) ? await readFile(safetyPath, 'utf8') : '';
  if (currentSafety !== safety) {
    await mkdir(path.dirname(safetyPath), { recursive: true });
    await writeFile(safetyPath, safety, 'utf8');
    changed.push('.github/workflows/pr-safety.yml');
  }
  return { repoPath, changed };
}

async function auditRepository(repoPath, definition, { hubRoot, allowDirty = false } = {}) {
  const issues = [];
  if (!allowDirty && await git(repoPath, ['status', '--porcelain'])) issues.push('dirty worktree');

  try {
    await assertRemote(repoPath, definition);
  } catch {
    issues.push('origin remote mismatch');
  }

  const branches = (await git(repoPath, ['branch', '-a', '--format=%(refname:short)']))
    .split(/\r?\n/)
    .map(branch => branch.replace(/^remotes\/origin\//, ''));
  for (const branch of definition.requiredBranches) {
    if (!branches.includes(branch)) issues.push(`branch missing: ${branch}`);
  }

  for (const workflow of definition.requiredWorkflows) {
    if (!await exists(path.join(repoPath, '.github', 'workflows', workflow))) issues.push(`workflow missing: ${workflow}`);
  }

  for (const fileName of ['README.md', 'AGENTS.md']) {
    const filePath = path.join(repoPath, fileName);
    const content = await exists(filePath) ? await readFile(filePath, 'utf8') : '';
    if (!content.includes(START) || !content.includes(END)) issues.push(`${fileName} routing block missing`);
  }

  try {
    await verifyHubTargets(definition, hubRoot);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }

  const safetyPath = path.join(repoPath, '.github', 'workflows', 'pr-safety.yml');
  if (await exists(safetyPath)) {
    const safety = await readFile(safetyPath, 'utf8');
    if (!/reusable-pr-safety\.yml@[0-9a-f]{40}/.test(safety)) issues.push('C1 reference is not immutable');
  }
  return { repo: definition.repo, repoPath, issues };
}

async function readSatelliteRegistry(registryPath) {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  if (!Array.isArray(registry.satellites) || registry.satellites.length === 0) {
    throw new Error('satellites must contain at least one repository');
  }
  const seen = new Set();
  for (const satellite of registry.satellites) {
    if (!/^\.\.[\\/][^\\/]+$/.test(satellite.localPath ?? '')) throw new Error(`Invalid localPath: ${satellite.localPath}`);
    if (!Array.isArray(satellite.requiredBranches) || satellite.requiredBranches.length === 0) {
      throw new Error(`requiredBranches are required: ${satellite.repo}`);
    }
    if (!Array.isArray(satellite.requiredWorkflows) || satellite.requiredWorkflows.length === 0) {
      throw new Error(`requiredWorkflows are required: ${satellite.repo}`);
    }
    if (!Array.isArray(satellite.routes) || satellite.routes.length === 0) throw new Error(`routes are required: ${satellite.repo}`);
    for (const route of satellite.routes) {
      const routePath = String(route.path ?? '');
      if (!route.task || !routePath || path.isAbsolute(routePath) || routePath.includes('\\') || routePath.split('/').includes('..')) {
        throw new Error(`Invalid route path: ${routePath}`);
      }
    }
    if (seen.has(satellite.repo)) throw new Error(`Duplicate satellite repo: ${satellite.repo}`);
    if (satellite.githubUrl !== `https://github.com/${registry.owner}/${satellite.repo}.git`) throw new Error(`Invalid githubUrl: ${satellite.repo}`);
    seen.add(satellite.repo);
  }
  return registry;
}

async function buildInventory(hubRoot, { checkoutRoot } = {}) {
  const draftRegistry = await readDraftRegistry(path.join(hubRoot, 'docs', 'drafts-registry.json'));
  const satelliteRegistry = await readSatelliteRegistry(path.join(hubRoot, 'docs', 'satellite-repositories.json'));
  const draftWorkflows = ['deploy-test.yml', 'deploy-production.yml', 'guard-pr-source.yml', 'pr-safety.yml'];
  return [
    ...draftRegistry.drafts.map(draft => ({
      ...draft,
      type: 'draft',
      repoPath: checkoutRoot ? path.resolve(checkoutRoot, draft.repo) : path.resolve(hubRoot, draft.localPath),
      requiredBranches: ['dev', 'test', 'main'],
      requiredWorkflows: draftWorkflows,
    })),
    ...satelliteRegistry.satellites.map(satellite => ({
      ...satellite,
      type: 'satellite',
      repoPath: checkoutRoot ? path.resolve(checkoutRoot, satellite.repo) : path.resolve(hubRoot, satellite.localPath),
    })),
  ].sort((a, b) => a.repo.localeCompare(b.repo));
}

function parseArgs(rawArgs) {
  const args = { repo: [] };
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [key, ...parts] = arg.slice(2).split('=');
    const value = parts.length ? parts.join('=').trim() : 'true';
    if (key === 'repo') args.repo.push(...value.split(',').map(item => item.trim()).filter(Boolean));
    else args[key] = value;
  }
  if (args.repo.length === 0) delete args.repo;
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const hubRoot = path.resolve(args.hub ?? '.');
  const checkoutRoot = args['checkout-root'] ? path.resolve(args['checkout-root']) : undefined;
  const selected = new Set(args.repo ?? []);
  const inventory = (await buildInventory(hubRoot, { checkoutRoot })).filter(item => selected.size === 0 || selected.has(item.repo));
  if (selected.size > 0 && inventory.length !== selected.size) {
    const found = new Set(inventory.map(item => item.repo));
    throw new Error(`Unregistered repositories: ${[...selected].filter(repo => !found.has(repo)).join(', ')}`);
  }
  const apply = args.apply === 'true';
  const results = [];
  for (const definition of inventory) {
    if (!await exists(definition.repoPath)) {
      results.push({ repo: definition.repo, repoPath: definition.repoPath, issues: ['repository path missing'] });
      continue;
    }
    if (apply) await applyRouting(definition.repoPath, definition, { hubRoot });
    results.push(await auditRepository(definition.repoPath, definition, { hubRoot, allowDirty: apply }));
  }
  const ok = results.every(result => result.issues.length === 0);
  console.log(JSON.stringify({ ok, apply, results }, null, 2));
  if (!ok) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  applyRouting,
  auditRepository,
  buildInventory,
  parseArgs,
  readSatelliteRegistry,
  routingBlock,
  upsertManagedBlock,
};
