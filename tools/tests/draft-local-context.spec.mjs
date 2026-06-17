import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const draftSyncCliPath = path.join(repoRoot, 'tools', 'config-draft-sync.mjs');
const builtServerPath = path.join(repoRoot, 'dist', 'zoolandingpage', 'server', 'server.mjs');

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`Command failed with exit code ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
    });
  });
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to determine a free port.')));
        return;
      }

      const { port } = address;
      server.close(error => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
    server.on('error', reject);
  });
}

async function waitForServer(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the timeout expires.
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for server readiness at ${url}`);
}

async function stopServer(child) {
  if (child.killed || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill();
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for the draft test server to stop.'));
    }, 5000);

    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

test('config-draft-sync excludes local-only folders and preserves them during clean unpack', async t => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-draft-sync-'));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const draftsRoot = path.join(tempRoot, 'drafts');
  const domainRoot = path.join(draftsRoot, 'fixture.example.com');
  const packagePath = path.join(tempRoot, 'fixture-package.json');

  await writeJson(path.join(domainRoot, 'site-config.json'), {
    version: 1,
    domain: 'fixture.example.com',
    defaultPageId: 'default',
    routes: [{ path: '/', pageId: 'default' }],
  });
  await writeJson(path.join(domainRoot, 'server', 'auth-profile-registry.json'), {
    version: 1,
    profiles: [
      {
        authProfileId: 'staff',
        tenantId: 'tenant-fixture',
        status: 'active',
        issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_FIXTURE',
        hostedUiDomain: 'https://auth.fixture.example.com',
        clientId: 'public-client-id',
        audiences: ['public-client-id'],
        callbackUrls: ['https://fixture.example.com/auth/callback'],
        logoutUrls: ['https://fixture.example.com/auth/logout'],
        loginPath: '/login',
        logoutPath: '/auth/logout',
        groupClaim: 'cognito:groups',
        allowedGroups: ['Editors'],
      },
    ],
  });
  await writeJson(path.join(domainRoot, 'server', 'integrations.json'), {
    version: 1,
    sources: [
      {
        id: 'protectedBlogPosts',
        method: 'GET',
        url: 'https://content.example.com/posts',
        allowedInputFields: ['category'],
        response: { allowedFields: ['items.title'] },
        access: {
          required: true,
          authProfileId: 'staff',
          allowedGroups: ['Editors'],
        },
      },
    ],
    actions: [],
  });
  await writeJson(path.join(domainRoot, 'default', 'page-config.json'), {
    version: 1,
    domain: 'fixture.example.com',
    pageId: 'default',
    rootIds: ['hero'],
    modalRootIds: [],
  });
  await writeJson(path.join(domainRoot, 'ai_notes', 'keep.json'), { keep: 'ai-notes' });
  await writeJson(path.join(domainRoot, 'findings', 'keep.json'), { keep: 'findings' });
  await writeJson(path.join(domainRoot, 'errors-reports', 'keep.json'), { keep: 'errors-reports' });

  await runCommand(process.execPath, [
    draftSyncCliPath,
    'pack',
    '--domain=fixture.example.com',
    `--drafts-root=${draftsRoot}`,
    `--output=${packagePath}`,
  ]);

  const packaged = JSON.parse(await readFile(packagePath, 'utf8'));
  const packagedPaths = packaged.files.map(entry => entry.path).sort();

  assert.deepEqual(packagedPaths, [
    'fixture.example.com/default/page-config.json',
    'fixture.example.com/server/auth-profile-registry.json',
    'fixture.example.com/server/integrations.json',
    'fixture.example.com/site-config.json',
  ]);
  assert.equal(
    packaged.files.find(entry => entry.path === 'fixture.example.com/server/auth-profile-registry.json')?.kind,
    'server-auth-profile-registry',
  );
  assert.equal(
    packaged.files.find(entry => entry.path === 'fixture.example.com/server/integrations.json')?.kind,
    'server-integrations',
  );

  await writeJson(path.join(domainRoot, 'default', 'stale.json'), { stale: true });
  await writeJson(path.join(domainRoot, 'server', 'stale.json'), { stale: true });

  await runCommand(process.execPath, [
    draftSyncCliPath,
    'unpack',
    `--input=${packagePath}`,
    `--drafts-root=${draftsRoot}`,
    '--clean-domain=true',
  ]);

  assert.equal(existsSync(path.join(domainRoot, 'default', 'page-config.json')), true);
  assert.equal(existsSync(path.join(domainRoot, 'default', 'stale.json')), false);
  assert.equal(existsSync(path.join(domainRoot, 'server', 'auth-profile-registry.json')), true);
  assert.equal(existsSync(path.join(domainRoot, 'server', 'integrations.json')), true);
  assert.equal(existsSync(path.join(domainRoot, 'server', 'stale.json')), false);
  assert.equal(existsSync(path.join(domainRoot, 'ai_notes', 'keep.json')), true);
  assert.equal(existsSync(path.join(domainRoot, 'findings', 'keep.json')), true);
  assert.equal(existsSync(path.join(domainRoot, 'errors-reports', 'keep.json')), true);
});

test('requested draft aliases canonicalize to their primary domains', async () => {
  const expectations = [
    {
      domain: 'zoolandingpage.com.mx',
      canonicalOrigin: 'https://zoolandingpage.com.mx',
      hosts: ['zoolandingpage.com', 'test.zoolandingpage.com.mx'],
    },
    {
      domain: 'sulandingpage.com.mx',
      canonicalOrigin: 'https://sulandingpage.com.mx',
      hosts: [
        'sulandingpage.com',
        'sulanding.zoolandingpage.com.mx',
      ],
    },
    {
      domain: 'zoositioweb.com.mx',
      canonicalOrigin: 'https://zoositioweb.com.mx',
      hosts: [
        'zoositioweb.com',
        'sitiosweb.zoolandingpage.com.mx',
        'quierounsitioweb.zoolandingpage.com.mx',
        'crearpaginaweb.zoolandingpage.com.mx',
        'test.zoositioweb.com.mx',
      ],
    },
  ];

  for (const expectation of expectations) {
    const configPath = path.join(repoRoot, 'drafts', expectation.domain, 'site-config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const hostOverrides = config.site?.hostOverrides ?? {};

    for (const host of expectation.hosts) {
      assert.equal(
        hostOverrides[host]?.seo?.canonicalOrigin,
        expectation.canonicalOrigin,
        `${expectation.domain} alias ${host} should canonicalize to ${expectation.canonicalOrigin}`,
      );
    }
  }
});

test('requested GA4 alias hosts render with the central Zoosite Google tag while self-serving with primary canonicals', async () => {
  const centralMeasurementId = 'G-QRWR768FCM';
  const expectations = [
    {
      domain: 'zoolandingpage.com.mx',
      hosts: {
        'zoolandingpage.com': centralMeasurementId,
      },
    },
    {
      domain: 'sulandingpage.com.mx',
      hosts: {
        'sulandingpage.com': centralMeasurementId,
        'sulanding.zoolandingpage.com.mx': centralMeasurementId,
      },
    },
    {
      domain: 'zoositioweb.com.mx',
      hosts: {
        'zoositioweb.com': centralMeasurementId,
        'sitiosweb.zoolandingpage.com.mx': centralMeasurementId,
        'quierounsitioweb.zoolandingpage.com.mx': centralMeasurementId,
        'crearpaginaweb.zoolandingpage.com.mx': centralMeasurementId,
      },
    },
  ];

  for (const expectation of expectations) {
    const configPath = path.join(repoRoot, 'drafts', expectation.domain, 'site-config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    const hostOverrides = config.site?.hostOverrides ?? {};

    assert.equal(config.runtime?.analytics?.googleTag?.enabled, true);
    assert.deepEqual(config.runtime?.analytics?.googleTag?.measurementIds, [centralMeasurementId]);
    assert.equal(config.runtime?.analytics?.googleTag?.sendPageView, false);

    for (const [host, measurementId] of Object.entries(expectation.hosts)) {
      assert.equal(
        hostOverrides[host]?.seo?.canonicalOrigin,
        config.site?.seo?.canonicalOrigin,
        `${expectation.domain} alias ${host} should canonicalize to the primary origin`,
      );
      assert.equal(
        hostOverrides[host]?.seo?.enforceCanonicalHost,
        false,
        `${expectation.domain} alias ${host} should render without a canonical redirect so the alias tag can fire`,
      );
      assert.equal(hostOverrides[host]?.googleTag?.enabled, true);
      assert.deepEqual(hostOverrides[host]?.googleTag?.measurementIds, [measurementId]);
      assert.equal(hostOverrides[host]?.googleTag?.sendPageView, false);
      assert.equal(hostOverrides[host]?.googleTag?.events?.whatsapp_click?.name, 'lead_conversion_whatsapp');
      assert.equal(
        hostOverrides[host]?.googleTag?.events?.whatsapp_click?.params?.pyme_id,
        config.site?.appIdentity?.identifier,
      );
    }
  }
});

test('config-draft-sync pull retries through a fallback endpoint after a reset primary connection', async t => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-draft-sync-fallback-'));
  const draftsRoot = path.join(tempRoot, 'drafts');
  const primaryPort = await getFreePort();
  const fallbackPort = await getFreePort();

  const primaryServer = http.createServer((req, _res) => {
    req.socket.destroy();
  });
  await new Promise((resolve, reject) => {
    primaryServer.once('error', reject);
    primaryServer.listen(primaryPort, '127.0.0.1', resolve);
  });

  const fallbackServer = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(payload.action, 'getSite');
    assert.equal(payload.domain, 'fixture.example.com');
    assert.equal(payload.stage, 'published');

    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        version: 1,
        domain: 'fixture.example.com',
        stage: 'published',
        files: [
          {
            path: 'fixture.example.com/site-config.json',
            kind: 'site-config',
            content: {
              version: 1,
              domain: 'fixture.example.com',
              defaultPageId: 'default',
              routes: [{ path: '/', pageId: 'default' }],
              site: {
                appIdentity: { identifier: 'fixture', name: 'Fixture Example' },
                theme: { defaultMode: 'light', palettes: {} },
                i18n: { defaultLanguage: 'en', supportedLanguages: [{ code: 'en', label: 'EN' }] },
              },
            },
          },
          {
            path: 'fixture.example.com/default/page-config.json',
            kind: 'page-config',
            pageId: 'default',
            content: {
              version: 1,
              domain: 'fixture.example.com',
              pageId: 'default',
              rootIds: ['hero'],
              modalRootIds: [],
            },
          },
        ],
      })
    );
  });
  await new Promise((resolve, reject) => {
    fallbackServer.once('error', reject);
    fallbackServer.listen(fallbackPort, '127.0.0.1', resolve);
  });

  t.after(async () => {
    await new Promise((resolve, reject) => primaryServer.close(error => (error ? reject(error) : resolve())));
    await new Promise((resolve, reject) => fallbackServer.close(error => (error ? reject(error) : resolve())));
    await rm(tempRoot, { recursive: true, force: true });
  });

  const result = await runCommand(process.execPath, [
    draftSyncCliPath,
    'pull',
    '--domain=fixture.example.com',
    '--stage=published',
    `--drafts-root=${draftsRoot}`,
    `--endpoint=http://127.0.0.1:${primaryPort}/config-authoring`,
    `--fallback-endpoint=http://127.0.0.1:${fallbackPort}/config-authoring`,
  ]);

  assert.match(result.stdout, /Pulled 2 files for fixture\.example\.com \(published\)/);
  assert.match(result.stderr, /Retrying through fallback endpoint/);
  assert.equal(existsSync(path.join(draftsRoot, 'fixture.example.com', 'site-config.json')), true);
  assert.equal(existsSync(path.join(draftsRoot, 'fixture.example.com', 'default', 'page-config.json')), true);
});

test('config-draft-sync pull retries a transient fallback failure and logs action/domain context', async t => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-draft-sync-fallback-retry-'));
  const draftsRoot = path.join(tempRoot, 'drafts');
  const primaryPort = await getFreePort();
  const fallbackPort = await getFreePort();
  let fallbackRequests = 0;

  const primaryServer = http.createServer((req, _res) => {
    req.socket.destroy();
  });
  await new Promise((resolve, reject) => {
    primaryServer.once('error', reject);
    primaryServer.listen(primaryPort, '127.0.0.1', resolve);
  });

  const fallbackServer = http.createServer(async (req, res) => {
    fallbackRequests += 1;

    if (fallbackRequests === 1) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'temporary authoring outage' }));
      return;
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert.equal(payload.action, 'getSite');
    assert.equal(payload.domain, 'fixture.example.com');
    assert.equal(payload.stage, 'published');

    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        version: 1,
        domain: 'fixture.example.com',
        stage: 'published',
        files: [
          {
            path: 'fixture.example.com/site-config.json',
            kind: 'site-config',
            content: {
              version: 1,
              domain: 'fixture.example.com',
              defaultPageId: 'default',
              routes: [{ path: '/', pageId: 'default' }],
              site: {
                appIdentity: { identifier: 'fixture', name: 'Fixture Example' },
                theme: { defaultMode: 'light', palettes: {} },
                i18n: { defaultLanguage: 'en', supportedLanguages: [{ code: 'en', label: 'EN' }] },
              },
            },
          },
        ],
      })
    );
  });
  await new Promise((resolve, reject) => {
    fallbackServer.once('error', reject);
    fallbackServer.listen(fallbackPort, '127.0.0.1', resolve);
  });

  t.after(async () => {
    await new Promise((resolve, reject) => primaryServer.close(error => (error ? reject(error) : resolve())));
    await new Promise((resolve, reject) => fallbackServer.close(error => (error ? reject(error) : resolve())));
    await rm(tempRoot, { recursive: true, force: true });
  });

  const result = await runCommand(process.execPath, [
    draftSyncCliPath,
    'pull',
    '--domain=fixture.example.com',
    '--stage=published',
    `--drafts-root=${draftsRoot}`,
    `--endpoint=http://127.0.0.1:${primaryPort}/config-authoring`,
    `--fallback-endpoint=http://127.0.0.1:${fallbackPort}/config-authoring`,
    '--retry-attempts=2',
    '--retry-delay-ms=1',
  ]);

  assert.equal(fallbackRequests, 2);
  assert.match(result.stdout, /Pulled 1 files for fixture\.example\.com \(published\)/);
  assert.match(result.stderr, /action=getSite/);
  assert.match(result.stderr, /domain=fixture\.example\.com/);
  assert.match(result.stderr, /Retrying attempt 2\/2/);
});

test('built SSR server hides local-only draft folders from registry and static serving', async t => {
  assert.equal(
    existsSync(builtServerPath),
    true,
    'Built SSR server not found. Run this test through `npm run test:draft-context` or build first.'
  );

  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-server-'));

  const domainRoot = path.join(workspaceRoot, 'drafts', 'fixture.example.com');
  await writeJson(path.join(domainRoot, 'site-config.json'), {
    version: 1,
    domain: 'fixture.example.com',
    defaultPageId: 'default',
    routes: [{ path: '/', pageId: 'default' }],
  });
  await writeJson(path.join(domainRoot, 'default', 'page-config.json'), {
    version: 1,
    domain: 'fixture.example.com',
    pageId: 'default',
    rootIds: ['hero'],
    modalRootIds: [],
  });
  await writeJson(path.join(domainRoot, 'server', 'integrations.json'), {
    version: 1,
    sources: [],
    actions: [],
  });
  await writeJson(path.join(domainRoot, 'ai_notes', 'note.json'), { hidden: true });
  await writeJson(path.join(domainRoot, 'findings', 'note.json'), { hidden: true });
  await writeJson(path.join(domainRoot, 'errors-reports', 'note.json'), { hidden: true });

  const port = await getFreePort();
  const child = spawn(process.execPath, [builtServerPath], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let serverOutput = '';
  child.stdout.on('data', chunk => {
    serverOutput += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    serverOutput += chunk.toString();
  });

  t.after(async () => {
    await stopServer(child);
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  await waitForServer(`http://127.0.0.1:${port}/api/debug/drafts`);

  const registryResponse = await fetch(`http://127.0.0.1:${port}/api/debug/drafts`);
  assert.equal(registryResponse.ok, true, serverOutput);
  const registryPayload = await registryResponse.json();
  assert.deepEqual(registryPayload.drafts, [{ domain: 'fixture.example.com', pageId: 'default' }]);

  const pageConfigResponse = await fetch(
    `http://127.0.0.1:${port}/drafts/fixture.example.com/default/page-config.json`
  );
  assert.equal(pageConfigResponse.status, 200, serverOutput);

  const aiNotesResponse = await fetch(`http://127.0.0.1:${port}/drafts/fixture.example.com/ai_notes/note.json`);
  assert.equal(aiNotesResponse.status, 404, serverOutput);

  const findingsResponse = await fetch(`http://127.0.0.1:${port}/drafts/fixture.example.com/findings/note.json`);
  assert.equal(findingsResponse.status, 404, serverOutput);

  const errorsReportsResponse = await fetch(
    `http://127.0.0.1:${port}/drafts/fixture.example.com/errors-reports/note.json`
  );
  assert.equal(errorsReportsResponse.status, 404, serverOutput);

  const serverIntegrationsResponse = await fetch(
    `http://127.0.0.1:${port}/drafts/fixture.example.com/server/integrations.json`
  );
  assert.equal(serverIntegrationsResponse.status, 404, serverOutput);

  const robotsResponse = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    headers: {
      'x-forwarded-host': 'fixture.example.com',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(robotsResponse.status, 200, serverOutput);
  const robotsText = await robotsResponse.text();
  assert.match(robotsText, /Sitemap: https:\/\/fixture\.example\.com\/sitemap\.xml/);

  const sitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml`, {
    headers: {
      'x-forwarded-host': 'fixture.example.com',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(sitemapResponse.status, 200, serverOutput);
  const sitemapXml = await sitemapResponse.text();
  assert.match(sitemapXml, /<loc>https:\/\/fixture\.example\.com\/<\/loc>/);
});

test('built SSR server decorates configured drafts with Google tag, Search Console, robots, and sitemap metadata', async t => {
  assert.equal(
    existsSync(builtServerPath),
    true,
    'Built SSR server not found. Run this test through `npm run test:draft-context` or build first.'
  );

  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-google-tag-'));
  const draftsRoot = path.join(workspaceRoot, 'drafts');

  const siteShared = {
    appIdentity: { identifier: 'fixture', name: 'Fixture Example' },
    theme: { defaultMode: 'light', palettes: {} },
    i18n: { defaultLanguage: 'es', supportedLanguages: ['es', 'en'] },
    icons: {
      favicon: 'https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/favicon.svg',
      maskIcon: 'https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/mask-icon.svg',
      themeColor: '#128c7e',
    },
    seo: { canonicalOrigin: 'https://zoositioweb.com.mx', enforceCanonicalHost: true },
    searchConsole: {
      googleSiteVerification: 'verification-token',
      htmlFile: {
        path: '/googleabc123.html',
        content: 'google-site-verification: googleabc123.html',
      },
      environments: { local: true, test: true, production: false },
    },
    hostOverrides: {
      'sitiosweb.zoolandingpage.com.mx': {
        seo: {
          canonicalOrigin: 'https://sitiosweb.zoolandingpage.com.mx',
          enforceCanonicalHost: true,
          forceHttps: true,
        },
        googleTag: {
          enabled: true,
          environments: { local: true, test: true, production: false },
          measurementIds: ['G-ALIAS123'],
          adsIds: ['AW-ALIAS123'],
          gtmId: 'GTM-ALIAS123',
          sendPageView: false,
        },
        searchConsole: {
          googleSiteVerification: 'alias-verification-token',
          htmlFile: {
            path: '/googlealias123.html',
            content: 'google-site-verification: googlealias123.html',
          },
          environments: { local: true, test: true, production: false },
        },
      },
      'test.sitiosweb.zoolandingpage.com.mx': {
        seo: {
          canonicalOrigin: 'https://test.sitiosweb.zoolandingpage.com.mx',
          enforceCanonicalHost: true,
          forceHttps: true,
        },
        googleTag: {
          enabled: true,
          environments: { local: true, test: true, production: false },
          measurementIds: ['G-ENV123'],
          sendPageView: false,
        },
        searchConsole: {
          googleSiteVerification: 'env-alias-verification-token',
          environments: { local: true, test: true, production: false },
        },
      },
    },
  };

  const writeDraftPage = async (domain, pageId, routePath, text, updatedAt) => {
    const domainRoot = path.join(draftsRoot, domain);
    await writeJson(path.join(domainRoot, pageId, 'page-config.json'), {
      version: 1,
      domain,
      pageId,
      rootIds: ['main'],
      modalRootIds: [],
      metadata: { updatedAt },
      seo: {
        title: `${text} title`,
        description: `${text} description`,
        canonical: `https://${domain}${routePath}`,
      },
      structuredData: {
        entries: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: text,
            url: `https://${domain}${routePath}`,
          },
        ],
      },
    });
    await writeJson(path.join(domainRoot, pageId, 'components.json'), {
      version: 1,
      domain,
      pageId,
      components: [
        {
          id: 'main',
          type: 'text',
          config: {
            tag: 'main',
            text,
          },
        },
      ],
    });
  };

  await writeJson(path.join(draftsRoot, 'zoositioweb.com.mx', 'site-config.json'), {
    version: 1,
    domain: 'zoositioweb.com.mx',
    aliases: ['sitiosweb.zoolandingpage.com.mx'],
    environments: {
      test: {
        aliases: ['test.zoositioweb.com.mx'],
      },
    },
    defaultPageId: 'default',
    published: {
      versionId: 'published-fixture',
      updatedAt: '2026-05-18T20:30:00.000Z',
    },
    routes: [
      { path: '/', pageId: 'default' },
      { path: '/contact', pageId: 'contact' },
    ],
    runtime: {
      analytics: {
        enabled: true,
        consentUI: 'none',
        googleTag: {
          enabled: true,
          environments: { local: true, test: true, production: false },
          measurementIds: ['G-TEST123'],
          adsIds: ['AW-TEST123'],
          gtmId: 'GTM-TEST123',
          conversions: {
            whatsapp_click: { sendTo: 'AW-TEST123/whatsappLabel', value: 1, currency: 'MXN' },
          },
        },
      },
    },
    site: siteShared,
    defaults: {
      brand: { displayName: 'Zoo Sitio Web' },
      ui: {
        loadingCurtain: {
          title: 'Zoo Sitio Web',
          subtitle: 'zoositioweb.com.mx',
          background: '#ece7df',
          foreground: '#0d141c',
          accent: '#128c7e',
        },
      },
    },
  });
  await writeDraftPage('zoositioweb.com.mx', 'default', '/', 'Fixture home', '2026-05-18T20:00:00.000Z');
  await writeDraftPage('zoositioweb.com.mx', 'contact', '/contact', 'Fixture contact', '2026-05-18T20:10:00.000Z');

  await writeJson(path.join(draftsRoot, 'zoolandingpage.com.mx', 'site-config.json'), {
    version: 1,
    domain: 'zoolandingpage.com.mx',
    defaultPageId: 'default',
    routes: [{ path: '/', pageId: 'default' }],
    site: {
      ...siteShared,
      seo: { canonicalOrigin: 'https://zoolandingpage.com.mx' },
      searchConsole: undefined,
    },
  });
  await writeDraftPage('zoolandingpage.com.mx', 'default', '/', 'Untagged home', '2026-05-18T20:00:00.000Z');

  const port = await getFreePort();
  const child = spawn(process.execPath, [builtServerPath], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port),
      ZLP_RUNTIME_ENV: 'local',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let serverOutput = '';
  child.stdout.on('data', chunk => {
    serverOutput += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    serverOutput += chunk.toString();
  });

  t.after(async () => {
    await stopServer(child);
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  await waitForServer(`http://127.0.0.1:${port}/api/debug/drafts`);

  const fixtureHeaders = {
    'x-forwarded-host': 'zoositioweb.com.mx',
    'x-forwarded-proto': 'https',
  };
  const homeResponse = await fetch(`http://127.0.0.1:${port}/`, { headers: fixtureHeaders });
  assert.equal(homeResponse.status, 200, serverOutput);
  const html = await homeResponse.text();
  assert.match(html, /googletagmanager\.com\/gtag\/js\?id=G-TEST123/);
  assert.match(html, /googletagmanager\.com\/gtm\.js\?id=GTM-TEST123/);
  assert.match(html, /window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\]/);
  assert.match(html, /send_page_view["']?\s*:\s*false/);
  assert.match(html, /<meta name="google-site-verification" content="verification-token">/);
  assert.match(html, /<link rel="icon" href="https:\/\/assets\.zoolandingpage\.com\.mx\/zoositioweb\.com\.mx\/shared\/brand\/favicon\.svg" type="image\/svg\+xml" data-zlp-browser-icon="true">/);
  assert.match(html, /<link rel="mask-icon" href="https:\/\/assets\.zoolandingpage\.com\.mx\/zoositioweb\.com\.mx\/shared\/brand\/mask-icon\.svg" color="#128c7e" data-zlp-browser-icon="true">/);
  assert.match(html, /<meta name="theme-color" content="#128c7e" data-zlp-browser-icon="true">/);
  assert.match(html, /id="zlp-boot-curtain"[^>]+style="[^"]*--zlp-boot-bg: #ece7df; --zlp-boot-fg: #0d141c; --zlp-boot-accent: #128c7e/);
  assert.match(html, /data-zlp-boot-logo[^>]+src="https:\/\/assets\.zoolandingpage\.com\.mx\/zoositioweb\.com\.mx\/shared\/brand\/favicon\.svg"/);
  assert.match(html, /data-zlp-boot-title[^>]*>Zoo Sitio Web<\/strong>/);
  assert.match(html, /data-zlp-boot-subtitle[^>]*>zoositioweb\.com\.mx<\/span>/);
  assert.match(html, /<script type="application\/ld\+json"/);
  assert.match(html, /"@type":"WebSite"/);
  assert.match(html, /hreflang="en"/);

  const verificationResponse = await fetch(`http://127.0.0.1:${port}/googleabc123.html`, { headers: fixtureHeaders });
  assert.equal(verificationResponse.status, 200, serverOutput);
  assert.equal(await verificationResponse.text(), 'google-site-verification: googleabc123.html');

  const robotsResponse = await fetch(`http://127.0.0.1:${port}/robots.txt`, { headers: fixtureHeaders });
  assert.equal(robotsResponse.status, 200, serverOutput);
  const robotsText = await robotsResponse.text();
  assert.match(robotsText, /^Allow: \/$/m);
  assert.match(robotsText, /^Disallow: \/api\//m);
  assert.match(robotsText, /^Disallow: \/debug-workspace\//m);
  assert.match(robotsText, /^Disallow: \/runtime-bundle$/m);
  assert.match(robotsText, /^Sitemap: https:\/\/zoositioweb\.com\.mx\/sitemap\.xml$/m);

  const sitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml`, { headers: fixtureHeaders });
  assert.equal(sitemapResponse.status, 200, serverOutput);
  const sitemapXml = await sitemapResponse.text();
  assert.match(sitemapXml, /<loc>https:\/\/zoositioweb\.com\.mx\/<\/loc>[\s\S]*<lastmod>2026-05-18T20:00:00.000Z<\/lastmod>[\s\S]*<changefreq>weekly<\/changefreq>[\s\S]*<priority>1.0<\/priority>/);
  assert.match(sitemapXml, /<loc>https:\/\/zoositioweb\.com\.mx\/contact<\/loc>[\s\S]*<lastmod>2026-05-18T20:10:00.000Z<\/lastmod>[\s\S]*<changefreq>weekly<\/changefreq>[\s\S]*<priority>0.7<\/priority>/);

  const untaggedResponse = await fetch(`http://127.0.0.1:${port}/`, {
    headers: {
      'x-forwarded-host': 'zoolandingpage.com.mx',
      'x-forwarded-proto': 'https',
    },
  });
  const untaggedHtml = await untaggedResponse.text();
  assert.equal(untaggedResponse.status, 200, serverOutput);
  assert.doesNotMatch(untaggedHtml, /googletagmanager\.com\/gtag\/js/);
  assert.doesNotMatch(untaggedHtml, /google-site-verification/);

  const aliasHeaders = {
    'x-forwarded-host': 'sitiosweb.zoolandingpage.com.mx',
    'x-forwarded-proto': 'https',
  };
  const aliasHomeResponse = await fetch(`http://127.0.0.1:${port}/?gclid=test&utm_source=google`, {
    headers: aliasHeaders,
    redirect: 'manual',
  });
  assert.equal(aliasHomeResponse.status, 200, serverOutput);
  const aliasHtml = await aliasHomeResponse.text();
  assert.match(aliasHtml, /googletagmanager\.com\/gtag\/js\?id=G-ALIAS123/);
  assert.match(aliasHtml, /googletagmanager\.com\/gtm\.js\?id=GTM-ALIAS123/);
  assert.match(aliasHtml, /<meta name="google-site-verification" content="alias-verification-token">/);
  assert.match(aliasHtml, /<link rel="canonical" href="https:\/\/sitiosweb\.zoolandingpage\.com\.mx\/">/);
  assert.doesNotMatch(aliasHtml, /G-TEST123/);

  const aliasVerificationResponse = await fetch(`http://127.0.0.1:${port}/googlealias123.html`, {
    headers: aliasHeaders,
    redirect: 'manual',
  });
  assert.equal(aliasVerificationResponse.status, 200, serverOutput);
  assert.equal(await aliasVerificationResponse.text(), 'google-site-verification: googlealias123.html');

  const aliasRobotsResponse = await fetch(`http://127.0.0.1:${port}/robots.txt`, { headers: aliasHeaders });
  assert.equal(aliasRobotsResponse.status, 200, serverOutput);
  assert.match(
    await aliasRobotsResponse.text(),
    /^Sitemap: https:\/\/sitiosweb\.zoolandingpage\.com\.mx\/sitemap\.xml$/m,
  );

  const aliasSitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml`, { headers: aliasHeaders });
  assert.equal(aliasSitemapResponse.status, 200, serverOutput);
  const aliasSitemapXml = await aliasSitemapResponse.text();
  assert.match(aliasSitemapXml, /<loc>https:\/\/sitiosweb\.zoolandingpage\.com\.mx\/<\/loc>/);
  assert.doesNotMatch(aliasSitemapXml, /<loc>https:\/\/zoositioweb\.com\.mx\//);

  const envAliasResponse = await fetch(`http://127.0.0.1:${port}/`, {
    headers: {
      'x-forwarded-host': 'test.sitiosweb.zoolandingpage.com.mx',
      'x-forwarded-proto': 'https',
    },
    redirect: 'manual',
  });
  assert.equal(envAliasResponse.status, 200, serverOutput);
  const envAliasHtml = await envAliasResponse.text();
  assert.match(envAliasHtml, /googletagmanager\.com\/gtag\/js\?id=G-ENV123/);
  assert.match(envAliasHtml, /<meta name="google-site-verification" content="env-alias-verification-token">/);
});

test('built SSR server resolves configurable 404 runtime bundles and excludes 404 routes from sitemap', async t => {
  assert.equal(
    existsSync(builtServerPath),
    true,
    'Built SSR server not found. Run this test through `npm run test:draft-context` or build first.'
  );

  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-404-runtime-'));
  const draftsRoot = path.join(workspaceRoot, 'drafts');

  const writeDraftPage = async (domain, pageId, text) => {
    const domainRoot = path.join(draftsRoot, domain);
    await writeJson(path.join(domainRoot, pageId, 'page-config.json'), {
      version: 1,
      domain,
      pageId,
      rootIds: ['main'],
      modalRootIds: [],
    });
    await writeJson(path.join(domainRoot, pageId, 'components.json'), {
      version: 1,
      domain,
      pageId,
      components: [
        {
          id: 'main',
          type: 'text',
          config: {
            tag: 'main',
            text,
          },
        },
      ],
    });
  };

  await writeJson(path.join(draftsRoot, 'fixture.example.com', 'site-config.json'), {
    version: 1,
    domain: 'fixture.example.com',
    defaultPageId: 'default',
    notFoundPageId: 'not-found',
    routes: [
      { path: '/', pageId: 'default' },
      { path: '/404', pageId: 'not-found' },
    ],
    site: {
      appIdentity: { identifier: 'fixture', name: 'Fixture Example' },
      theme: { defaultMode: 'light', palettes: {} },
      i18n: { defaultLanguage: 'en', supportedLanguages: [{ code: 'en', label: 'EN' }] },
      seo: { canonicalOrigin: 'https://fixture.example.com' },
    },
  });
  await writeDraftPage('fixture.example.com', 'default', 'Fixture home');
  await writeDraftPage('fixture.example.com', 'not-found', 'Fixture custom 404');

  await writeJson(path.join(draftsRoot, 'zoolandingpage.com.mx', 'site-config.json'), {
    version: 1,
    domain: 'zoolandingpage.com.mx',
    defaultPageId: 'default',
    notFoundPageId: 'not-found',
    routes: [
      { path: '/', pageId: 'default' },
      { path: '/404', pageId: 'not-found' },
    ],
    site: {
      appIdentity: { identifier: 'zoolandingpage', name: 'ZoolandingPage' },
      theme: { defaultMode: 'light', palettes: {} },
      i18n: { defaultLanguage: 'en', supportedLanguages: [{ code: 'en', label: 'EN' }] },
      seo: { canonicalOrigin: 'https://zoolandingpage.com.mx' },
    },
  });
  await writeDraftPage('zoolandingpage.com.mx', 'not-found', 'Canonical 404');

  const port = await getFreePort();
  const child = spawn(process.execPath, [builtServerPath], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let serverOutput = '';
  child.stdout.on('data', chunk => {
    serverOutput += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    serverOutput += chunk.toString();
  });

  t.after(async () => {
    await stopServer(child);
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  await waitForServer(`http://127.0.0.1:${port}/api/debug/drafts`);

  const homeDocumentResponse = await fetch(`http://127.0.0.1:${port}/?draftDomain=fixture.example.com`);
  assert.equal(homeDocumentResponse.status, 200, serverOutput);

  const missingDocumentResponse = await fetch(`http://127.0.0.1:${port}/missing?draftDomain=fixture.example.com`);
  assert.equal(missingDocumentResponse.status, 404, serverOutput);

  const homeResponse = await fetch(`http://127.0.0.1:${port}/runtime-bundle?domain=fixture.example.com&path=/`);
  assert.equal(homeResponse.status, 200, serverOutput);
  const homePayload = await homeResponse.json();
  assert.equal(homePayload.pageId, 'default');
  assert.equal(homePayload.metadata.statusCode, 200);
  assert.equal(homePayload.metadata.notFound, false);

  const missingResponse = await fetch(`http://127.0.0.1:${port}/runtime-bundle?domain=fixture.example.com&path=/missing`);
  assert.equal(missingResponse.status, 200, serverOutput);
  const missingPayload = await missingResponse.json();
  assert.equal(missingPayload.domain, 'fixture.example.com');
  assert.equal(missingPayload.pageId, 'not-found');
  assert.equal(missingPayload.route.path, '/404');
  assert.equal(missingPayload.metadata.resolvedPath, '/missing');
  assert.equal(missingPayload.metadata.statusCode, 404);
  assert.equal(missingPayload.metadata.notFound, true);

  const noConfigResponse = await fetch(`http://127.0.0.1:${port}/runtime-bundle?domain=no-config.example.com&path=/missing`);
  assert.equal(noConfigResponse.status, 200, serverOutput);
  const noConfigPayload = await noConfigResponse.json();
  assert.equal(noConfigPayload.domain, 'zoolandingpage.com.mx');
  assert.equal(noConfigPayload.pageId, 'not-found');
  assert.equal(noConfigPayload.metadata.loadDomain, 'zoolandingpage.com.mx');
  assert.equal(noConfigPayload.metadata.fallbackFromDomain, 'no-config.example.com');
  assert.equal(noConfigPayload.metadata.statusCode, 404);

  const sitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml`, {
    headers: {
      'x-forwarded-host': 'fixture.example.com',
      'x-forwarded-proto': 'https',
    },
  });
  assert.equal(sitemapResponse.status, 200, serverOutput);
  const sitemapXml = await sitemapResponse.text();
  assert.match(sitemapXml, /<loc>https:\/\/fixture\.example\.com\/<\/loc>/);
  assert.doesNotMatch(sitemapXml, /\/404<\/loc>/);
});

test('built SSR server can derive sitemap routes from the runtime bundle when local drafts are missing', async t => {
  assert.equal(
    existsSync(builtServerPath),
    true,
    'Built SSR server not found. Run this test through `npm run test:draft-context` or build first.'
  );

  const apiPort = await getFreePort();
  const apiServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/runtime-bundle') {
      res.statusCode = 404;
      res.end('not found');
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        version: 1,
        domain: 'runtime-only.example.com',
        pageId: 'default',
        sourceStage: 'published',
        siteConfig: {
          version: 1,
          domain: 'runtime-only.example.com',
          defaultPageId: 'default',
          routes: [
            { path: '/', pageId: 'default' },
            { path: '/contact', pageId: 'contact' },
          ],
          site: {
            seo: {
              canonicalOrigin: 'https://runtime-only.example.com',
            },
          },
        },
        pageConfig: {
          version: 1,
          domain: 'runtime-only.example.com',
          pageId: 'default',
          rootIds: ['hero'],
        },
        components: {
          version: 1,
          domain: 'runtime-only.example.com',
          pageId: 'default',
          components: [],
        },
      })
    );
  });
  await new Promise((resolve, reject) => {
    apiServer.once('error', reject);
    apiServer.listen(apiPort, '127.0.0.1', resolve);
  });

  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-runtime-sitemap-'));
  const port = await getFreePort();
  const child = spawn(process.execPath, [builtServerPath], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port),
      CONFIG_API_URL: `http://127.0.0.1:${apiPort}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let serverOutput = '';
  child.stdout.on('data', chunk => {
    serverOutput += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    serverOutput += chunk.toString();
  });

  t.after(async () => {
    await stopServer(child);
    await new Promise((resolve, reject) => apiServer.close(error => (error ? reject(error) : resolve())));
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  await waitForServer(`http://127.0.0.1:${port}/api/debug/drafts`);

  const sitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml`, {
    headers: {
      'x-forwarded-host': 'runtime-only.example.com',
      'x-forwarded-proto': 'https',
    },
  });

  assert.equal(sitemapResponse.status, 200, serverOutput);
  const sitemapXml = await sitemapResponse.text();
  assert.match(sitemapXml, /<loc>https:\/\/runtime-only\.example\.com\/<\/loc>/);
  assert.match(sitemapXml, /<loc>https:\/\/runtime-only\.example\.com\/contact<\/loc>/);
});

test('built SSR server uses route runtime bundle status when the cached site route map is incomplete', async t => {
  assert.equal(
    existsSync(builtServerPath),
    true,
    'Built SSR server not found. Run this test through `npm run test:draft-context` or build first.'
  );

  const apiPort = await getFreePort();
  const apiServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/runtime-bundle') {
      res.statusCode = 404;
      res.end('not found');
      return;
    }

    const routePath = url.searchParams.get('path') || '/';
    const pageId = routePath === '/registro' ? 'registro' : 'default';
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        version: 1,
        domain: 'runtime-status.example.com',
        pageId,
        sourceStage: 'published',
        siteConfig: {
          version: 1,
          domain: 'runtime-status.example.com',
          defaultPageId: 'default',
          routes: [
            { path: '/', pageId: 'default' },
          ],
          site: {
            appIdentity: { identifier: 'runtime-status', name: 'Runtime Status' },
            theme: { defaultMode: 'light', palettes: {} },
            i18n: { defaultLanguage: 'es', supportedLanguages: [{ code: 'es', label: 'ES' }] },
            seo: { canonicalOrigin: 'https://runtime-status.example.com' },
          },
        },
        pageConfig: {
          version: 1,
          domain: 'runtime-status.example.com',
          pageId,
          rootIds: ['main'],
          metadata: { title: pageId === 'registro' ? 'Registro' : 'Inicio' },
        },
        components: {
          version: 1,
          domain: 'runtime-status.example.com',
          pageId,
          components: [
            {
              id: 'main',
              type: 'text',
              config: { tag: 'main', text: pageId === 'registro' ? 'Registro runtime' : 'Inicio runtime' },
            },
          ],
        },
        metadata: {
          statusCode: 200,
          notFound: false,
          resolvedPath: routePath,
        },
      })
    );
  });
  await new Promise((resolve, reject) => {
    apiServer.once('error', reject);
    apiServer.listen(apiPort, '127.0.0.1', resolve);
  });

  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'zoolanding-runtime-status-'));
  const port = await getFreePort();
  const child = spawn(process.execPath, [builtServerPath], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port),
      CONFIG_API_URL: `http://127.0.0.1:${apiPort}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let serverOutput = '';
  child.stdout.on('data', chunk => {
    serverOutput += chunk.toString();
  });
  child.stderr.on('data', chunk => {
    serverOutput += chunk.toString();
  });

  t.after(async () => {
    await stopServer(child);
    await new Promise((resolve, reject) => apiServer.close(error => (error ? reject(error) : resolve())));
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  await waitForServer(`http://127.0.0.1:${port}/api/debug/drafts`);

  const registroResponse = await fetch(
    `http://127.0.0.1:${port}/registro?draftDomain=runtime-status.example.com`
  );

  assert.equal(registroResponse.status, 200, serverOutput);
});
