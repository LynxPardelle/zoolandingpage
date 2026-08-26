import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildRemoteUpdateScript,
  buildRoute53ChangeBatch,
  collectManagedAliases,
  extractManagedAliasesFromConfig,
  isManagedAlias,
  parseArgs,
  renderTraefikDynamicConfig,
  renderTraefikRouterBlock,
} from '../ops/sync-managed-alias-front-door.mjs';

test('parseArgs supports repeated filters and apply alias', () => {
  const args = parseArgs([
    '--domain=example.com,other.com',
    '--domain=third.com',
    '--entrypoint=websecure',
    '--entrypoint=websecure-alt',
    '--apply',
  ]);

  assert.deepEqual(args.domain, ['example.com', 'other.com', 'third.com']);
  assert.deepEqual(args.entrypoint, ['websecure', 'websecure-alt']);
  assert.equal(args['dry-run'], 'false');
});

test('isManagedAlias accepts subdomains of the managed zone only', () => {
  assert.equal(isManagedAlias('desk.zoolandingpage.com.mx'), true);
  assert.equal(isManagedAlias('zoolandingpage.com.mx'), false);
  assert.equal(isManagedAlias('desk.example.com'), false);
});

test('extractManagedAliasesFromConfig reads production and environment aliases', () => {
  const aliases = extractManagedAliasesFromConfig({
    config: {
      domain: 'example.com',
      aliases: ['desk.zoolandingpage.com.mx', 'desk.example.com'],
      environments: {
        test: {
          aliases: ['test.desk.zoolandingpage.com.mx'],
        },
      },
    },
    source: 'site-config.json',
  });

  assert.deepEqual(aliases.map(alias => [alias.host, alias.environment]), [
    ['desk.zoolandingpage.com.mx', 'production'],
    ['test.desk.zoolandingpage.com.mx', 'test'],
  ]);
});

test('collectManagedAliases scans registry draft repos and deduplicates hosts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-managed-aliases-'));
  const hub = path.join(root, 'zoolandingpage');
  const draft = path.join(hub, 'drafts', 'example.com');
  await mkdir(path.join(hub, 'docs'), { recursive: true });
  await mkdir(draft, { recursive: true });
  await writeFile(path.join(hub, 'docs', 'drafts-registry.json'), JSON.stringify({
    version: 1,
    owner: 'example',
    defaultBaseDir: 'drafts',
    drafts: [
      {
        domain: 'example.com',
        repo: 'draft-example-com',
        githubUrl: 'https://github.com/example/draft-example-com.git',
        localPath: 'drafts/example.com',
      },
    ],
  }), 'utf8');
  await writeFile(path.join(draft, 'site-config.json'), JSON.stringify({
    domain: 'example.com',
    aliases: ['desk.zoolandingpage.com.mx'],
    environments: {
      test: {
        aliases: ['test.desk.zoolandingpage.com.mx', 'desk.zoolandingpage.com.mx'],
      },
    },
  }), 'utf8');

  const result = await collectManagedAliases({ cwd: hub, includeDraftsRoot: false });

  assert.deepEqual(result.aliases.map(alias => [alias.host, alias.environment]), [
    ['desk.zoolandingpage.com.mx', 'production'],
    ['test.desk.zoolandingpage.com.mx', 'test'],
  ]);
});

test('collectManagedAliases excludes production aliases for a test-only registry draft', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-managed-aliases-test-only-'));
  const hub = path.join(root, 'hub');
  const draft = path.join(hub, 'drafts', 'thehairnarrative.com');
  await mkdir(path.join(hub, 'docs'), { recursive: true });
  await mkdir(draft, { recursive: true });
  await writeFile(path.join(hub, 'docs', 'drafts-registry.json'), JSON.stringify({
    version: 2,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'thehairnarrative.com',
      owner: 'Toydrum',
      repo: 'draft-thehairnarrative-com',
      githubUrl: 'https://github.com/Toydrum/draft-thehairnarrative-com.git',
      localPath: 'drafts/thehairnarrative.com',
      deploymentEnvironments: ['test'],
    }],
  }), 'utf8');
  await writeFile(path.join(draft, 'site-config.json'), JSON.stringify({
    domain: 'thehairnarrative.com',
    aliases: ['hair.zoolandingpage.com.mx'],
    environments: {
      test: { aliases: ['test.hair.zoolandingpage.com.mx'] },
      production: { aliases: ['prod.hair.zoolandingpage.com.mx'] },
    },
  }), 'utf8');

  const all = await collectManagedAliases({ cwd: hub, includeDraftsRoot: false });
  assert.deepEqual(all.aliases.map(alias => [alias.host, alias.environment]), [
    ['test.hair.zoolandingpage.com.mx', 'test'],
  ]);

  const production = await collectManagedAliases({
    cwd: hub,
    includeDraftsRoot: false,
    environment: 'production',
  });
  assert.deepEqual(production.aliases, []);
  assert.deepEqual(production.scanned, []);

  const explicit = await collectManagedAliases({
    cwd: hub,
    explicitConfigs: [path.join('drafts', 'thehairnarrative.com', 'site-config.json')],
    includeDraftsRoot: false,
  });
  assert.deepEqual(explicit.aliases.map(alias => [alias.host, alias.environment]), [
    ['test.hair.zoolandingpage.com.mx', 'test'],
  ]);

  const explicitProduction = await collectManagedAliases({
    cwd: hub,
    explicitConfigs: [path.join('drafts', 'thehairnarrative.com', 'site-config.json')],
    includeDraftsRoot: false,
    environment: 'production',
  });
  assert.deepEqual(explicitProduction.aliases, []);

  const copiedConfig = path.join(hub, 'review-copy', 'hair-site-config.json');
  await mkdir(path.dirname(copiedConfig), { recursive: true });
  await writeFile(copiedConfig, JSON.stringify({
    domain: 'thehairnarrative.com',
    aliases: ['hair.zoolandingpage.com.mx'],
    environments: {
      test: { aliases: ['test.hair.zoolandingpage.com.mx'] },
      production: { aliases: ['prod.hair.zoolandingpage.com.mx'] },
    },
  }), 'utf8');
  const copiedProduction = await collectManagedAliases({
    cwd: hub,
    explicitConfigs: [path.relative(hub, copiedConfig)],
    includeDraftsRoot: false,
    environment: 'production',
  });
  assert.deepEqual(copiedProduction.aliases, []);
});

test('collectManagedAliases rejects production scope when registry discovery is disabled', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-managed-aliases-unscoped-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const configPath = path.join(root, 'site-config.json');
  await writeFile(configPath, JSON.stringify({
    domain: 'thehairnarrative.com',
    aliases: ['hair.zoolandingpage.com.mx'],
    environments: {
      production: { aliases: ['prod.hair.zoolandingpage.com.mx'] },
    },
  }), 'utf8');

  await assert.rejects(
    collectManagedAliases({
      cwd: root,
      explicitConfigs: [configPath],
      includeRegistry: false,
      includeDraftsRoot: false,
      environment: 'production',
    }),
    /deployment_scope_unknown:thehairnarrative\.com/,
  );
});

test('collectManagedAliases rejects a registered config that impersonates another draft domain', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-managed-aliases-domain-swap-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const hairDraft = path.join(root, 'drafts', 'thehairnarrative.com');
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await mkdir(hairDraft, { recursive: true });
  await writeFile(path.join(root, 'docs', 'drafts-registry.json'), JSON.stringify({
    version: 2,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [
      {
        domain: 'example.com',
        repo: 'draft-example-com',
        githubUrl: 'https://github.com/LynxPardelle/draft-example-com.git',
        localPath: 'drafts/example.com',
        deploymentEnvironments: ['test', 'production'],
      },
      {
        domain: 'thehairnarrative.com',
        owner: 'Toydrum',
        repo: 'draft-thehairnarrative-com',
        githubUrl: 'https://github.com/Toydrum/draft-thehairnarrative-com.git',
        localPath: 'drafts/thehairnarrative.com',
        deploymentEnvironments: ['test'],
      },
    ],
  }), 'utf8');
  await writeFile(path.join(hairDraft, 'site-config.json'), JSON.stringify({
    domain: 'example.com',
    aliases: ['escaped-production.zoolandingpage.com.mx'],
  }), 'utf8');

  await assert.rejects(
    collectManagedAliases({ cwd: root, includeDraftsRoot: false }),
    /registry_domain_mismatch:thehairnarrative\.com:example\.com/,
  );
});

test('renderTraefikDynamicConfig emits routers and shared service', () => {
  const yaml = renderTraefikDynamicConfig({
    aliases: [{ host: 'desk.zoolandingpage.com.mx' }],
    upstreamUrl: 'http://zoolandingpage-test:4000',
    generatedAtCentral: '2026-05-19 12:00:00 CT (GMT-6)',
  });

  assert.match(yaml, /zlp-managed-desk-zoolandingpage-com-mx:/);
  assert.match(yaml, /zlp-managed-desk-zoolandingpage-com-mx-secure:/);
  assert.match(yaml, /rule: "Host\(`desk\.zoolandingpage\.com\.mx`\)"/);
  assert.match(yaml, /- "zlp-https-redirect@file"/);
  assert.match(yaml, /redirectScheme:/);
  assert.match(yaml, /permanent: true/);
  assert.match(yaml, /certResolver: "letsencrypt"/);
  assert.match(yaml, /url: "http:\/\/zoolandingpage-test:4000"/);
});

test('buildRoute53ChangeBatch upserts A records', () => {
  const batch = buildRoute53ChangeBatch({
    aliases: [{ host: 'desk.zoolandingpage.com.mx' }],
    targetIp: '203.0.113.10',
    ttlSeconds: 60,
    comment: 'test',
  });

  assert.equal(batch.Changes[0].Action, 'UPSERT');
  assert.equal(batch.Changes[0].ResourceRecordSet.Name, 'desk.zoolandingpage.com.mx.');
  assert.equal(batch.Changes[0].ResourceRecordSet.ResourceRecords[0].Value, '203.0.113.10');
});

test('buildRemoteUpdateScript backs up before writing target file', () => {
  const script = buildRemoteUpdateScript({
    remoteFile: '/etc/dokploy/traefik/dynamic/zoolandingpage.yml',
    yamlContent: 'http:\n',
  });

  assert.match(script, /cp -p "\$target" "\$backup_path"/);
  assert.match(script, /base64 -d > "\$tmp"/);
  assert.match(script, /mv "\$tmp" "\$target"/);
});

test('renderTraefikRouterBlock emits replaceable web and websecure routers', () => {
  const block = renderTraefikRouterBlock({
    aliases: [{ host: 'test.desk.zoolandingpage.com.mx' }],
    serviceName: 'zoolandingpage-test-service',
    routerName: 'zlp-test-aliases',
    blockLabel: 'draft test aliases',
  });

  assert.match(block, /# Managed by Codex: draft test aliases begin/);
  assert.match(block, /zlp-test-aliases:/);
  assert.match(block, /zlp-test-aliases-secure:/);
  assert.match(block, /rule: Host\(`test\.desk\.zoolandingpage\.com\.mx`\)/);
  assert.match(block, /- zlp-https-redirect@file/);
  assert.match(block, /certResolver: letsencrypt/);
});

test('buildRemoteUpdateScript can patch only a managed router block', () => {
  const script = buildRemoteUpdateScript({
    remoteFile: '/etc/dokploy/traefik/dynamic/zoolandingpage.yml',
    routerBlock: '    # Managed by Codex: draft test aliases begin\n    # Managed by Codex: draft test aliases end',
    blockLabel: 'draft test aliases',
    mode: 'router-block',
  });

  assert.match(script, /start_marker='    # Managed by Codex: draft test aliases begin'/);
  assert.match(script, /cp -p "\$target" "\$backup_path"/);
  assert.match(script, /could not find top-level http routers section/);
});

test('CLI dry run creates parent directories for output files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-managed-alias-cli-'));
  const configPath = path.join(root, 'site-config.json');
  const outputPath = path.join(root, 'logs', 'ops', 'plan.json');
  const traefikOutputPath = path.join(root, 'logs', 'ops', 'traefik.yml');
  const registryPath = path.join(root, 'docs', 'drafts-registry.json');
  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(registryPath, JSON.stringify({
    version: 2,
    owner: 'example',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'example.com',
      repo: 'draft-example-com',
      githubUrl: 'https://github.com/example/draft-example-com.git',
      localPath: 'drafts/example.com',
      deploymentEnvironments: ['test', 'production'],
    }],
  }), 'utf8');
  await writeFile(configPath, JSON.stringify({
    domain: 'example.com',
    aliases: ['desk.zoolandingpage.com.mx'],
  }), 'utf8');

  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [
    path.resolve(import.meta.dirname, '../ops/sync-managed-alias-front-door.mjs'),
    `--config=${configPath}`,
    '--include-drafts-root=false',
    '--target-ip=203.0.113.10',
    '--upstream-url=http://zoolandingpage-test:4000',
    `--output=${outputPath}`,
    `--traefik-output=${traefikOutputPath}`,
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(outputPath, 'utf8'), /desk\.zoolandingpage\.com\.mx/);
  assert.match(await readFile(traefikOutputPath, 'utf8'), /Host\(`desk\.zoolandingpage\.com\.mx`\)/);
});

test('CLI rejects production apply when --registry=false disables canonical scope', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-managed-alias-cli-unscoped-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const configPath = path.join(root, 'site-config.json');
  await writeFile(configPath, JSON.stringify({
    domain: 'thehairnarrative.com',
    aliases: ['hair.zoolandingpage.com.mx'],
  }), 'utf8');

  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [
    path.resolve(import.meta.dirname, '../ops/sync-managed-alias-front-door.mjs'),
    `--config=${configPath}`,
    '--registry=false',
    '--include-drafts-root=false',
    '--environment=production',
    '--skip-route53=true',
    '--skip-traefik=true',
    '--apply',
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /canonical_draft_registry_required_for_production_apply/);
});
