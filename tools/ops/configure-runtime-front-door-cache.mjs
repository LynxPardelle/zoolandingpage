#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_DISTRIBUTION_ID = 'E28Y8KTE8ZVWY9';
const DEFAULT_PATH_PATTERN = '/runtime-bundle*';
const DEFAULT_CACHE_POLICY_NAME = 'zoolanding-runtime-bundle-short-cache';
const DEFAULT_MIN_TTL_SECONDS = 1;
const DEFAULT_DEFAULT_TTL_SECONDS = 10;
const DEFAULT_MAX_TTL_SECONDS = 60;
const DEFAULT_TIME_ZONE = 'America/Mexico_City';

function parseArgs(rawArgs) {
  const args = {};
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    args[key] = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
  }
  return args;
}

function boolArg(args, key, fallback = false) {
  const raw = args[key];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function integerArg(args, key, fallback, minimum = 0) {
  const parsed = Number.parseInt(String(args[key] ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`--${key} must be an integer >= ${minimum}`);
  }
  return parsed;
}

function centralTimestamp(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')} CT (${get('timeZoneName')})`;
}

function fileStamp(date = new Date()) {
  return date.toISOString().replace(/\D/g, '').slice(0, 14);
}

function awsFileUri(filePath) {
  return `file://${path.resolve(filePath).replace(/\\/g, '/')}`;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}: ${stderr || stdout}`));
    });
  });
}

async function awsJson(args) {
  const { stdout } = await runCommand('aws', [...args, '--output', 'json']);
  const trimmed = stdout.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

async function awsNoJson(args) {
  return runCommand('aws', args);
}

function buildRuntimeCachePolicyConfig({
  name = DEFAULT_CACHE_POLICY_NAME,
  minTtl = DEFAULT_MIN_TTL_SECONDS,
  defaultTtl = DEFAULT_DEFAULT_TTL_SECONDS,
  maxTtl = DEFAULT_MAX_TTL_SECONDS,
} = {}) {
  return {
    Comment: 'Short cache for public Zoolanding runtime-bundle GET/HEAD/OPTIONS responses.',
    Name: name,
    DefaultTTL: defaultTtl,
    MaxTTL: maxTtl,
    MinTTL: minTtl,
    ParametersInCacheKeyAndForwardedToOrigin: {
      EnableAcceptEncodingGzip: true,
      EnableAcceptEncodingBrotli: true,
      HeadersConfig: {
        HeaderBehavior: 'none',
      },
      CookiesConfig: {
        CookieBehavior: 'none',
      },
      QueryStringsConfig: {
        QueryStringBehavior: 'all',
      },
    },
  };
}

function findCachePolicy(cachePolicyList, name) {
  const items = cachePolicyList?.CachePolicyList?.Items ?? [];
  return items
    .map(item => item.CachePolicy)
    .find(policy => policy?.CachePolicyConfig?.Name === name) ?? null;
}

function findBehavior(distributionConfig, pathPattern = DEFAULT_PATH_PATTERN) {
  const items = distributionConfig?.CacheBehaviors?.Items ?? [];
  return items.find(behavior => behavior.PathPattern === pathPattern) ?? null;
}

function patchRuntimeBehaviorCachePolicy(distributionConfig, { pathPattern = DEFAULT_PATH_PATTERN, cachePolicyId }) {
  const patched = structuredClone(distributionConfig);
  const behavior = findBehavior(patched, pathPattern);
  if (!behavior) {
    throw new Error(`CloudFront behavior not found for ${pathPattern}`);
  }

  const previousCachePolicyId = behavior.CachePolicyId;
  behavior.CachePolicyId = cachePolicyId;
  return {
    distributionConfig: patched,
    previousCachePolicyId,
    changed: previousCachePolicyId !== cachePolicyId,
    targetOriginId: behavior.TargetOriginId,
    originRequestPolicyId: behavior.OriginRequestPolicyId ?? null,
  };
}

async function getOrCreateCachePolicy({ name, config, apply, workDir }) {
  const existingList = await awsJson(['cloudfront', 'list-cache-policies', '--type', 'custom']);
  const existing = findCachePolicy(existingList, name);
  if (existing) {
    return {
      id: existing.Id,
      created: false,
      existingConfig: existing.CachePolicyConfig,
    };
  }

  const configPath = path.join(workDir, 'runtime-cache-policy.json');
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  if (!apply) {
    return {
      id: `DRY_RUN_CREATE:${name}`,
      created: false,
      plannedCreate: true,
      configPath,
    };
  }

  const created = await awsJson([
    'cloudfront',
    'create-cache-policy',
    '--cache-policy-config',
    awsFileUri(configPath),
  ]);

  return {
    id: created?.CachePolicy?.Id,
    created: true,
    configPath,
  };
}

function renderMarkdown(report) {
  return [
    '# Runtime Front-Door Cache Configuration',
    '',
    `Date: ${report.generatedAtCentral} Central Time`,
    `Distribution: ${report.distributionId}`,
    `Path pattern: ${report.pathPattern}`,
    `Apply: ${report.apply}`,
    `Cache policy: ${report.cachePolicyName}`,
    `Cache policy id: ${report.cachePolicyId}`,
    `Previous cache policy id: ${report.previousCachePolicyId}`,
    `Changed: ${report.changed}`,
    `Backup: ${report.backupPath}`,
    `Patched config: ${report.patchedConfigPath}`,
    report.waitedForDeploy ? 'Waited for distribution deployment: true' : 'Waited for distribution deployment: false',
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = boolArg(args, 'apply', false);
  const wait = boolArg(args, 'wait', false);
  const distributionId = args['distribution-id'] ?? process.env.ZOOLANDING_API_CLOUDFRONT_DISTRIBUTION_ID ?? DEFAULT_DISTRIBUTION_ID;
  const pathPattern = args['path-pattern'] ?? DEFAULT_PATH_PATTERN;
  const cachePolicyName = args['cache-policy-name'] ?? DEFAULT_CACHE_POLICY_NAME;
  const minTtl = integerArg(args, 'min-ttl', DEFAULT_MIN_TTL_SECONDS);
  const defaultTtl = integerArg(args, 'default-ttl', DEFAULT_DEFAULT_TTL_SECONDS);
  const maxTtl = integerArg(args, 'max-ttl', DEFAULT_MAX_TTL_SECONDS);
  const format = String(args.format ?? 'json').toLowerCase();
  const stamp = fileStamp();
  const workDir = path.resolve(args['work-dir'] ?? path.join('logs', 'ops', `cloudfront-runtime-cache-${stamp}`));
  await mkdir(workDir, { recursive: true });

  const cachePolicyConfig = buildRuntimeCachePolicyConfig({
    name: cachePolicyName,
    minTtl,
    defaultTtl,
    maxTtl,
  });
  const cachePolicy = await getOrCreateCachePolicy({
    name: cachePolicyName,
    config: cachePolicyConfig,
    apply,
    workDir,
  });

  if (!cachePolicy.id) {
    throw new Error(`Unable to resolve or create cache policy ${cachePolicyName}`);
  }

  const current = await awsJson(['cloudfront', 'get-distribution-config', '--id', distributionId]);
  const backupPath = path.join(workDir, 'distribution-config-backup.json');
  await writeFile(backupPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

  const patch = patchRuntimeBehaviorCachePolicy(current.DistributionConfig, {
    pathPattern,
    cachePolicyId: cachePolicy.id,
  });
  const patchedConfigPath = path.join(workDir, 'distribution-config-patched.json');
  await writeFile(patchedConfigPath, `${JSON.stringify(patch.distributionConfig, null, 2)}\n`, 'utf8');

  const report = {
    generatedAtCentral: centralTimestamp(),
    distributionId,
    pathPattern,
    apply,
    wait,
    cachePolicyName,
    cachePolicyId: cachePolicy.id,
    cachePolicyCreated: cachePolicy.created,
    plannedCachePolicyCreate: cachePolicy.plannedCreate ?? false,
    previousCachePolicyId: patch.previousCachePolicyId,
    targetOriginId: patch.targetOriginId,
    originRequestPolicyId: patch.originRequestPolicyId,
    changed: patch.changed,
    backupPath,
    patchedConfigPath,
    waitedForDeploy: false,
  };

  if (apply && patch.changed) {
    await awsNoJson([
      'cloudfront',
      'update-distribution',
      '--id',
      distributionId,
      '--if-match',
      current.ETag,
      '--distribution-config',
      awsFileUri(patchedConfigPath),
    ]);
  }

  if (apply && wait) {
    await awsNoJson(['cloudfront', 'wait', 'distribution-deployed', '--id', distributionId]);
    report.waitedForDeploy = true;
  }

  const output = format === 'markdown' ? renderMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`;
  process.stdout.write(output);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  DEFAULT_CACHE_POLICY_NAME,
  DEFAULT_DISTRIBUTION_ID,
  DEFAULT_PATH_PATTERN,
  buildRuntimeCachePolicyConfig,
  centralTimestamp,
  findBehavior,
  findCachePolicy,
  parseArgs,
  patchRuntimeBehaviorCachePolicy,
};
