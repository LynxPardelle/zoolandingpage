import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { link, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function rejectsUnsafe(error, kind) {
  return new RegExp(`Refusing to (?:use|write) unsafe ${kind}`).test(String(error?.stderr ?? ''));
}

function runConfigSync(args) {
  return execFileAsync(process.execPath, ['tools/config-draft-sync.mjs', ...args], {
    cwd: path.resolve('.'),
    windowsHide: true,
  });
}

function assertUnsafeConfigSync(args, kind) {
  return assert.rejects(runConfigSync(args), error => rejectsUnsafe(error, kind));
}

test('config-draft-sync packs server-only draft files without page ids', async () => {
  const draftsRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-pack-'));
  const domainRoot = path.join(draftsRoot, 'example.com');
  await mkdir(path.join(domainRoot, 'server'), { recursive: true });
  await writeFile(path.join(domainRoot, 'site-config.json'), '{"version":1}', 'utf8');
  await writeFile(path.join(domainRoot, 'draft-repo.config.json'), '{"domain":"example.com"}', 'utf8');
  await writeFile(path.join(domainRoot, 'server', 'auth-profile-registry.json'), '{"version":1,"profiles":[]}', 'utf8');
  await writeFile(path.join(domainRoot, 'server', 'integrations.json'), '{"version":1,"sources":[],"actions":[]}', 'utf8');
  for (const name of ['commerce.json', 'data-spaces.json', 'integration-bindings.json', 'notification-policies.json']) {
    await writeFile(path.join(domainRoot, 'server', name), '{"version":1}', 'utf8');
  }

  const outputPath = path.join(draftsRoot, 'package.json');
  await execFileAsync(
    process.execPath,
    [
      'tools/config-draft-sync.mjs',
      'pack',
      '--domain=example.com',
      `--drafts-root=${draftsRoot}`,
      `--output=${outputPath}`,
    ],
    { cwd: path.resolve('.'), windowsHide: true }
  );

  const draftPackage = JSON.parse(await readFile(outputPath, 'utf8'));
  assert.equal(
    draftPackage.files.some(file => file.path === 'example.com/draft-repo.config.json'),
    false
  );
  assert.deepEqual(
    draftPackage.files
      .filter(file => file.path.includes('/server/'))
      .map(file => ({ path: file.path, kind: file.kind, pageId: file.pageId })),
    [
      {
        path: 'example.com/server/auth-profile-registry.json',
        kind: 'server-auth-profile-registry',
        pageId: undefined,
      },
      {
        path: 'example.com/server/commerce.json',
        kind: 'server-commerce',
        pageId: undefined,
      },
      {
        path: 'example.com/server/data-spaces.json',
        kind: 'server-data-spaces',
        pageId: undefined,
      },
      {
        path: 'example.com/server/integration-bindings.json',
        kind: 'server-integration-bindings',
        pageId: undefined,
      },
      {
        path: 'example.com/server/integrations.json',
        kind: 'server-integrations',
        pageId: undefined,
      },
      {
        path: 'example.com/server/notification-policies.json',
        kind: 'server-notification-policies',
        pageId: undefined,
      },
    ]
  );
});

test('config-draft-sync rejects unknown server descriptors', async t => {
  const draftsRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-server-kind-'));
  t.after(() => rm(draftsRoot, { recursive: true, force: true }));
  const domainRoot = path.join(draftsRoot, 'example.com');
  await mkdir(path.join(domainRoot, 'server'), { recursive: true });
  await writeFile(path.join(domainRoot, 'site-config.json'), '{"version":1}', 'utf8');
  await writeFile(path.join(domainRoot, 'server', 'unknown.json'), '{"version":1}', 'utf8');

  await assert.rejects(
    runConfigSync([
      'pack',
      '--domain=example.com',
      `--drafts-root=${draftsRoot}`,
      `--output=${path.join(draftsRoot, 'package.json')}`,
    ]),
    /unknown_server_descriptor/,
  );
});

test('config-draft-sync publish forwards explicit environment', async t => {
  let capturedBody = null;
  const server = http.createServer((request, response) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', chunk => {
      raw += chunk;
    });
    request.on('end', () => {
      capturedBody = JSON.parse(raw);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true, environment: capturedBody.environment }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const endpoint = `http://127.0.0.1:${server.address().port}/config-authoring`;
  await execFileAsync(
    process.execPath,
    [
      'tools/config-draft-sync.mjs',
      'publish',
      `--endpoint=${endpoint}`,
      '--domain=example.com',
      '--environment=test',
      '--version-id=version-1',
    ],
    { cwd: path.resolve('.'), windowsHide: true }
  );

  assert.equal(capturedBody.action, 'publishDraft');
  assert.equal(capturedBody.domain, 'example.com');
  assert.equal(capturedBody.environment, 'test');
  assert.equal(capturedBody.versionId, 'version-1');
});

test('dev mutations are local-only and make zero authoring requests', async t => {
  let requestCount = 0;
  const server = http.createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(500);
    response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-dev-local-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  await writeJson(path.join(tempRoot, 'example.com', 'site-config.json'), { version: 1 });
  const endpoint = `http://127.0.0.1:${server.address().port}/config-authoring`;

  for (const command of ['push', 'create', 'publish']) {
    await assert.rejects(
      runConfigSync([
        command,
        `--endpoint=${endpoint}`,
        '--domain=example.com',
        '--environment=dev',
        `--drafts-root=${tempRoot}`,
      ]),
      /dev environment is local-only/,
    );
  }
  assert.equal(requestCount, 0);
});

test('remote mutations require an explicit environment and make zero authoring requests when omitted', async t => {
  let requestCount = 0;
  const server = http.createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(500);
    response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-required-environment-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  await writeJson(path.join(tempRoot, 'example.com', 'site-config.json'), { version: 1 });
  const endpoint = `http://127.0.0.1:${server.address().port}/config-authoring`;

  for (const command of ['push', 'create', 'publish']) {
    await assert.rejects(
      runConfigSync([
        command,
        `--endpoint=${endpoint}`,
        '--domain=example.com',
        `--drafts-root=${tempRoot}`,
      ]),
      /Missing required argument --environment/,
    );
  }
  assert.equal(requestCount, 0);
});

test('dev remote reads explicitly map to the test environment', async t => {
  let capturedBody = null;
  const server = http.createServer((request, response) => {
    let raw = '';
    request.setEncoding('utf8');
    request.on('data', chunk => { raw += chunk; });
    request.on('end', () => {
      capturedBody = JSON.parse(raw);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        version: 1,
        domain: 'example.com',
        environment: 'test',
        stage: 'draft',
        files: [],
      }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-dev-read-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  await runConfigSync([
    'pull',
    `--endpoint=http://127.0.0.1:${server.address().port}/config-authoring`,
    '--domain=example.com',
    '--environment=dev',
    `--drafts-root=${tempRoot}`,
  ]);

  assert.equal(capturedBody.environment, 'test');
});

test('pull rejects a crossed authoring scope before cleaning or writing any draft', async t => {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      version: 1,
      domain: 'other.example.com',
      environment: 'test',
      stage: 'draft',
      files: [{
        path: 'other.example.com/site-config.json',
        content: { state: 'crossed-response' },
      }],
    }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-crossed-pull-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  const preservedPath = path.join(tempRoot, 'other.example.com', 'preserved.json');
  await writeJson(preservedPath, { state: 'preserved' });

  await assert.rejects(
    runConfigSync([
      'pull',
      `--endpoint=http://127.0.0.1:${server.address().port}/config-authoring`,
      '--domain=example.com',
      '--environment=test',
      `--drafts-root=${tempRoot}`,
      '--clean-domain=true',
    ]),
    /Authoring response scope mismatch/,
  );
  assert.deepEqual(JSON.parse(await readFile(preservedPath, 'utf8')), { state: 'preserved' });
  await assert.rejects(readFile(path.join(tempRoot, 'other.example.com', 'site-config.json'), 'utf8'));
});

test('config-draft-sync pack rejects a domain that escapes the drafts root', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-pack-containment-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const draftsRoot = path.join(tempRoot, 'drafts');
  const escapedDomainRoot = path.join(tempRoot, 'escaped.example.com');
  const outputPath = path.join(tempRoot, 'package.json');
  await writeJson(path.join(escapedDomainRoot, 'site-config.json'), { version: 1 });

  await assertUnsafeConfigSync(
    ['pack', '--domain=../escaped.example.com', `--drafts-root=${draftsRoot}`, `--output=${outputPath}`],
    'domain'
  );
});

test('config-draft-sync pack does not silently trim a padded domain', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-pack-domain-padding-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const draftsRoot = path.join(tempRoot, 'drafts');
  await writeJson(path.join(draftsRoot, 'example.com', 'site-config.json'), { version: 1 });

  for (const [index, domain] of [' example.com', 'example.com '].entries()) {
    await assertUnsafeConfigSync(
      [
        'pack',
        `--domain=${domain}`,
        `--drafts-root=${draftsRoot}`,
        `--output=${path.join(tempRoot, `package-${index}.json`)}`,
      ],
      'domain'
    );
  }
});

test('config-draft-sync unpack rejects unsafe domain forms', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-domain-containment-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const unsafeDomains = [
    ['parent escape', '..'],
    ['dot segment', 'nested/../example.com'],
    ['posix absolute', '/absolute.example.com'],
    ['drive absolute', 'C:/absolute.example.com'],
    ['drive relative', 'C:relative.example.com'],
    ['backslash', 'nested\\example.com'],
    ['mixed separators', 'nested\\child/example.com'],
    ['scheme', 'https://example.com'],
    ['scheme without slashes', 'https:example.com'],
    ['userinfo', 'user@example.com'],
    ['port', 'example.com:443'],
    ['query', 'example.com?draft=true'],
    ['fragment', 'example.com#draft'],
    ['leading space', ' example.com'],
    ['trailing space', 'example.com '],
    ['embedded space', 'exam ple.com'],
    ['leading empty label', '.example.com'],
    ['empty middle label', 'example..com'],
    ['trailing empty label', 'example.com.'],
    ['underscore', 'example_site.com'],
    ['leading hyphen', '-example.com'],
    ['trailing hyphen', 'example-.com'],
    ['overlong label', `${'a'.repeat(64)}.com`],
    ['overlong hostname', `${'a'.repeat(63)}.${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`],
    ['non-string', 123.456],
    ['windows device name', 'con.com'],
    ['uppercase hostname', 'Example.com'],
  ];

  for (const [index, [name, domain]] of unsafeDomains.entries()) {
    await t.test(name, async () => {
      const packagePath = path.join(tempRoot, `domain-${index}.json`);
      await writeJson(packagePath, { version: 1, domain, stage: 'draft', files: [] });

      await assertUnsafeConfigSync(
        ['unpack', `--input=${packagePath}`, `--drafts-root=${path.join(tempRoot, `drafts-${index}`)}`],
        'domain'
      );
    });
  }
});

test('config-draft-sync unpack accepts every registered draft hostname', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-registered-domains-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const registry = JSON.parse(await readFile(path.resolve('docs/drafts-registry.json'), 'utf8'));
  for (const [index, { domain }] of registry.drafts.entries()) {
    await t.test(domain, async () => {
      const packagePath = path.join(tempRoot, `domain-${index}.json`);
      await writeJson(packagePath, { version: 1, domain, stage: 'draft', files: [] });
      await runConfigSync([
        'unpack',
        `--input=${packagePath}`,
        `--drafts-root=${path.join(tempRoot, `drafts-${index}`)}`,
      ]);
    });
  }
});

test('config-draft-sync unpack rejects unsafe file path forms', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-path-containment-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const unsafePaths = [
    ['parent escape', 'example.com/../outside.json'],
    ['dot segment', 'example.com/./site-config.json'],
    ['posix absolute', '/example.com/site-config.json'],
    ['drive absolute', 'C:/example.com/site-config.json'],
    ['drive relative', 'example.com/C:relative.json'],
    ['backslash', 'example.com\\site-config.json'],
    ['mixed separators', 'example.com/nested\\site-config.json'],
    ['alternate data stream', 'example.com/site-config.json:stream'],
    ['control character', 'example.com/\u0000site-config.json'],
    ['leading space', ' example.com/site-config.json'],
    ['trailing space', 'example.com/site-config.json '],
    ['windows reserved device', 'example.com/NUL.json'],
    ['windows superscript device', 'example.com/COM¹.json'],
    ['windows wildcard', 'example.com/site?.json'],
    ['windows trailing dot', 'example.com/site-config.json.'],
    ['windows trailing segment space', 'example.com/nested /site-config.json'],
    ['delete control', 'example.com/\u007fsite-config.json'],
    ['unicode format control', 'example.com/site\u202e-config.json'],
    ['non-normalized unicode', 'example.com/pa\u0301gina/site-config.json'],
    ['non-json file', 'example.com/README.md'],
    ['local context folder', 'example.com/ai_notes/keep.json'],
    ['local tooling folder', 'example.com/tools/keep.json'],
    ['case-folded local tooling folder', 'example.com/TOOLS/keep.json'],
    ['encoded local tooling folder', 'example.com/%74ools/keep.json'],
    ['double-encoded local tooling folder', 'example.com/%2574ools/keep.json'],
    ['case-folded git folder', 'example.com/.Git/keep.json'],
    ['local context file', 'example.com/draft-repo.config.json'],
    ['non-string', 123],
  ];

  for (const [index, [name, unsafePath]] of unsafePaths.entries()) {
    await t.test(name, async () => {
      const packagePath = path.join(tempRoot, `path-${index}.json`);
      await writeJson(packagePath, {
        version: 1,
        domain: 'example.com',
        stage: 'draft',
        files: [{ path: unsafePath, content: { version: 1 } }],
      });

      await assertUnsafeConfigSync(
        ['unpack', `--input=${packagePath}`, `--drafts-root=${path.join(tempRoot, `drafts-${index}`)}`],
        'path'
      );
    });
  }
});

test('config-draft-sync does not reflect unsafe control characters into stderr', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-path-error-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const packagePath = path.join(tempRoot, 'package.json');
  await writeJson(packagePath, {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files: [{ path: 'example.com/site\ninjected.json', content: { version: 1 } }],
  });

  await assert.rejects(
    runConfigSync(['unpack', `--input=${packagePath}`, `--drafts-root=${path.join(tempRoot, 'drafts')}`]),
    error => String(error?.stderr ?? '') === 'Refusing to write unsafe path\n'
  );
});

test('config-draft-sync pack rejects a symlinked domain root', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-pack-symlink-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const draftsRoot = path.join(tempRoot, 'drafts');
  const outsideRoot = path.join(tempRoot, 'outside');
  await mkdir(draftsRoot, { recursive: true });
  await writeJson(path.join(outsideRoot, 'site-config.json'), { state: 'outside' });
  await symlink(outsideRoot, path.join(draftsRoot, 'example.com'), process.platform === 'win32' ? 'junction' : 'dir');

  await assertUnsafeConfigSync(
    [
      'pack',
      '--domain=example.com',
      `--drafts-root=${draftsRoot}`,
      `--output=${path.join(tempRoot, 'package.json')}`,
    ],
    'path'
  );
});

test('config-draft-sync unpack rejects a symlinked domain root before clean or write', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-unpack-symlink-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const draftsRoot = path.join(tempRoot, 'drafts');
  const outsideRoot = path.join(tempRoot, 'outside');
  const packagePath = path.join(tempRoot, 'package.json');
  await mkdir(draftsRoot, { recursive: true });
  await writeJson(path.join(outsideRoot, 'site-config.json'), { state: 'original' });
  await writeJson(path.join(outsideRoot, 'stale.json'), { state: 'keep-on-rejection' });
  await symlink(outsideRoot, path.join(draftsRoot, 'example.com'), process.platform === 'win32' ? 'junction' : 'dir');
  await writeJson(packagePath, {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files: [{ path: 'example.com/site-config.json', content: { state: 'changed' } }],
  });

  await assertUnsafeConfigSync(
    ['unpack', `--input=${packagePath}`, `--drafts-root=${draftsRoot}`, '--clean-domain=true'],
    'path'
  );
  assert.deepEqual(JSON.parse(await readFile(path.join(outsideRoot, 'site-config.json'), 'utf8')), {
    state: 'original',
  });
  assert.deepEqual(JSON.parse(await readFile(path.join(outsideRoot, 'stale.json'), 'utf8')), {
    state: 'keep-on-rejection',
  });
});

test('config-draft-sync pack rejects a hard-linked draft file', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-pack-hardlink-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const draftsRoot = path.join(tempRoot, 'drafts');
  const outsidePath = path.join(tempRoot, 'outside.json');
  await writeJson(outsidePath, { state: 'outside' });
  await mkdir(path.join(draftsRoot, 'example.com'), { recursive: true });
  await link(outsidePath, path.join(draftsRoot, 'example.com', 'site-config.json'));

  await assertUnsafeConfigSync(
    [
      'pack',
      '--domain=example.com',
      `--drafts-root=${draftsRoot}`,
      `--output=${path.join(tempRoot, 'package.json')}`,
    ],
    'path'
  );
});

test('config-draft-sync unpack rejects a hard-linked target before write', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-unpack-hardlink-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const draftsRoot = path.join(tempRoot, 'drafts');
  const domainRoot = path.join(draftsRoot, 'example.com');
  const outsidePath = path.join(tempRoot, 'outside.json');
  const packagePath = path.join(tempRoot, 'package.json');
  await writeJson(outsidePath, { state: 'original' });
  await mkdir(domainRoot, { recursive: true });
  await link(outsidePath, path.join(domainRoot, 'site-config.json'));
  await writeJson(packagePath, {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files: [{ path: 'example.com/site-config.json', content: { state: 'changed' } }],
  });

  await assertUnsafeConfigSync(
    ['unpack', `--input=${packagePath}`, `--drafts-root=${draftsRoot}`],
    'path'
  );
  assert.deepEqual(JSON.parse(await readFile(outsidePath, 'utf8')), { state: 'original' });
});

test('config-draft-sync rejects an existing directory target before clean', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-directory-target-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const draftsRoot = path.join(tempRoot, 'drafts');
  const targetRoot = path.join(draftsRoot, 'example.com', 'site-config.json');
  const packagePath = path.join(tempRoot, 'package.json');
  await writeJson(path.join(targetRoot, 'stale.json'), { state: 'keep-on-rejection' });
  await writeFile(path.join(targetRoot, 'keep.txt'), 'keep', 'utf8');
  await writeJson(packagePath, {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files: [{ path: 'example.com/site-config.json', content: { state: 'changed' } }],
  });

  await assertUnsafeConfigSync(
    ['unpack', `--input=${packagePath}`, `--drafts-root=${draftsRoot}`, '--clean-domain=true'],
    'path'
  );
  assert.deepEqual(JSON.parse(await readFile(path.join(targetRoot, 'stale.json'), 'utf8')), {
    state: 'keep-on-rejection',
  });
});

test('config-draft-sync unpack preserves ordinary unicode path characters', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-unicode-path-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const draftsRoot = path.join(tempRoot, 'drafts');
  const packagePath = path.join(tempRoot, 'package.json');
  const relativePath = 'example.com/página/site-config.json';
  await writeJson(packagePath, {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files: [{ path: relativePath, content: { version: 1 } }],
  });

  await runConfigSync(['unpack', `--input=${packagePath}`, `--drafts-root=${draftsRoot}`]);
  assert.deepEqual(JSON.parse(await readFile(path.resolve(draftsRoot, ...relativePath.split('/')), 'utf8')), {
    version: 1,
  });
});

test('config-draft-sync validates every unpack path before clean or write', async t => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-config-prevalidate-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));

  const draftsRoot = path.join(tempRoot, 'drafts');
  const domainRoot = path.join(draftsRoot, 'example.com');
  const packagePath = path.join(tempRoot, 'package.json');
  await writeJson(path.join(domainRoot, 'site-config.json'), { state: 'original' });
  await writeJson(path.join(domainRoot, 'stale.json'), { state: 'keep-on-rejection' });
  await writeJson(packagePath, {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files: [
      { path: 'example.com/site-config.json', content: { state: 'changed' } },
      { path: '/absolute.json', content: { state: 'invalid' } },
    ],
  });

  await assert.rejects(
    runConfigSync(['unpack', `--input=${packagePath}`, `--drafts-root=${draftsRoot}`, '--clean-domain=true'])
  );

  assert.deepEqual(JSON.parse(await readFile(path.join(domainRoot, 'site-config.json'), 'utf8')), {
    state: 'original',
  });
  assert.deepEqual(JSON.parse(await readFile(path.join(domainRoot, 'stale.json'), 'utf8')), {
    state: 'keep-on-rejection',
  });
});
