import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FINDINGS_PER_RULE = 50;

const BLOCKED_PATH_RULES = [
  { id: 'local-ai-notes', regex: /(^|[/\\])ai_notes([/\\]|$)/i },
  { id: 'local-findings', regex: /(^|[/\\])findings([/\\]|$)/i },
  { id: 'local-error-reports', regex: /(^|[/\\])errors-reports([/\\]|$)/i },
  { id: 'local-cv-photos', regex: /(^|[/\\])CVs_N_photos([/\\]|$)/i },
  { id: 'local-scratch', regex: /(^|[/\\])(?:devonly|logs|reports|Output)([/\\]|$)/i },
  { id: 'agent-local-state', regex: /(^|[/\\])\.(?:superpowers|codex|agents)([/\\]|$)/i },
  { id: 'env-file', regex: /(^|[/\\])\.env(?:\.|$)/i },
  { id: 'credential-material', regex: /\.(?:pem|key|p12|pfx|crt|cer|cert|kdbx)$/i },
  { id: 'ssh-private-key-name', regex: /(^|[/\\])(?:id_rsa|id_ed25519)(?:\.|$)/i },
  { id: 'package-or-netrc-secret', regex: /(^|[/\\])\.(?:npmrc|pypirc|netrc)$/i },
  { id: 'cloud-local-credentials', regex: /(^|[/\\])\.(?:aws|azure|gcp)([/\\]|$)/i },
  { id: 'credential-json-name', regex: /(?:google-credentials|service-account|credentials|secret).*\.json$/i },
  { id: 'local-database-export', regex: /\.(?:sqlite|sqlite3|db|dump|bak)$/i },
  { id: 'pii-source-material', regex: /\.(?:pdf|doc|docx|xls|xlsx|ppt|pptx|zip|7z|rar|tar|gz)$/i },
];

const SECRET_RULES = [
  { id: 'aws-access-key-id', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/, grep: '\\b(?:AKIA|ASIA)[A-Z0-9]{16}\\b' },
  { id: 'private-key-block', regex: /-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, grep: '-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----' },
  { id: 'github-token', regex: /\bgh[pousr]_[A-Za-z0-9_]{36,255}\b/, grep: '\\bgh[pousr]_[A-Za-z0-9_]{36,255}\\b' },
  { id: 'google-api-key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/, grep: '\\bAIza[0-9A-Za-z_-]{35}\\b' },
  { id: 'stripe-secret-key', regex: /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}\b/, grep: '\\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}\\b' },
  { id: 'slack-token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, grep: '\\bxox[baprs]-[A-Za-z0-9-]{10,}\\b' },
  {
    id: 'generic-secret-assignment',
    regex: /\b(?:api[_-]?key|secret|token|password|passwd|pwd|client_secret|private_key|access_token|refresh_token)\b\s*[:=]\s*["']?[^"'`\s]{8,}/i,
    grep: "\\b(?:api[_-]?key|secret|token|password|passwd|pwd|client_secret|private_key|access_token|refresh_token)\\b\\s*[:=]\\s*[\"']?[^\"'`\\s]{8,}",
  },
];

const REVIEW_RULES = [
  { id: 'email-address', regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, grep: '\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b' },
  { id: 'phone-or-whatsapp', regex: /(?:wa\.me\/\d{8,}|\+\d[\d\s().-]{7,}\d)/i, grep: '(?:wa\\.me/\\d{8,}|\\+\\d[\\d\\s().-]{7,}\\d)' },
  { id: 'identity-keyword', regex: /\b(?:CURP|RFC|NSS|SSN|passport|pasaporte|INE|credencial(?:es)?|identificacion|identificación)\b/i, grep: '\\b(?:CURP|RFC|NSS|SSN|passport|pasaporte|INE|credencial(?:es)?|identificacion|identificación)\\b' },
];

const TEXT_EXTENSIONS = new Set([
  '',
  '.css',
  '.csv',
  '.gitignore',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.scss',
  '.svg',
  '.ts',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);

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

function truthy(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeGitPath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function matchesRules(filePath, rules) {
  const normalized = normalizeGitPath(filePath);
  return rules.filter(rule => {
    rule.regex.lastIndex = 0;
    return rule.regex.test(normalized);
  }).map(rule => rule.id);
}

function isLikelyTextFile(filePath) {
  const normalized = normalizeGitPath(filePath);
  if (normalized.endsWith('/.gitignore')) return true;
  const basename = path.basename(normalized);
  if (['Codex.md', 'README.md', 'LICENSE'].includes(basename)) return true;
  return TEXT_EXTENSIONS.has(path.extname(normalized));
}

function lineHits(text, filePath, rules, context = {}) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      rule.regex.lastIndex = 0;
      if (!rule.regex.test(line)) continue;
      hits.push({
        rule: rule.id,
        file: normalizeGitPath(filePath),
        line: index + 1,
        ...context,
      });
      if (hits.filter(hit => hit.rule === rule.id).length >= MAX_FINDINGS_PER_RULE) break;
    }
  }
  return hits;
}

function limitedFindings(findings) {
  const counts = new Map();
  return findings.filter(finding => {
    const key = finding.rule;
    const count = counts.get(key) ?? 0;
    counts.set(key, count + 1);
    return count < MAX_FINDINGS_PER_RULE;
  });
}

async function git(repoPath, args, options = {}) {
  const result = await execFileAsync('git', args, {
    cwd: repoPath,
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  return result.stdout.toString().trim();
}

async function gitAllowNoMatches(repoPath, args, options = {}) {
  try {
    return await git(repoPath, args, options);
  } catch (error) {
    if (error && error.code === 1) {
      return String(error.stdout ?? '').trim();
    }
    throw error;
  }
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function isGitRepo(repoPath) {
  if (!existsSync(repoPath)) return false;
  try {
    return (await git(repoPath, ['rev-parse', '--is-inside-work-tree'])) === 'true';
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
    const repoPath = path.join(baseDir, entry.name);
    if (await isGitRepo(repoPath)) repos.push(repoPath);
  }
  return repos.sort();
}

async function trackedFiles(repoPath) {
  const output = await git(repoPath, ['ls-files']);
  return output ? output.split('\n').filter(Boolean) : [];
}

async function historyObjectPaths(repoPath) {
  const output = await git(repoPath, ['rev-list', '--objects', '--all']);
  if (!output) return [];
  return output.split('\n')
    .map(line => line.replace(/^[0-9a-f]{40}\s+/, '').trim())
    .filter(Boolean);
}

async function commitList(repoPath) {
  const output = await git(repoPath, ['rev-list', '--all']);
  return output ? output.split('\n').filter(Boolean) : [];
}

async function filesAtCommit(repoPath, commit) {
  const output = await git(repoPath, ['ls-tree', '-r', '--name-only', commit]);
  return output ? output.split('\n').filter(Boolean) : [];
}

async function readFileAtCommit(repoPath, commit, filePath) {
  const result = await execFileAsync('git', ['show', `${commit}:${filePath}`], {
    cwd: repoPath,
    encoding: 'buffer',
    windowsHide: true,
    maxBuffer: MAX_FILE_BYTES + 1024,
  });
  const buffer = result.stdout;
  if (buffer.length > MAX_FILE_BYTES || buffer.includes(0)) return null;
  return buffer.toString('utf8');
}

async function scanCurrentFiles(repoPath, files, rules) {
  const findings = [];
  for (const file of files) {
    if (!isLikelyTextFile(file)) continue;
    const absolutePath = path.join(repoPath, file);
    const buffer = await readFile(absolutePath);
    if (buffer.length > MAX_FILE_BYTES || buffer.includes(0)) continue;
    findings.push(...lineHits(buffer.toString('utf8'), file, rules));
  }
  return limitedFindings(findings);
}

async function scanHistory(repoPath, rules) {
  const findings = [];
  const commits = await commitList(repoPath);
  const seen = new Set();
  for (const rule of rules) {
    let count = 0;
    for (const commitChunk of chunks(commits, 100)) {
      const output = await gitAllowNoMatches(repoPath, [
        'grep',
        '-n',
        '-I',
        '-P',
        '-i',
        '-e',
        rule.grep ?? rule.regex.source,
        ...commitChunk,
        '--',
      ]);
      if (!output) continue;
      for (const line of output.split('\n')) {
        const match = line.match(/^([0-9a-f]{40}):(.+?):(\d+):/);
        if (!match) continue;
        const [, commit, file, lineNumber] = match;
        if (!isLikelyTextFile(file)) continue;
        const key = `${rule.id}:${file}:${lineNumber}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          rule: rule.id,
          file: normalizeGitPath(file),
          line: Number(lineNumber),
          commit: commit.slice(0, 12),
        });
        count += 1;
        if (count >= MAX_FINDINGS_PER_RULE) break;
      }
      if (count >= MAX_FINDINGS_PER_RULE) break;
    }
  }
  return limitedFindings(findings);
}

function pathFindings(paths) {
  const findings = [];
  for (const file of paths) {
    for (const rule of matchesRules(file, BLOCKED_PATH_RULES)) {
      findings.push({ rule, file: normalizeGitPath(file) });
    }
  }
  return limitedFindings(findings);
}

async function auditRepo(repoPath, { includeHistory = true } = {}) {
  const resolvedRepo = path.resolve(repoPath);
  if (!await isGitRepo(resolvedRepo)) {
    return { repoPath: resolvedRepo, okToPublic: false, status: 'not-git-repo' };
  }

  const statusOutput = await git(resolvedRepo, ['status', '--porcelain']);
  const files = await trackedFiles(resolvedRepo);
  const currentBlockedPaths = pathFindings(files);
  const currentSecretFindings = await scanCurrentFiles(resolvedRepo, files, SECRET_RULES);
  const currentReviewFindings = await scanCurrentFiles(resolvedRepo, files, REVIEW_RULES);

  const historyBlockedPaths = includeHistory ? pathFindings(await historyObjectPaths(resolvedRepo)) : [];
  const historySecretFindings = includeHistory ? await scanHistory(resolvedRepo, SECRET_RULES) : [];
  const historyReviewFindings = includeHistory ? await scanHistory(resolvedRepo, REVIEW_RULES) : [];

  const highRiskCount = currentBlockedPaths.length
    + historyBlockedPaths.length
    + currentSecretFindings.length
    + historySecretFindings.length;
  const clean = !statusOutput.trim();

  return {
    repoPath: resolvedRepo,
    repo: path.basename(resolvedRepo),
    status: clean ? 'clean' : 'dirty',
    dirtyFiles: clean ? [] : statusOutput.split('\n').filter(Boolean),
    okToPublic: clean && highRiskCount === 0,
    currentBlockedPaths,
    historyBlockedPaths,
    currentSecretFindings,
    historySecretFindings,
    currentReviewFindings,
    historyReviewFindings,
  };
}

async function resolveTargetRepos(args, cwd = process.cwd()) {
  if (args.repo.length > 0) {
    return args.repo.map(repo => path.resolve(cwd, repo));
  }
  return discoverDraftRepos(path.resolve(cwd, args['base-dir'] || 'drafts/_repos'));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const includeHistory = truthy(args.history, true);
  const summary = truthy(args.summary, false);
  const repos = await resolveTargetRepos(args);
  const results = [];
  for (const repoPath of repos) {
    results.push(await auditRepo(repoPath, { includeHistory }));
  }
  const blockingRepos = results.filter(result => !result.okToPublic);
  const outputResults = summary
    ? results.map(result => ({
      repo: result.repo,
      status: result.status,
      okToPublic: result.okToPublic,
      currentBlockedPathCount: result.currentBlockedPaths?.length ?? 0,
      historyBlockedPathCount: result.historyBlockedPaths?.length ?? 0,
      currentSecretFindingCount: result.currentSecretFindings?.length ?? 0,
      historySecretFindingCount: result.historySecretFindings?.length ?? 0,
      currentReviewFindingCount: result.currentReviewFindings?.length ?? 0,
      historyReviewFindingCount: result.historyReviewFindings?.length ?? 0,
    }))
    : results;
  console.log(JSON.stringify({
    ok: blockingRepos.length === 0,
    includeHistory,
    summary,
    repoCount: results.length,
    blockingRepoCount: blockingRepos.length,
    results: outputResults,
  }, null, 2));
  if (blockingRepos.length > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  auditRepo,
  BLOCKED_PATH_RULES,
  discoverDraftRepos,
  matchesRules,
  parseArgs,
  REVIEW_RULES,
  SECRET_RULES,
};
