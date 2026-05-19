import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
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
  const draft = path.join(root, 'draft-example-com');
  await mkdir(path.join(hub, 'docs'), { recursive: true });
  await mkdir(draft, { recursive: true });
  await writeFile(path.join(hub, 'docs', 'drafts-registry.json'), JSON.stringify({
    version: 1,
    defaultBaseDir: '..',
    drafts: [
      {
        domain: 'example.com',
        repo: 'draft-example-com',
        githubUrl: 'https://github.com/example/draft-example-com.git',
        localPath: '../draft-example-com',
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

test('renderTraefikDynamicConfig emits routers and shared service', () => {
  const yaml = renderTraefikDynamicConfig({
    aliases: [{ host: 'desk.zoolandingpage.com.mx' }],
    upstreamUrl: 'http://zoolandingpage-test:4000',
    generatedAtCentral: '2026-05-19 12:00:00 CT (GMT-6)',
  });

  assert.match(yaml, /rule: "Host\(`desk\.zoolandingpage\.com\.mx`\)"/);
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
