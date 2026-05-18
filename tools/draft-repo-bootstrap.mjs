import { constants } from 'node:fs';
import { access, cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TEMPLATE_ROOT = path.resolve('tools/templates/draft-repo');

const DEFAULT_GITIGNORE = `# Local-only draft context
ai_notes/
findings/
errors-reports/
CVs_N_photos/
devonly/
logs/
reports/
Output/
.superpowers/
.codex/
.agents/

# Secrets and private local files
.env
.env.*
*.pem
*.key
*.p12
*.pfx
*.crt
*.cer
*.cert
id_rsa
id_rsa.*
id_ed25519
id_ed25519.*
*.kdbx
.npmrc
.pypirc
.netrc
.aws/
.azure/
.gcp/
google-credentials*.json
*service-account*.json
*credentials*.json
*secret*.json

# Local databases and exports
*.sqlite
*.sqlite3
*.db
*.dump
*.bak

# PII/source material that must be reviewed before publishing
*.pdf
*.doc
*.docx
*.xls
*.xlsx
*.ppt
*.pptx
*.zip
*.7z
*.rar
*.tar
*.gz

# Runtime noise
node_modules/
dist/
.cache/
coverage/
.DS_Store
Thumbs.db
`;

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

function required(value, name) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function writeIfMissing(filePath, content, force) {
  if (!force && await exists(filePath)) {
    return false;
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
  return true;
}

async function bootstrapDraftRepo({
  repoPath,
  domain,
  authoringEndpoint,
  awsRegion,
  force = false,
  forceTemplates = force,
  forceGitignore = force,
}) {
  const resolvedRepo = path.resolve(repoPath);
  await mkdir(resolvedRepo, { recursive: true });
  await cp(TEMPLATE_ROOT, resolvedRepo, { recursive: true, force: forceTemplates, errorOnExist: false });

  const config = {
    domain,
    authoringEndpoint,
    awsRegion,
    branches: {
      dev: { deploys: false },
      test: { deploys: true, environment: 'test' },
      main: { deploys: true, environment: 'production' },
    },
    githubVariables: {
      test: ['AWS_ROLE_ARN', 'AWS_REGION', 'DRAFT_DOMAIN', 'DRAFT_ROOT', 'AUTHORING_ENDPOINT'],
      production: ['AWS_ROLE_ARN', 'AWS_REGION', 'DRAFT_DOMAIN', 'DRAFT_ROOT', 'AUTHORING_ENDPOINT'],
    },
  };

  const wroteGitignore = await writeIfMissing(path.join(resolvedRepo, '.gitignore'), DEFAULT_GITIGNORE, forceGitignore);
  const wroteConfig = await writeIfMissing(
    path.join(resolvedRepo, 'draft-repo.config.json'),
    `${JSON.stringify(config, null, 2)}\n`,
    force,
  );

  return {
    repoPath: resolvedRepo,
    domain,
    wroteGitignore,
    wroteConfig,
    copiedTemplateRoot: TEMPLATE_ROOT,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await bootstrapDraftRepo({
    repoPath: required(args.repo, '--repo'),
    domain: required(args.domain, '--domain'),
    authoringEndpoint: required(args['authoring-endpoint'] ?? process.env.AUTHORING_ENDPOINT, '--authoring-endpoint'),
    awsRegion: args.region ?? process.env.AWS_REGION ?? 'us-east-1',
    force: truthy(args.force),
  });
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { bootstrapDraftRepo, parseArgs };
