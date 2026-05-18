import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_OWNER = 'LynxPardelle';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_AUTHORING_API_ID = '2dvjmiwjod';
const DEFAULT_AUTHORING_FUNCTION_NAME = 'zoolanding-config-authorin-ConfigAuthoringFunction-AjQO0sTiyOev';
const GITHUB_OIDC_URL = 'https://token.actions.githubusercontent.com';
const GITHUB_OIDC_HOST = 'token.actions.githubusercontent.com';
const GITHUB_OIDC_THUMBPRINTS = [
  '6938fd4d98bab03faadb97b34396831e3780aea1',
  '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
];
const DEPLOY_ACTIONS = ['createSite', 'upsertDraft', 'publishDraft', 'getSite'];

function parseArgs(rawArgs) {
  const args = {};
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    args[rawKey.trim()] = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
  }
  return args;
}

function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function normalizeDomain(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split(':', 1)[0]
    .replace(/^\/+|\/+$/g, '');
}

function domainSlug(domain) {
  return normalizeDomain(domain).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function repoNameForDomain(domain) {
  return `draft-${domainSlug(domain)}`;
}

function roleNameFor(domain, environment) {
  return `draft-${domainSlug(domain)}-${environment}-deploy`;
}

async function awsJson(args, options = {}) {
  const result = await execFileAsync('aws', [...args, '--output', 'json'], { windowsHide: true, ...options });
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

async function awsText(args, options = {}) {
  const result = await execFileAsync('aws', args, { windowsHide: true, ...options });
  return result.stdout.trim();
}

async function readSiteConfigs(draftsRoot) {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(draftsRoot, { withFileTypes: true });
  const configs = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const filePath = path.join(draftsRoot, entry.name, 'site-config.json');
    try {
      const config = JSON.parse(await readFile(filePath, 'utf8'));
      const domain = normalizeDomain(config.domain || entry.name);
      if (domain) {
        configs.push({ domain, repo: repoNameForDomain(domain) });
      }
    } catch {
      // Ignore incomplete local draft folders.
    }
  }
  return configs.sort((a, b) => a.domain.localeCompare(b.domain));
}

async function getAccountId() {
  const identity = await awsJson(['sts', 'get-caller-identity']);
  return String(identity.Account || '').trim();
}

function oidcProviderArn(accountId) {
  return `arn:aws:iam::${accountId}:oidc-provider/${GITHUB_OIDC_HOST}`;
}

async function ensureOidcProvider({ accountId, apply }) {
  const providerArn = oidcProviderArn(accountId);
  const providers = await awsJson(['iam', 'list-open-id-connect-providers']);
  const exists = Array.isArray(providers.OpenIDConnectProviderList)
    && providers.OpenIDConnectProviderList.some(provider => provider.Arn === providerArn);
  if (exists || !apply) {
    return { arn: providerArn, created: false, exists };
  }

  await awsText([
    'iam',
    'create-open-id-connect-provider',
    '--url',
    GITHUB_OIDC_URL,
    '--client-id-list',
    'sts.amazonaws.com',
    '--thumbprint-list',
    ...GITHUB_OIDC_THUMBPRINTS,
  ]);
  return { arn: providerArn, created: true, exists: true };
}

function trustPolicy({ providerArn, owner, repo, environment }) {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Federated: providerArn },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          StringEquals: {
            [`${GITHUB_OIDC_HOST}:aud`]: 'sts.amazonaws.com',
            [`${GITHUB_OIDC_HOST}:sub`]: `repo:${owner}/${repo}:environment:${environment}`,
          },
        },
      },
    ],
  };
}

function invokePolicy({ accountId, region, authoringApiId, authoringFunctionName }) {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'execute-api:Invoke',
        Resource: `arn:aws:execute-api:${region}:${accountId}:${authoringApiId}/Prod/POST/*`,
      },
      {
        Effect: 'Allow',
        Action: 'lambda:InvokeFunctionUrl',
        Resource: `arn:aws:lambda:${region}:${accountId}:function:${authoringFunctionName}`,
        Condition: {
          StringEquals: {
            'lambda:FunctionUrlAuthType': 'AWS_IAM',
          },
        },
      },
      {
        Effect: 'Allow',
        Action: 'lambda:InvokeFunction',
        Resource: `arn:aws:lambda:${region}:${accountId}:function:${authoringFunctionName}`,
        Condition: {
          Bool: {
            'lambda:InvokedViaFunctionUrl': 'true',
          },
        },
      },
    ],
  };
}

async function roleExists(roleName) {
  try {
    await awsJson(['iam', 'get-role', '--role-name', roleName]);
    return true;
  } catch {
    return false;
  }
}

async function ensureRole({
  accountId,
  providerArn,
  owner,
  region,
  authoringApiId,
  authoringFunctionName,
  domain,
  repo,
  environment,
  apply,
}) {
  const roleName = roleNameFor(domain, environment);
  const trust = trustPolicy({ providerArn, owner, repo, environment });
  const policy = invokePolicy({ accountId, region, authoringApiId, authoringFunctionName });
  const exists = await roleExists(roleName);

  if (apply) {
    const trustFile = path.join(process.cwd(), `.tmp-${roleName}-trust.json`);
    const policyFile = path.join(process.cwd(), `.tmp-${roleName}-policy.json`);
    await writeFile(trustFile, JSON.stringify(trust, null, 2), 'utf8');
    await writeFile(policyFile, JSON.stringify(policy, null, 2), 'utf8');
    try {
      if (exists) {
        await awsText(['iam', 'update-assume-role-policy', '--role-name', roleName, '--policy-document', `file://${trustFile}`]);
      } else {
        await awsText(['iam', 'create-role', '--role-name', roleName, '--assume-role-policy-document', `file://${trustFile}`]);
      }
      await awsText([
        'iam',
        'put-role-policy',
        '--role-name',
        roleName,
        '--policy-name',
        'InvokeConfigAuthoring',
        '--policy-document',
        `file://${policyFile}`,
      ]);
    } finally {
      const { rm } = await import('node:fs/promises');
      await rm(trustFile, { force: true });
      await rm(policyFile, { force: true });
    }
  }

  return {
    roleName,
    roleArn: `arn:aws:iam::${accountId}:role/${roleName}`,
    repo,
    domain,
    environment,
    existed: exists,
    changed: apply,
  };
}

function deployAuthzConfig(roles) {
  return roles.map(role => ({
    roleName: role.roleName,
    domains: [role.domain],
    environments: [role.environment],
    actions: DEPLOY_ACTIONS,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = truthy(args.apply);
  const owner = args.owner || DEFAULT_OWNER;
  const region = args.region || DEFAULT_REGION;
  const authoringApiId = args['authoring-api-id'] || DEFAULT_AUTHORING_API_ID;
  const authoringFunctionName = args['authoring-function-name'] || DEFAULT_AUTHORING_FUNCTION_NAME;
  const draftsRoot = path.resolve(args['drafts-root'] || 'drafts');
  const accountId = await getAccountId();
  const provider = await ensureOidcProvider({ accountId, apply });
  const drafts = await readSiteConfigs(draftsRoot);
  const roles = [];

  for (const draft of drafts) {
    for (const environment of ['test', 'production']) {
      roles.push(await ensureRole({
        accountId,
        providerArn: provider.arn,
        owner,
        region,
        authoringApiId,
        authoringFunctionName,
        domain: draft.domain,
        repo: draft.repo,
        environment,
        apply,
      }));
    }
  }

  const result = {
    ok: true,
    apply,
    accountId,
    owner,
    region,
    authoringApiId,
    authoringFunctionName,
    oidcProvider: provider,
    roles,
    deployAuthzConfig: deployAuthzConfig(roles),
  };
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { deployAuthzConfig, domainSlug, readSiteConfigs, roleNameFor, trustPolicy };
