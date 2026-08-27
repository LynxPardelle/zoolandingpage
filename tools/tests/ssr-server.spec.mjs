import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const repoRoot = resolve(import.meta.dirname, '../..');
const serverEntry = resolve(repoRoot, 'dist/zoolandingpage/server/server.mjs');

async function getAvailablePort() {
  const server = createNetServer();

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => error ? rejectPromise(error) : resolvePromise());
  });

  assert(address && typeof address === 'object');
  return address.port;
}

async function startRuntimeApi(t, handler) {
  const server = createHttpServer(handler);

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', resolvePromise);
  });

  const address = server.address();
  assert(address && typeof address === 'object');

  t.after(() => new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => error ? rejectPromise(error) : resolvePromise());
  }));

  return `http://127.0.0.1:${address.port}`;
}

async function waitForOk(url) {
  const deadline = Date.now() + 10_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }

      lastError = new Error(`Unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function fetchStartedServer(url, init) {
  const deadline = Date.now() + 2_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (error?.cause?.code !== 'ECONNREFUSED') {
        throw error;
      }
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  throw lastError ?? new Error(`Timed out fetching ${url}`);
}

async function startProductionServer(t, extraEnv = {}) {
  const port = await getAvailablePort();
  const server = spawn(process.execPath, [serverEntry], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...extraEnv,
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  server.stderr.setEncoding('utf8');
  server.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  t.after(() => {
    if (!server.killed) {
      server.kill();
    }
  });

  await waitForOk(`http://127.0.0.1:${port}/health`);

  return {
    port,
    getStderr: () => stderr,
  };
}

function assertNoSensitiveAuthSurface(body) {
  const forbiddenPatterns = [
    [/id[_-]?token/i, 'id token'],
    [/access[_-]?token/i, 'access token'],
    [/refresh[_-]?token/i, 'refresh token'],
    [/clientSecret/i, 'client secret'],
    [/Authorization/i, 'authorization header'],
    [/__Host-zlp_session/i, 'session cookie'],
    [/zlp_csrf/i, 'csrf cookie'],
    [/tenantId/i, 'tenant policy'],
    [/adminGroups/i, 'admin group policy'],
  ];

  for (const [pattern, label] of forbiddenPatterns) {
    assert.doesNotMatch(body, pattern, `protected SSR HTML must not expose ${label}`);
  }
}

function assertNoContentHubOperationalLeak(body) {
  const forbiddenPatterns = [
    [/credentialRef/i, 'credential reference'],
    [/serverOnly/i, 'server-only block'],
    [/allowedDraftDomains/i, 'draft sharing allowlist'],
    [/articleIds/i, 'server-side article id index'],
    [/"bucket"\s*:/i, 'storage bucket'],
    [/"prefix"\s*:/i, 'storage prefix'],
    [/"tableName"\s*:/i, 'table name'],
    [/tenantId/i, 'tenant policy'],
    [/accessToken/i, 'access token'],
    [/refreshToken/i, 'refresh token'],
    [/idToken/i, 'id token'],
  ];

  for (const [pattern, label] of forbiddenPatterns) {
    assert.doesNotMatch(body, pattern, `content hub public SEO output must not expose ${label}`);
  }
}

function extractJsonLd(html) {
  return Array.from(html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => match[1])
    .join('\n');
}

function stripNonVisibleHtml(html) {
  return String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

function extractAppRootHtml(html) {
  return String(html ?? '').match(/<app-root\b[\s\S]*?<\/app-root>/i)?.[0] ?? '';
}

function extractProtectedSsrOverlayHtml(html) {
  return String(html ?? '').match(/<div\b[^>]*data-zlp-protected-ssr-overlay=""[\s\S]*?<\/div>\s*<\/main>\s*<\/div>/i)?.[0] ?? '';
}

function extractNotFoundRecoveryHref(html) {
  const shell = html.match(/<main\b[^>]*data-zlp-not-found-ssr=""[\s\S]*?<\/main>/i)?.[0] ?? '';
  assert.equal((shell.match(/<h1\b/gi) ?? []).length, 1, 'the fallback shell has one heading');
  assert.equal((html.match(/<main\b[^>]*data-zlp-not-found-ssr=""/gi) ?? []).length, 1);
  const appRoot = extractAppRootHtml(html);
  assert.match(appRoot, /data-zlp-not-found-shell="true"/);
  assert.match(appRoot, /aria-hidden="true"/);
  assert.doesNotMatch(appRoot, /<main\b|<h1\b/i, 'SSR must replace the obsolete app content, not duplicate it');
  const encodedHref = shell.match(/<a\b[^>]*class="zlp-not-found-ssr__link"[^>]*href="([^"]*)"/i)?.[1];
  assert.ok(encodedHref, 'the visible fallback has a recovery link');
  assert.doesNotMatch(encodedHref, /&(?!amp;|quot;|lt;|gt;)/, 'query separators are HTML-escaped');
  const href = encodedHref.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
  assert.match(href, /^\/(?!\/)/, 'recovery stays relative and same-origin');
  return href;
}

async function startNotFoundRecoveryFixture(t) {
  const domain = 'not-found-recovery.example.com';
  const source = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'grupoastralegal.com', 'site-config.json'), 'utf8'));
  const siteConfig = {
    ...source,
    domain,
    aliases: [`www.${domain}`],
    environments: {},
    defaultPageId: 'default',
    notFoundPageId: 'not-found',
    routes: [{ path: '/', pageId: 'default' }, { path: '/404', pageId: 'not-found' }],
    site: {
      ...source.site,
      hostOverrides: {},
      i18n: { defaultLanguage: 'es', supportedLanguages: ['es', 'es-MX', 'en', 'zh'] },
      seo: { ...source.site.seo, siteName: 'Recovery fixture', canonicalOrigin: `https://${domain}` },
    },
  };
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }
    const notFound = (url.searchParams.get('path') || '/') !== '/';
    const pageId = notFound ? 'not-found' : 'default';
    const title = notFound ? 'Fixture missing page' : 'Recovery fixture home';
    const identity = { version: 1, domain, pageId };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...identity,
      sourceStage: 'published',
      lang: url.searchParams.get('lang') || 'es',
      route: { path: notFound ? '/404' : '/', pageId },
      siteConfig,
      pageConfig: {
        ...identity,
        rootIds: ['recoveryMain'],
        seo: { title, description: title, canonical: `https://${domain}/${notFound ? '404' : ''}` },
      },
      components: {
        ...identity,
        components: [
          { id: 'recoveryMain', type: 'container', config: { tag: 'main', components: ['recoveryTitle'] } },
          { id: 'recoveryTitle', type: 'text', config: { tag: 'h1', text: title } },
        ],
      },
      variables: { ...identity, variables: {} },
      angoraCombos: { ...identity, combos: {} },
      i18n: { ...identity, lang: 'es', dictionary: {} },
      metadata: { statusCode: notFound ? 404 : 200, notFound },
    }));
  });
  const server = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
    ZLP_RUNTIME_ENV: 'test',
  });
  return { ...server, domain, siteConfig };
}

test('production SSR not-found recovery retains validated preview context and reaches home', async (t) => {
  const { port, domain, getStderr } = await startNotFoundRecoveryFixture(t);
  for (const host of ['127.0.0.1', 'test.zoolandingpage.com.mx']) {
    await t.test(host, async () => {
      const headers = { Host: host, 'X-Forwarded-Host': host };
      // All discarded values below are synthetic test markers, never credentials.
      const query = `draftDomain=${domain}&debugWorkspace=false&lang=es&draftPageId=missing-page&utm_source=discard-me&access_token=discard-me&returnTo=https%3A%2F%2Finvalid.example&unknown=discard-me`;
      const response = await fetch(`http://127.0.0.1:${port}/unknown-recovery?${query}`, { headers });
      assert.equal(response.status, 404);
      const href = extractNotFoundRecoveryHref(await response.text());
      assert.equal(href, `/?draftDomain=${domain}&debugWorkspace=false&lang=es`);
      const home = await fetch(`http://127.0.0.1:${port}${href}`, { headers });
      const homeHtml = await home.text();
      assert.equal(home.status, 200);
      assert.ok(/<title>Recovery fixture home<\/title>/.test(homeHtml), 'recovery resolves the home metadata');
      const homeRoot = stripNonVisibleHtml(extractAppRootHtml(homeHtml));
      assert.doesNotMatch(homeRoot, /data-zlp-not-found-shell="true"|aria-hidden="true"/);
      const main = homeRoot.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? '';
      const heading = main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '';
      assert.equal(heading.replace(/<[^>]*>/g, '').trim(), 'Recovery fixture home', 'recovery renders real home content, including GenericText inline wrappers');
      assert.ok(!homeHtml.includes('data-zlp-not-found-ssr=""'), 'recovery is no longer the fallback');
    });
  }
  assert.equal(getStderr(), '');
});

test('production SSR not-found recovery drops malformed and untrusted query fields', async (t) => {
  const { port, domain } = await startNotFoundRecoveryFixture(t);
  const preview = `draftDomain=${domain}`;
  const cases = [
    ['normalized values', `draftDomain=${domain.toUpperCase()}&debugWorkspace=TRUE&lang=eS_mX`, `/?draftDomain=${domain}&debugWorkspace=true&lang=es-MX`],
    ['recognized alias', `draftDomain=www.${domain}&debugWorkspace=false`, `/?draftDomain=www.${domain}&debugWorkspace=false`],
    ['invalid boolean', `${preview}&debugWorkspace=1&lang=es`, `/?${preview}&lang=es`],
    ['empty boolean', `${preview}&debugWorkspace=&lang=es`, `/?${preview}&lang=es`],
    ['repeated boolean', `${preview}&debugWorkspace=true&debugWorkspace=false&lang=es`, `/?${preview}&lang=es`],
    ['structured boolean', `${preview}&debugWorkspace=false&debugWorkspace[value]=true&lang=es`, `/?${preview}&lang=es`],
    ['malformed language', `${preview}&debugWorkspace=false&lang=es%22%3E%3Cscript%3E`, `/?${preview}&debugWorkspace=false`],
    ['unsupported language', `${preview}&lang=de`, `/?${preview}`],
    ['repeated language', `${preview}&lang=es&lang=en`, `/?${preview}`],
    ['structured language', `${preview}&lang=es&lang[value]=en`, `/?${preview}`],
    ['repeated domain', `${preview}&${preview}&debugWorkspace=false&lang=es`, '/?lang=es'],
    ['structured domain', `${preview}&draftDomain[value]=invalid.example&debugWorkspace=false&lang=es`, '/?lang=es'],
    ['domain URL', `draftDomain=https%3A%2F%2F${domain}&lang=es`, '/?lang=es'],
    ['domain credentials', `draftDomain=discard-me%40${domain}&lang=es`, '/?lang=es'],
    ['domain port', `draftDomain=${domain}%3A443&lang=es`, '/?lang=es'],
    ['domain control character', `draftDomain=${domain}%0A&lang=es`, '/?lang=es'],
    ['domain attribute injection', `draftDomain=${domain}%22%20onclick%3D%22discard-me&lang=es`, '/?lang=es'],
    ['unresolved domain', 'draftDomain=unrelated.example&debugWorkspace=false&lang=es', '/?lang=es'],
    ['no context', '', '/'],
  ];
  for (const [label, query, expected] of cases) {
    await t.test(label, async () => {
      const response = await fetch(`http://127.0.0.1:${port}/unknown-recovery${query ? `?${query}` : ''}`);
      assert.equal(response.status, 404);
      assert.equal(extractNotFoundRecoveryHref(await response.text()), expected);
    });
  }
});

test('production SSR not-found recovery ignores preview context on a published host', async (t) => {
  const { port, domain, siteConfig } = await startNotFoundRecoveryFixture(t);
  const alias = `www.${domain}`;
  // Both identities pass the config allowlist; the host-eligibility guard must still reject preview context.
  assert.equal(siteConfig.domain, domain);
  assert.ok(siteConfig.aliases.includes(alias));
  const cases = [
    ['no query', '', '/'],
    ['unrelated domain', '?draftDomain=unrelated.example&debugWorkspace=true&draftPageId=missing-page&lang=en', '/?lang=en'],
    ['matching canonical domain', `?draftDomain=${domain}&debugWorkspace=false`, '/'],
    ['matching domain with normalized language', `?draftDomain=${domain}&debugWorkspace=true&lang=eS_mX`, '/?lang=es-MX'],
    ['allowed alias with language', `?draftDomain=${alias}&debugWorkspace=false&lang=en`, '/?lang=en'],
  ];
  for (const [label, query, expected] of cases) {
    await t.test(label, async () => {
      const response = await fetch(`http://127.0.0.1:${port}/unknown-recovery${query}`, {
        headers: { Host: domain, 'X-Forwarded-Host': domain },
      });
      assert.equal(response.status, 404);
      assert.equal(extractNotFoundRecoveryHref(await response.text()), expected);
    });
  }
});

test('production SSR not-found recovery CTA and status label use readable neutral pairs in both themes', async (t) => {
  const { port, domain } = await startNotFoundRecoveryFixture(t);
  const response = await fetch(`http://127.0.0.1:${port}/unknown-recovery?draftDomain=${domain}`);
  assert.equal(response.status, 404);
  const html = await response.text();
  const css = html.match(/\.zlp-not-found-ssr__link\{([^}]+)\}/)?.[1] ?? '';
  const background = css.match(/(?:^|;)background:var\(--ank-([\w]+),([^)]*)\)/);
  const foreground = css.match(/(?:^|;)color:var\(--ank-([\w]+),([^)]*)\)/);
  assert.ok(background && foreground, 'the CTA has explicit themed colors and safe fallbacks');
  assert.equal(background[1], 'textColor');
  assert.equal(foreground[1], 'bgColor');
  const labelCss = html.match(/\.zlp-not-found-ssr__eyebrow\{([^}]+)\}/)?.[1] ?? '';
  const panelCss = html.match(/\.zlp-not-found-ssr__panel\{([^}]+)\}/)?.[1] ?? '';
  const labelForeground = labelCss.match(/(?:^|;)color:var\(--ank-([\w]+),([^)]*)\)/);
  const panelBackground = panelCss.match(/(?:^|;)background:var\(--ank-([\w]+),([^)]*)\)/);
  assert.ok(labelForeground && panelBackground, 'the visible 404 label has explicit themed colors and safe fallbacks');

  const luminance = (hex) => {
    const color = hex.replace('#', '');
    const expandedColor = color.length === 3 ? [...color].map((part) => part.repeat(2)).join('') : color;
    const channels = expandedColor.match(/../g).map((part) => parseInt(part, 16) / 255)
      .map((part) => part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const assertContrast = (label, bg, fg) => {
    const values = [luminance(bg), luminance(fg)].sort((a, b) => a - b);
    const ratio = (values[1] + 0.05) / (values[0] + 0.05);
    assert.ok(ratio >= 4.5, `${label}: contrast ${ratio.toFixed(4)}:1 must meet AA for normal text`);
  };
  assertContrast('missing palette fallback', background[2], foreground[2]);
  const fixturePalettes = {
    orangeLight: { bgColor: '#F7F0E3', secondaryBgColor: '#E3D1B5', textColor: '#244737', accentColor: '#ED8B00', onSuccessColor: '#F7F0E3' },
    orangeDark: { bgColor: '#10231B', secondaryBgColor: '#193629', textColor: '#F7F0E3', accentColor: '#ED8B00', onSuccessColor: '#F7F0E3' },
  };
  for (const fixtureDomain of ['grupoastralegal.com', 'zoolandingpage.com.mx', 'pamelabetancourt.com']) {
    const config = JSON.parse(readFileSync(join(repoRoot, 'drafts', fixtureDomain, 'site-config.json'), 'utf8'));
    for (const [mode, palette] of Object.entries(config.site.theme.palettes)) {
      fixturePalettes[`${fixtureDomain}.${mode}`] = palette;
    }
  }
  for (const [label, palette] of Object.entries(fixturePalettes)) {
    assertContrast(label, palette[background[1]], palette[foreground[1]]);
    assertContrast(`${label} status label`, palette[panelBackground[1]] ?? panelBackground[2], palette[labelForeground[1]] ?? labelForeground[2]);
  }
  assertContrast('missing palette status label fallback', panelBackground[2], labelForeground[2]);
  assert.equal(labelForeground[1], 'textColor', 'small status text uses the existing neutral foreground, not an accent');
});

test('production SSR server exposes a lightweight health endpoint', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await waitForOk(`http://127.0.0.1:${port}/health`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^text\/plain\b/);
  assert.equal(body, 'ok\n');
  assert.equal(getStderr(), '');
});

test('production SSR server renders behind Traefik forwarded headers', async (t) => {
  const localSiteConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoolandingpage.com.mx', 'site-config.json'), 'utf8'));
  const localPageConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoolandingpage.com.mx', 'default', 'page-config.json'), 'utf8'));
  const sharedComponents = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoolandingpage.com.mx', 'components.json'), 'utf8'));
  const pageComponents = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoolandingpage.com.mx', 'default', 'components.json'), 'utf8'));
  const localComponents = {
    ...pageComponents,
    components: [
      ...(sharedComponents.components ?? []),
      ...(pageComponents.components ?? []),
    ],
  };
  const localVariables = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoolandingpage.com.mx', 'default', 'variables.json'), 'utf8'));
  const localCombos = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoolandingpage.com.mx', 'default', 'angora-combos.json'), 'utf8'));
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/runtime-bundle') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: 1,
        domain: 'zoolandingpage.com.mx',
        pageId: 'default',
        sourceStage: 'published',
        lang: url.searchParams.get('lang') || 'en',
        route: { path: '/', pageId: 'default', label: 'Home' },
        siteConfig: localSiteConfig,
        pageConfig: localPageConfig,
        components: localComponents,
        variables: localVariables,
        angoraCombos: localCombos,
        i18n: {
          version: 1,
          domain: 'zoolandingpage.com.mx',
          pageId: 'default',
          lang: url.searchParams.get('lang') || 'en',
          dictionary: {},
        },
        metadata: {},
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /<title>[^<]+<\/title>/i);
  assert.match(body, /<main[\s>]/i);
  assert.doesNotMatch(getStderr(), /trustProxyHeaders/i);
});

test('production SSR server localizes an unknown zh route without Spanish not-found copy', async (t) => {
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    ZLP_RUNTIME_ENV: 'test',
  });
  const response = await fetch(
    `http://127.0.0.1:${port}/ruta-desconocida?draftDomain=grupoastralegal.com&debugWorkspace=false&lang=zh`,
    {
      headers: {
        Host: 'test.zoolandingpage.com.mx',
        'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
        'X-Forwarded-Port': '443',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Server': 'dokploy-traefik',
      },
    },
  );
  const body = await response.text();
  const visibleHtml = stripNonVisibleHtml(body);

  assert.equal(response.status, 404);
  assert.match(body, /<html\b[^>]*\blang="zh"/i);
  assert.match(body, /<title>页面未找到 \| Astra Legal<\/title>/i);
  assert.match(visibleHtml, /data-zlp-not-found-ssr/);
  assert.match(visibleHtml, /页面未找到/);
  assert.match(visibleHtml, /此路由尚未发布或已不再可用。/);
  assert.match(visibleHtml, /返回首页/);
  assert.doesNotMatch(
    body,
    /Página no encontrada|Esta ruta no está publicada|Ir al inicio|Esta página no está publicada/i,
  );
  assert.equal(getStderr(), '');
});

test('production SSR server propagates a fixed not-found route language through the final head and shell', async (t) => {
  const fixtureDomain = 'fixed-route-404.example.com';
  const sourceSiteConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'grupoastralegal.com', 'site-config.json'), 'utf8'));
  const sourcePageConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'grupoastralegal.com', 'not-found', 'page-config.json'), 'utf8'));
  const sourceSharedComponents = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'grupoastralegal.com', 'components.json'), 'utf8'));
  const sourcePageComponents = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'grupoastralegal.com', 'not-found', 'components.json'), 'utf8'));
  const sourceVariables = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'grupoastralegal.com', 'not-found', 'variables.json'), 'utf8'));
  const sourceCombos = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'grupoastralegal.com', 'not-found', 'angora-combos.json'), 'utf8'));
  const sourceI18n = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'grupoastralegal.com', 'not-found', 'i18n', 'en.json'), 'utf8'));
  const siteConfig = {
    ...sourceSiteConfig,
    domain: fixtureDomain,
    aliases: [],
    defaultPageId: 'default',
    notFoundPageId: 'not-found',
    routes: [
      { path: '/', pageId: 'default' },
      { path: '/404', pageId: 'not-found', language: 'en' },
    ],
    site: {
      ...sourceSiteConfig.site,
      i18n: {
        ...sourceSiteConfig.site.i18n,
        defaultLanguage: 'es',
        supportedLanguages: ['es', 'en'],
      },
      seo: {
        ...sourceSiteConfig.site.seo,
        siteName: 'Fixed Route 404',
      },
    },
  };
  const pageConfig = {
    ...sourcePageConfig,
    domain: fixtureDomain,
    pageId: 'not-found',
  };
  const components = {
    ...sourcePageComponents,
    domain: fixtureDomain,
    pageId: 'not-found',
    components: [
      ...(sourceSharedComponents.components ?? []),
      ...(sourcePageComponents.components ?? []),
    ],
  };
  const variables = {
    ...sourceVariables,
    domain: fixtureDomain,
    pageId: 'not-found',
  };
  const angoraCombos = {
    ...sourceCombos,
    domain: fixtureDomain,
    pageId: 'not-found',
  };
  const runtimeRequests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    runtimeRequests.push({
      path: url.searchParams.get('path'),
      lang: url.searchParams.get('lang'),
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      version: 1,
      domain: fixtureDomain,
      pageId: 'not-found',
      sourceStage: 'published',
      lang: 'en',
      route: { path: '/404', pageId: 'not-found', language: 'en' },
      siteConfig,
      pageConfig,
      components,
      variables,
      angoraCombos,
      i18n: {
        ...sourceI18n,
        domain: fixtureDomain,
        pageId: 'not-found',
        lang: 'en',
      },
      metadata: { statusCode: 404, notFound: true },
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(
    `http://127.0.0.1:${port}/missing-fixed-route?draftDomain=${ fixtureDomain }&debugWorkspace=false&lang=es`,
    {
      headers: {
        Host: 'test.zoolandingpage.com.mx',
        'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
        'X-Forwarded-Port': '443',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Server': 'dokploy-traefik',
      },
    },
  );
  const body = await response.text();
  const visibleHtml = stripNonVisibleHtml(body);

  assert.equal(response.status, 404);
  assert.ok(
    runtimeRequests.some((request) => request.path === '/missing-fixed-route' && request.lang === 'es'),
    'the request resolver should initially query the runtime with the explicit request language',
  );
  assert.match(body, /<html\b[^>]*\blang="en"/i);
  assert.match(body, /<title>Page not found \| Fixed Route 404<\/title>/i);
  assert.match(body, /<meta name="description" content="This page is not published or is no longer available\."/i);
  assert.match(body, /<meta property="og:title" content="Page not found \| Fixed Route 404"/i);
  assert.match(visibleHtml, /data-zlp-not-found-ssr/);
  assert.match(visibleHtml, /Page not found/);
  assert.match(visibleHtml, /This route is not published or is no longer available\./);
  assert.match(visibleHtml, /Go to home/);
  assert.doesNotMatch(
    body,
    /Página no encontrada|Esta ruta no está publicada|Ir al inicio|Esta página no está publicada/i,
  );
  assert.equal(getStderr(), '');
});

test('production SSR shared preview decorates head with the test runtime environment', async (t) => {
  const requests = [];
  const createSiteConfig = (brand) => ({
    version: 1,
    domain: 'preview.example.com',
    defaultPageId: 'default',
    routes: [{ path: '/', pageId: 'default', label: 'Home' }],
    defaults: {
      brand: {
        displayName: brand,
      },
    },
    site: {
      theme: {
        defaultMode: 'light',
        palettes: {
          light: {
            bgColor: '#fafafa',
            textColor: '#222222',
            titleColor: '#111111',
            linkColor: '#b00020',
            accentColor: '#c7a900',
            secondaryBgColor: '#f0f0f0',
            secondaryTextColor: '#333333',
            secondaryTitleColor: '#222222',
            secondaryLinkColor: '#b00020',
            secondaryAccentColor: '#dddddd',
            successColor: '#198754',
            onSuccessColor: '#052e1c',
            errorColor: '#dc3545',
            onErrorColor: '#fff5f5',
            warningColor: '#f59e0b',
            onWarningColor: '#3a2400',
            infoColor: '#0d6efd',
            onInfoColor: '#041b44',
          },
          dark: {
            bgColor: '#101010',
            textColor: '#f5f5f5',
            titleColor: '#ffffff',
            linkColor: '#ff6b8a',
            accentColor: '#f3c63b',
            secondaryBgColor: '#1f1f1f',
            secondaryTextColor: '#dddddd',
            secondaryTitleColor: '#ffffff',
            secondaryLinkColor: '#ff6b8a',
            secondaryAccentColor: '#444444',
            successColor: '#32d583',
            onSuccessColor: '#f3fff8',
            errorColor: '#ff6b6b',
            onErrorColor: '#fff5f5',
            warningColor: '#f3c63b',
            onWarningColor: '#1f1600',
            infoColor: '#8bb5f0',
            onInfoColor: '#f5fbff',
          },
        },
      },
      icons: {
        favicon: 'https://assets.example.com/current-test-brand.png',
      },
      seo: {
        siteName: brand,
        canonicalOrigin: 'https://preview.example.com',
      },
    },
  });
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/site-config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(createSiteConfig('Current Test Brand')));
      return;
    }

    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    const environment = url.searchParams.get('environment') ?? '';
    requests.push({
      domain: url.searchParams.get('domain'),
      path: url.searchParams.get('path'),
      environment,
    });

    const brand = environment === 'test' ? 'Current Test Brand' : 'Old Production Brand';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      version: 1,
      domain: 'preview.example.com',
      pageId: 'default',
      sourceStage: 'published',
      generatedAt: '2026-06-16T00:00:00.000Z',
      route: { path: '/', pageId: 'default', label: 'Home' },
      siteConfig: createSiteConfig(brand),
      pageConfig: {
        version: 1,
        pageId: 'default',
        domain: 'preview.example.com',
        rootIds: [],
        seo: {
          title: `${ brand } title`,
          description: `${ brand } description`,
        },
        structuredData: {
          entries: [
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: brand,
            },
          ],
        },
      },
      components: {
        version: 1,
        domain: 'preview.example.com',
        pageId: 'default',
        components: [],
      },
      metadata: {},
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/?draftDomain=preview.example.com&debugWorkspace=false`, {
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Current Test Brand/);
  assert.doesNotMatch(body, /Old Production Brand/);
  assert.match(body, /data-zlp-boot-title="">Current Test Brand<\/strong>/);
  assert.match(body, /<html\b[^>]*data-zlp-ssr-theme="light"/);
  assert.match(body, /<html\b[^>]*style="[^"]*--ank-bgColor: #fafafa[^"]*--ank-altBgColor: #101010/i);
  assert.match(body, /data-zlp-boot-logo=""[^>]*src="https:\/\/assets\.example\.com\/current-test-brand\.png"/);
  assert(requests.some((request) => request.environment === 'test'));
  assert.equal(getStderr(), '');
});

test('production SSR server does not self-redirect when proxy proto chain includes https', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'http, https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/zoolandingpage\.com\.mx\/sitemap\.xml/);
  assert.equal(response.headers.get('location'), null);
  assert.equal(getStderr(), '');
});

test('production SSR server does not self-redirect when CloudFront viewer proto is https', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'CloudFront-Forwarded-Proto': 'https',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '80',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'cloudfront',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/zoolandingpage\.com\.mx\/sitemap\.xml/);
  assert.equal(response.headers.get('location'), null);
  assert.equal(getStderr(), '');
});

test('production SSR server does not self-redirect when forwarded port is 443', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'cloudfront',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/zoolandingpage\.com\.mx\/sitemap\.xml/);
  assert.equal(response.headers.get('location'), null);
  assert.equal(getStderr(), '');
});

test('production SSR server redirects proxy-forwarded http to https', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '80',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://test.zoolandingpage.com.mx/robots.txt');
  assert.equal(getStderr(), '');
});

test('production SSR server redirects primary canonical hosts from proxy-forwarded http to https', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    redirect: 'manual',
    headers: {
      Host: 'zoolandingpage.com.mx',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'zoolandingpage.com.mx',
      'X-Forwarded-Port': '80',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://zoolandingpage.com.mx/robots.txt');
  assert.equal(getStderr(), '');
});

test('production SSR exposes Zoosite content hub SEO sitemap feed and search', async (t) => {
  const localSiteConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'site-config.json'), 'utf8'));
  const localBlogPageConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'blog', 'page-config.json'), 'utf8'));
  const localSharedComponents = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'components.json'), 'utf8'));
  const localBlogPageComponents = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'blog', 'components.json'), 'utf8'));
  const localBlogComponents = {
    ...localBlogPageComponents,
    components: [
      ...(localSharedComponents.components ?? []),
      ...(localBlogPageComponents.components ?? []),
    ],
  };
  const localBlogVariables = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'blog', 'variables.json'), 'utf8'));
  const localBlogCombos = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'blog', 'angora-combos.json'), 'utf8'));
  const localBlogI18n = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'blog', 'i18n', 'es.json'), 'utf8'));
  const localNotFoundPageConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'not-found', 'page-config.json'), 'utf8'));
  const localNotFoundPageComponents = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'not-found', 'components.json'), 'utf8'));
  const localNotFoundComponents = {
    ...localNotFoundPageComponents,
    components: [
      ...(localSharedComponents.components ?? []),
      ...(localNotFoundPageComponents.components ?? []),
    ],
  };
  const localNotFoundVariables = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'not-found', 'variables.json'), 'utf8'));
  const localNotFoundCombos = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'not-found', 'angora-combos.json'), 'utf8'));
  const localNotFoundI18n = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'not-found', 'i18n', 'es.json'), 'utf8'));
  const runtimeSiteConfig = JSON.parse(JSON.stringify(localSiteConfig));
  runtimeSiteConfig.runtime.contentHubs[0].publicArticles = {
    items: [
      ...runtimeSiteConfig.runtime.contentHubs[0].publicArticles,
      {
        articleId: 'art_runtime_only_public_fixture',
        locale: 'es',
        status: 'published',
        visibility: 'public',
        title: 'Runtime Dynamic SEO Article',
        summary: 'Artículo publicado dinámicamente desde runtime para búsqueda pública.',
        path: '/blog/web/runtime-dynamic-seo',
        categorySlug: 'web',
        tags: ['runtime', 'seo'],
        publishedAt: '2026-06-28T12:00:00.000Z',
        updatedAt: '2026-06-28T12:30:00.000Z',
        canonicalPath: '/blog/web/runtime-dynamic-seo',
        robots: 'index,follow',
        localizations: {
          en: {
            title: 'Runtime Dynamic SEO Article EN',
            summary: 'Localized runtime article from content hub public metadata.',
            path: '/blog/web/runtime-dynamic-seo-en',
            canonicalPath: '/blog/web/runtime-dynamic-seo-en',
            categorySlug: 'web',
            tags: ['runtime', 'seo'],
          },
        },
      },
      {
        articleId: 'art_runtime_only_english_fixture',
        locale: 'en',
        status: 'published',
        visibility: 'public',
        title: 'Runtime English SEO Article',
        summary: 'English article that must not leak into Spanish public outputs.',
        path: '/blog/web/runtime-english-seo',
        categorySlug: 'web',
        tags: ['runtime', 'english'],
        publishedAt: '2026-06-28T13:00:00.000Z',
        updatedAt: '2026-06-28T13:30:00.000Z',
        canonicalPath: '/blog/web/runtime-english-seo',
        robots: 'index,follow',
      },
    ],
  };
  runtimeSiteConfig.runtime.contentHubs[0].publicTaxonomy = {
    items: [
      ...runtimeSiteConfig.runtime.contentHubs[0].publicTaxonomy,
      {
        taxonomyId: 'marketing',
        kind: 'category',
        slug: 'marketing',
        label: 'Marketing',
        locale: 'es',
        visible: true,
        path: '/blog/marketing',
      },
      {
        taxonomyId: 'web_en',
        kind: 'category',
        slug: 'web',
        label: 'Web EN',
        locale: 'en',
        visible: true,
        path: '/blog/web-en',
      },
    ],
  };
  runtimeSiteConfig.runtime.contentHubs = runtimeSiteConfig.runtime.contentHubs[0];
  const runtimeBundleRequests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/runtime-bundle') {
      const path = url.searchParams.get('path') || '/';
      const lang = url.searchParams.get('lang') || 'es';
      runtimeBundleRequests.push({
        path,
        lang,
        pageId: url.searchParams.get('pageId') || '',
      });
      if (
        path === '/blog/web/missing-article'
        || path === '/blog/web/privado-no-publicable'
        || path === '/blog/bienvenido-al-blog-de-zoosite'
        || path === '/blog/tag/no-existe'
        || (path === '/blog/web/runtime-dynamic-seo-en' && lang !== 'en')
      ) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId: 'not-found',
          sourceStage: 'published',
          lang,
          siteConfig: runtimeSiteConfig,
          route: { path: '/404', pageId: 'not-found' },
          pageConfig: localNotFoundPageConfig,
          components: localNotFoundComponents,
          variables: localNotFoundVariables,
          angoraCombos: localNotFoundCombos,
          i18n: {
            ...localNotFoundI18n,
            lang,
          },
          metadata: { statusCode: 404, notFound: true },
        }));
        return;
      }

      const pageId = url.searchParams.get('pageId') || 'contentHubArticle';
      const pageConfig = pageId === 'blog'
        ? localBlogPageConfig
        : pageId === 'blog-category'
        ? {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId,
          rootIds: [],
          seo: {
            canonical: 'https://zoositioweb.com.mx/blog/web',
          },
        }
        : {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId,
          rootIds: [],
        };
      const components = pageId === 'blog'
        ? localBlogComponents
        : {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId,
          components: [],
        };
      const variables = pageId === 'blog'
        ? localBlogVariables
        : {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId,
          variables: {},
        };
      const angoraCombos = pageId === 'blog' ? localBlogCombos : undefined;
      const i18n = pageId === 'blog'
        ? {
          ...localBlogI18n,
          lang,
        }
        : {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId,
          lang,
          dictionary: {},
        };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: 1,
        domain: 'zoositioweb.com.mx',
        pageId,
        sourceStage: 'published',
        lang,
        siteConfig: runtimeSiteConfig,
        pageConfig,
        components,
        variables,
        angoraCombos,
        i18n,
        metadata: {},
      }));
      return;
    }

    if (url.pathname === '/site-config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(localSiteConfig));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const headers = {
    Host: 'zoositioweb.com.mx',
    'X-Forwarded-Host': 'zoositioweb.com.mx',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
  };

  const sitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml?lang=es`, { headers });
  const sitemap = await sitemapResponse.text();
  assert.equal(sitemapResponse.status, 200);
  assert.match(sitemap, /https:\/\/zoositioweb\.com\.mx\/blog\/web<\/loc>/);
  assert.match(sitemap, /https:\/\/zoositioweb\.com\.mx\/blog\/marketing<\/loc>/);
  assert.match(sitemap, /https:\/\/zoositioweb\.com\.mx\/blog\/web\/blog-builder-seo<\/loc>/);
  assert.match(sitemap, /https:\/\/zoositioweb\.com\.mx\/blog\/web\/runtime-dynamic-seo<\/loc>/);
  assert.doesNotMatch(sitemap, /runtime-english-seo/);
  assert.doesNotMatch(sitemap, /runtime-dynamic-seo-en/);
  assert.doesNotMatch(sitemap, /\/blog\/web-en/);
  assert.doesNotMatch(sitemap, /privado-no-publicable/);
  assert.doesNotMatch(sitemap, /\/admin\/blog/);
  assertNoContentHubOperationalLeak(sitemap);

  const englishSitemapResponse = await fetch(`http://127.0.0.1:${port}/sitemap.xml?lang=en`, { headers });
  const englishSitemap = await englishSitemapResponse.text();
  assert.equal(englishSitemapResponse.status, 200);
  assert.match(englishSitemap, /https:\/\/zoositioweb\.com\.mx\/blog\/web\/runtime-dynamic-seo-en<\/loc>/);
  assert.doesNotMatch(englishSitemap, /https:\/\/zoositioweb\.com\.mx\/blog\/web\/runtime-dynamic-seo<\/loc>/);
  assertNoContentHubOperationalLeak(englishSitemap);

  const feedResponse = await fetch(`http://127.0.0.1:${port}/feed.xml?lang=es`, { headers });
  const feed = await feedResponse.text();
  assert.equal(feedResponse.status, 200);
  assert.match(feedResponse.headers.get('content-type') ?? '', /application\/rss\+xml/);
  assert.match(feed, /Bienvenido al blog de Zoosite/);
  assert.match(feed, /Cómo crear artículos visuales con Zoosite/);
  assert.match(feed, /Runtime Dynamic SEO Article/);
  assert.match(feed, /https:\/\/zoositioweb\.com\.mx\/blog\/web\/blog-builder-seo/);
  assert.match(feed, /https:\/\/zoositioweb\.com\.mx\/blog\/web\/runtime-dynamic-seo/);
  assert.doesNotMatch(feed, /Privado no publicable/);
  assertNoContentHubOperationalLeak(feed);

  const searchResponse = await fetch(`http://127.0.0.1:${port}/content-hub-search.json?lang=es&tag=seo&q=visuales`, { headers });
  const search = await searchResponse.json();
  assert.equal(searchResponse.status, 200);
  assert.equal(search.ok, true);
  assert.equal(search.count, 1);
  assert.equal(search.articles[0].path, '/blog/web/blog-builder-seo');
  assert.equal(search.articles.some((article) => article.path === '/blog/web/privado-no-publicable'), false);
  assertNoContentHubOperationalLeak(JSON.stringify(search));

  const aliasFilterResponse = await fetch(`http://127.0.0.1:${port}/content-hub-search.json?lang=es&categorySlug=web&tagSlug=seo`, { headers });
  const aliasFilterSearch = await aliasFilterResponse.json();
  assert.equal(aliasFilterResponse.status, 200);
  assert.equal(aliasFilterSearch.ok, true);
  assert.equal(aliasFilterSearch.count, 2);
  assert.equal(aliasFilterSearch.articles[0].categorySlug, 'web');
  assert.deepEqual(aliasFilterSearch.articles[0].tags, ['seo', 'blog-builder', 'guias', 'componentes']);
  assert.equal(aliasFilterSearch.articles.some((article) => article.path === '/blog/web/runtime-dynamic-seo'), true);
  assertNoContentHubOperationalLeak(JSON.stringify(aliasFilterSearch));

  const runtimeSearchResponse = await fetch(`http://127.0.0.1:${port}/content-hub-search.json?lang=es&q=runtime`, { headers });
  const runtimeSearch = await runtimeSearchResponse.json();
  assert.equal(runtimeSearchResponse.status, 200);
  assert.equal(runtimeSearch.ok, true);
  assert.equal(runtimeSearch.count, 1);
  assert.equal(runtimeSearch.articles[0].path, '/blog/web/runtime-dynamic-seo');
  assertNoContentHubOperationalLeak(JSON.stringify(runtimeSearch));

  const slugSearchResponse = await fetch(`http://127.0.0.1:${port}/content-hub-search.json?lang=es&q=blog-builder-seo`, { headers });
  const slugSearch = await slugSearchResponse.json();
  assert.equal(slugSearchResponse.status, 200);
  assert.equal(slugSearch.ok, true);
  assert.equal(slugSearch.count, 1);
  assert.equal(slugSearch.articles[0].path, '/blog/web/blog-builder-seo');
  assertNoContentHubOperationalLeak(JSON.stringify(slugSearch));

  const blogIndexResponse = await fetch(`http://127.0.0.1:${port}/blog?lang=es`, { headers });
  const blogIndexHtml = await blogIndexResponse.text();
  const blogIndexVisibleHtml = stripNonVisibleHtml(blogIndexHtml);
  assert.equal(blogIndexResponse.status, 200);
  assert.doesNotMatch(blogIndexHtml, /data-zlp-not-found-ssr|Página no encontrada \| ZoolandingPage/);
  assert.match(blogIndexHtml, /<title>Blog \| zoositioweb<\/title>/);
  assert.match(blogIndexHtml, /<meta name="description" content="Artículos de zoositioweb sobre sitios web, SEO, analítica y crecimiento digital\.">/);
  assert.match(blogIndexHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog">/);
  assert.match(blogIndexHtml, /<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.doesNotMatch(blogIndexVisibleHtml, /\(\)=>|\{component|this\.resol/);

  const blogSalesResponse = await fetch(`http://127.0.0.1:${port}/blogs?lang=es`, { headers });
  const blogSalesHtml = await blogSalesResponse.text();
  assert.equal(blogSalesResponse.status, 200);
  assert.doesNotMatch(blogSalesHtml, /data-zlp-not-found-ssr|Página no encontrada \| ZoolandingPage/);
  assert.match(blogSalesHtml, /<title>Blogs para atraer clientes con contenido medible \| zoositioweb<\/title>/);
  assert.match(blogSalesHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blogs">/);

  const previewHeaders = {
    ...headers,
    Host: 'test.zoolandingpage.com.mx',
    'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
  };
  const blogPreviewResponse = await fetch(
    `http://127.0.0.1:${port}/blog?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es`,
    { headers: previewHeaders },
  );
  const blogPreviewHtml = await blogPreviewResponse.text();
  assert.equal(blogPreviewResponse.status, 200);
  assert.doesNotMatch(blogPreviewHtml, /href="\/blog\/web\/blog-builder-seo(?!\?draftDomain=zoositioweb\.com\.mx)/);
  assert.doesNotMatch(blogPreviewHtml, /privado-no-publicable/);

  const tagFilterResponse = await fetch(`http://127.0.0.1:${port}/blog/tag/seo?lang=es`, { headers });
  const tagFilterHtml = await tagFilterResponse.text();
  assert.equal(tagFilterResponse.status, 200);
  assert.match(tagFilterHtml, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(tagFilterHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/tag\/seo">/);
  assert.doesNotMatch(tagFilterHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/web">/);

  const articleResponse = await fetch(`http://127.0.0.1:${port}/blog/web/blog-builder-seo?lang=es`, { headers });
  const articleHtml = await articleResponse.text();
  assert.equal(articleResponse.status, 200);
  assert.match(articleHtml, /<title>Cómo crear artículos visuales con Zoosite(?: \| zoositioweb)?<\/title>/);
  assert.match(articleHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/web\/blog-builder-seo">/);
  assert.match(articleHtml, /"@type":"BlogPosting"/);
  assert.equal((articleHtml.match(/"@type":"BlogPosting"/g) ?? []).length, 1);
  assert.match(articleHtml, /"articleSection":"web"/);
  assert.match(articleHtml, /"keywords":"seo, blog-builder, guias, componentes"/);
  assert.match(articleHtml, /"publisher":\{[^}]*"name":"zoositioweb"[^}]*\}/);
  assert.match(articleHtml, /"image":"https:\/\/assets\.zoolandingpage\.com\.mx\/zoolandingpage\.com\.mx\/shared\/seo-images\/zoolandingpage-zoositioweb-default-logo-card\.jpg"/);
  assert.match(articleHtml, /Cómo crear artículos visuales con Zoosite/);
  assert.doesNotMatch(stripNonVisibleHtml(articleHtml), /Página no encontrada|Esta ruta no nos llevó/i);
  assertNoContentHubOperationalLeak(extractJsonLd(articleHtml));

  const runtimeArticleResponse = await fetch(`http://127.0.0.1:${port}/blog/web/runtime-dynamic-seo?lang=es`, { headers });
  const runtimeArticleHtml = await runtimeArticleResponse.text();
  assert.equal(runtimeArticleResponse.status, 200);
  assert.match(runtimeArticleHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/web\/runtime-dynamic-seo">/);
  assert.match(runtimeArticleHtml, /"@type":"BlogPosting"/);
  assert.equal((runtimeArticleHtml.match(/"@type":"BlogPosting"/g) ?? []).length, 1);
  assert.match(runtimeArticleHtml, /Runtime Dynamic SEO Article/);
  assert.match(runtimeArticleHtml, /"keywords":"runtime, seo"/);
  assert.doesNotMatch(stripNonVisibleHtml(runtimeArticleHtml), /Página no encontrada|Esta ruta no nos llevó/i);
  assertNoContentHubOperationalLeak(extractJsonLd(runtimeArticleHtml));

  const localizedRuntimeArticleResponse = await fetch(`http://127.0.0.1:${port}/blog/web/runtime-dynamic-seo-en?lang=en`, { headers });
  const localizedRuntimeArticleHtml = await localizedRuntimeArticleResponse.text();
  assert.equal(localizedRuntimeArticleResponse.status, 200, JSON.stringify(runtimeBundleRequests.filter((entry) => entry.path.includes('runtime-dynamic-seo-en'))));
  assert.match(localizedRuntimeArticleHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/web\/runtime-dynamic-seo-en">/);
  assert.match(localizedRuntimeArticleHtml, /"@type":"BlogPosting"/);
  assert.match(localizedRuntimeArticleHtml, /Runtime Dynamic SEO Article EN/);
  assert.match(localizedRuntimeArticleHtml, /"keywords":"runtime, seo"/);
  assert.doesNotMatch(stripNonVisibleHtml(localizedRuntimeArticleHtml), /Página no encontrada|Esta ruta no nos llevó/i);
  assertNoContentHubOperationalLeak(extractJsonLd(localizedRuntimeArticleHtml));

  const categoryResponse = await fetch(`http://127.0.0.1:${port}/blog/marketing?lang=es`, { headers });
  const categoryHtml = await categoryResponse.text();
  assert.equal(categoryResponse.status, 200);
  assert.match(categoryHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/marketing">/);
  assert.doesNotMatch(categoryHtml, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/web">/);

  const missingCategoryResponse = await fetch(`http://127.0.0.1:${port}/blog/bienvenido-al-blog-de-zoosite?lang=es`, { headers });
  const missingCategoryHtml = await missingCategoryResponse.text();
  assert.equal(missingCategoryResponse.status, 404);
  assert.doesNotMatch(stripNonVisibleHtml(missingCategoryHtml), /Cómo crear artículos visuales con Zoosite|Runtime Dynamic SEO Article/);
  assert.match(stripNonVisibleHtml(missingCategoryHtml), /Página no encontrada/);

  const missingTagResponse = await fetch(`http://127.0.0.1:${port}/blog/tag/no-existe?lang=es`, { headers });
  const missingTagHtml = await missingTagResponse.text();
  assert.equal(missingTagResponse.status, 404);
  assert.doesNotMatch(stripNonVisibleHtml(missingTagHtml), /Cómo crear artículos visuales con Zoosite|Runtime Dynamic SEO Article/);
  assert.match(stripNonVisibleHtml(missingTagHtml), /Página no encontrada/);

  const privateArticleResponse = await fetch(`http://127.0.0.1:${port}/blog/web/privado-no-publicable?lang=es`, { headers });
  const privateArticleHtml = await privateArticleResponse.text();
  assert.equal(privateArticleResponse.status, 404);
  assert.doesNotMatch(privateArticleHtml, /"@type":"BlogPosting"/);
  assert.doesNotMatch(stripNonVisibleHtml(privateArticleHtml), /Privado no publicable/);

  const missingArticleResponse = await fetch(`http://127.0.0.1:${port}/blog/web/missing-article?lang=es`, { headers });
  const missingArticleHtml = await missingArticleResponse.text();
  const missingArticleVisibleHtml = stripNonVisibleHtml(missingArticleHtml);
  assert.equal(missingArticleResponse.status, 404);
  assert.doesNotMatch(missingArticleHtml, /"@type":"BlogPosting"/);
  assert.doesNotMatch(missingArticleVisibleHtml, /Cómo crear artículos visuales con Zoosite/);
  assert.match(missingArticleVisibleHtml, /Página no encontrada/);
  assertNoContentHubOperationalLeak(extractJsonLd(missingArticleHtml));
  assert.equal(getStderr(), '');
});

test('production SSR decorates content hub article SEO from the route runtime bundle when the root public index is stale', async (t) => {
  const localSiteConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'site-config.json'), 'utf8'));
  const routeSiteConfig = JSON.parse(JSON.stringify(localSiteConfig));
  routeSiteConfig.runtime.contentHubs[0].publicArticles.push({
    articleId: 'art_route_only_public_fixture',
    locale: 'es',
    status: 'published',
    visibility: 'public',
    title: 'Route Bundle SEO Article',
    summary: 'Artículo publicado sólo en el bundle de la ruta para probar SEO SSR.',
    path: '/blog/web/runtime-route-only-seo',
    categorySlug: 'web',
    tags: ['runtime', 'route'],
    publishedAt: '2026-06-28T13:00:00.000Z',
    updatedAt: '2026-06-28T13:30:00.000Z',
    canonicalPath: '/blog/web/runtime-route-only-seo',
    robots: 'index,follow',
  });

  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/runtime-bundle') {
      const path = url.searchParams.get('path') || '/';
      const siteConfig = path === '/blog/web/runtime-route-only-seo'
        ? routeSiteConfig
        : localSiteConfig;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: 1,
        domain: 'zoositioweb.com.mx',
        pageId: 'blog-article',
        sourceStage: 'published',
        lang: url.searchParams.get('lang') || 'es',
        siteConfig,
        route: { path: '/blog/:categorySlug/:articleSlug', pageId: 'blog-article' },
        pageConfig: {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId: 'blog-article',
          rootIds: [],
          seo: {
            canonical: 'https://zoositioweb.com.mx/blog/web/blog-builder-seo',
          },
        },
        components: {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId: 'blog-article',
          components: [],
        },
        variables: {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId: 'blog-article',
          variables: {},
        },
        i18n: {
          version: 1,
          domain: 'zoositioweb.com.mx',
          pageId: 'blog-article',
          lang: url.searchParams.get('lang') || 'es',
          dictionary: {},
        },
        metadata: { statusCode: 200, notFound: false },
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });

  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const headers = {
    Host: 'zoositioweb.com.mx',
    'X-Forwarded-Host': 'zoositioweb.com.mx',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
  };

  const response = await fetch(`http://127.0.0.1:${port}/blog/web/runtime-route-only-seo?lang=es`, { headers });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/web\/runtime-route-only-seo">/);
  assert.doesNotMatch(html, /<link rel="canonical" href="https:\/\/zoositioweb\.com\.mx\/blog\/web\/blog-builder-seo">/);
  assert.match(html, /"@type":"BlogPosting"/);
  assert.match(html, /Route Bundle SEO Article/);
  assert.match(html, /"keywords":"runtime, route"/);
  assert.doesNotMatch(stripNonVisibleHtml(html), /Página no encontrada|Esta ruta no nos llevó/i);
  assertNoContentHubOperationalLeak(extractJsonLd(html));
  assert.equal(getStderr(), '');
});

test('production SSR loads taxonomy page SEO with the concrete request path', async (t) => {
  const runtimeDomain = 'runtime-taxonomy.example.com';
  const replaceDomain = (payload) => JSON.parse(
    JSON.stringify(payload).replaceAll('zoositioweb.com.mx', runtimeDomain)
  );
  const siteConfig = replaceDomain(JSON.parse(
    readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'site-config.json'), 'utf8')
  ));
  const categoryPageConfig = replaceDomain(JSON.parse(
    readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'blog-category', 'page-config.json'), 'utf8')
  ));
  const categoryComponents = replaceDomain(JSON.parse(
    readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'blog-category', 'components.json'), 'utf8')
  ));
  const categoryVariables = replaceDomain(JSON.parse(
    readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'blog-category', 'variables.json'), 'utf8')
  ));
  const categoryI18n = replaceDomain(JSON.parse(
    readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'blog-category', 'i18n', 'es.json'), 'utf8')
  ));
  const requestedPaths = [];

  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    const path = url.searchParams.get('path') || '/';
    requestedPaths.push(path);
    const pageConfig = structuredClone(categoryPageConfig);
    pageConfig.seo.title = path === '/blog/web'
      ? 'Concrete taxonomy SEO title'
      : path === '/blog/:categorySlug'
        ? 'Pattern placeholder SEO title'
        : pageConfig.seo.title;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      version: 1,
      domain: runtimeDomain,
      pageId: 'blog-category',
      sourceStage: 'published',
      environment: 'production',
      versionId: 'runtime-taxonomy-fixture',
      lang: 'es',
      siteConfig,
      route: { path: '/blog/:categorySlug', pageId: 'blog-category' },
      pageConfig,
      components: categoryComponents,
      variables: categoryVariables,
      i18n: categoryI18n,
      metadata: { statusCode: 200, notFound: false },
    }));
  });

  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const headers = {
    Host: runtimeDomain,
    'X-Forwarded-Host': runtimeDomain,
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
  };

  const response = await fetch(`http://127.0.0.1:${port}/blog/web?lang=es`, { headers });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<title>Concrete taxonomy SEO title<\/title>/);
  assert.doesNotMatch(html, /Pattern placeholder SEO title/);
  assert.ok(requestedPaths.includes('/blog/web'));
  assert.equal(getStderr(), '');
});

test('production SSR server redirects public aliases to the primary canonical host', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/planes?gclid=test&utm_source=google`, {
    redirect: 'manual',
    headers: {
      Host: 'zoolandingpage.com',
      'X-Forwarded-For': '203.0.113.10',
      'X-Forwarded-Host': 'zoolandingpage.com',
      'X-Forwarded-Port': '80',
      'X-Forwarded-Proto': 'http',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });

  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get('location'),
    'https://zoolandingpage.com.mx/planes?gclid=test&utm_source=google',
  );
  assert.equal(getStderr(), '');
});

test('production SSR server prefers the server-only runtime fallback for auxiliary runtime reads', async (t) => {
  const fallbackRequests = [];
  const primaryRequests = [];
  const fallbackBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    fallbackRequests.push(url.pathname);

    if (url.pathname !== '/Prod/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'runtime-fallback.example',
        routes: [{ path: '/', pageId: 'home' }],
        site: {
          seo: {
            canonicalOrigin: 'https://runtime-fallback.example',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const primaryBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    primaryRequests.push(url.pathname);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: `${fallbackBase}/Prod`,
    CONFIG_API_URL: primaryBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    headers: {
      Host: 'runtime-fallback.example',
      'X-Forwarded-Host': 'runtime-fallback.example',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/runtime-fallback\.example\/sitemap\.xml/);
  assert.deepEqual(fallbackRequests, ['/Prod/runtime-bundle', '/Prod/runtime-bundle']);
  assert.deepEqual(primaryRequests, []);
  assert.equal(getStderr(), '');
});

test('production SSR server retries transient runtime fallback failures before custom domain', async (t) => {
  const fallbackRequests = [];
  const primaryRequests = [];
  const fallbackBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    fallbackRequests.push(url.pathname);

    if (fallbackRequests.length === 1) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'runtime-retry.example',
        routes: [{ path: '/', pageId: 'home' }],
        site: {
          seo: {
            canonicalOrigin: 'https://runtime-retry.example',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const primaryBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    primaryRequests.push(url.pathname);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ siteConfig: { domain: 'primary.example' } }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: `${fallbackBase}/Prod`,
    CONFIG_API_URL: primaryBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/robots.txt`, {
    headers: {
      Host: 'runtime-retry.example',
      'X-Forwarded-Host': 'runtime-retry.example',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/runtime-retry\.example\/sitemap\.xml/);
  assert.deepEqual(fallbackRequests, ['/Prod/runtime-bundle', '/Prod/runtime-bundle', '/Prod/runtime-bundle']);
  assert.deepEqual(primaryRequests, []);
  assert.equal(getStderr(), '');
});

test('production SSR server uses test runtime fallback for shared preview content hub reads', async (t) => {
  const testFallbackRequests = [];
  const prodFallbackRequests = [];
  const primaryRequests = [];
  const testSiteConfig = JSON.parse(readFileSync(join(repoRoot, 'drafts', 'zoositioweb.com.mx', 'site-config.json'), 'utf8'));
  testSiteConfig.runtime.contentHubs[0].publicArticles = [
    {
      articleId: 'art_test_runtime_preview',
      locale: 'es',
      status: 'published',
      visibility: 'public',
      title: 'Artículo publicado desde runtime test',
      summary: 'Contenido de prueba del índice público test.',
      path: '/blog/web/runtime-test-preview',
      categorySlug: 'web',
      tags: ['qa', 'runtime-test'],
      publishedAt: '2026-06-29T02:00:00.000Z',
      canonicalPath: '/blog/web/runtime-test-preview',
      robots: 'index,follow',
    },
  ];
  const prodSiteConfig = JSON.parse(JSON.stringify(testSiteConfig));
  prodSiteConfig.runtime.contentHubs[0].publicArticles = [];

  const testFallbackBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    testFallbackRequests.push(`${ url.pathname }?${ url.searchParams.toString() }`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: testSiteConfig,
      pageConfig: { pageId: 'default' },
    }));
  });
  const prodFallbackBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    prodFallbackRequests.push(`${ url.pathname }?${ url.searchParams.toString() }`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: prodSiteConfig,
      pageConfig: { pageId: 'default' },
    }));
  });
  const primaryBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    primaryRequests.push(`${ url.pathname }?${ url.searchParams.toString() }`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: `${ prodFallbackBase }/Prod`,
    CONFIG_API_SERVER_FALLBACK_URL_TEST: `${ testFallbackBase }/Prod`,
    CONFIG_API_URL: primaryBase,
  });
  const response = await fetch(
    `http://127.0.0.1:${ port }/content-hub-search.json?draftDomain=zoositioweb.com.mx&tagSlug=runtime-test`,
    {
      headers: {
        Host: 'test.zoolandingpage.com.mx',
        'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
        'X-Forwarded-Port': '443',
        'X-Forwarded-Proto': 'https',
      },
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.count, 1);
  assert.equal(body.articles[0].articleId, 'art_test_runtime_preview');
  assert.equal(testFallbackRequests.length, 1);
  assert.match(testFallbackRequests[0], /^\/Prod\/runtime-bundle\?/);
  assert.match(testFallbackRequests[0], /domain=zoositioweb\.com\.mx/);
  assert.match(testFallbackRequests[0], /path=%2Fblog/);
  assert.match(testFallbackRequests[0], /environment=test/);
  assert.equal(testFallbackRequests.some((request) => /lang=es/.test(request)), true);
  assert.deepEqual(prodFallbackRequests, []);
  assert.deepEqual(primaryRequests, []);
  assert.equal(getStderr(), '');
});

test('production SSR server renders draft routes on aliased hosts', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/home`, {
    headers: {
      Host: 'pamelabetancourt.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'pamelabetancourt.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Pamela Betancourt/i);
  assert.doesNotMatch(body, /Cannot GET \/home/i);
  assert.equal(getStderr(), '');
});

test('production SSR server renders a published canonical custom host from local config', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    headers: {
      Host: 'erosbarajas.com',
      'X-Forwarded-Host': 'erosbarajas.com',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /<main[\s>]/i);
  assert.match(body, /Eros Barajas/i);
  assert.equal(getStderr(), '');
});

test('production SSR server prefers forwarded custom host behind platform front door', async (t) => {
  const { port } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/blog`, {
    headers: {
      Host: 'zoolandingpage.com.mx',
      'X-Forwarded-Host': 'zoositioweb.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Ideas para crear sitios web/i);
  assert.match(body, /Explorar contenido/i);
  assert.match(body, /https:\/\/zoositioweb\.com\.mx\/blog/i);
  assert.doesNotMatch(body, /https:\/\/zoolandingpage\.com\.mx\/blog/i);
});

test('production SSR server allows a published runtime alias outside static host patterns', async (t) => {
  const requests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    requests.push({
      pathname: url.pathname,
      domain: url.searchParams.get('domain'),
      path: url.searchParams.get('path'),
    });

    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'published-canonical.example.com',
        aliases: ['published-alias.example.com'],
        routes: [{ path: '/', pageId: 'home' }],
        site: {
          seo: {
            canonicalOrigin: 'https://published-canonical.example.com',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetchStartedServer(`http://127.0.0.1:${port}/robots.txt`, {
    headers: {
      Host: 'published-alias.example.com',
      'X-Forwarded-Host': 'published-alias.example.com',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /Sitemap: https:\/\/published-canonical\.example\.com\/sitemap\.xml/);
  assert.equal(requests[0].domain, 'published-alias.example.com');
  assert.equal(getStderr(), '');
});

test('production SSR server blocks unknown custom hosts before Angular SSR', async (t) => {
  const apiRequests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    apiRequests.push(req.url);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    headers: {
      Host: 'unknown-custom.example.com',
      'X-Forwarded-Host': 'unknown-custom.example.com',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 400);
  assert.match(body, /not allowed/i);
  assert.deepEqual(apiRequests, ['/runtime-bundle?domain=unknown-custom.example.com&path=%2F']);
  assert.equal(getStderr(), '');
});

test('production SSR server supports test host draftDomain preview for a published custom host', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/?draftDomain=erosbarajas.com&debugWorkspace=false`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.match(body, /<main[\s>]/i);
  assert.match(body, /Eros Barajas/i);
  assert.equal(getStderr(), '');
});

test('production SSR server redirects protected draft preview routes to same-origin login', async (t) => {
  const requests = [];
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    requests.push({
      pathname: url.pathname,
      domain: url.searchParams.get('domain'),
      path: url.searchParams.get('path'),
    });

    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'auth-preview.example.com',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/acceso', pageId: 'login' },
          {
            path: '/mi-cuenta',
            pageId: 'account',
            auth: {
              required: true,
              redirectTo: '/acceso',
              allowedGroups: ['client'],
            },
          },
        ],
        site: {
          seo: {
            canonicalOrigin: 'https://auth-preview.example.com',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/mi-cuenta?draftDomain=auth-preview.example.com&debugWorkspace=false&utm_source=google&lang=es`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    'https://test.zoolandingpage.com.mx/acceso?draftDomain=auth-preview.example.com&debugWorkspace=false&lang=es',
  );
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(requests[0], {
    pathname: '/runtime-bundle',
    domain: 'auth-preview.example.com',
    path: '/',
  });
  assert.equal(getStderr(), '');
});

test('production SSR server lets authRemote protected routes reach Angular for BFF revalidation', async (t) => {
  const requests = [];
  const siteConfig = {
    domain: 'auth-preview.example.com',
    routes: [
      { path: '/', pageId: 'home' },
      { path: '/acceso', pageId: 'login' },
      {
        path: '/admin/usuarios',
        pageId: 'admin-users',
        auth: {
          required: true,
          redirectTo: '/acceso',
          allowedGroups: ['admin'],
        },
      },
    ],
    runtime: {
      authRemote: {
        enabled: true,
        authProfileId: 'staff',
        endpoint: '/auth/runtime-config',
      },
    },
    site: {
      seo: {
        canonicalOrigin: 'https://auth-preview.example.com',
      },
    },
  };
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    requests.push({
      pathname: url.pathname,
      domain: url.searchParams.get('domain'),
      path: url.searchParams.get('path'),
    });

    if (url.pathname === '/site-config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(siteConfig));
      return;
    }

    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig,
      pageConfig: {
        pageId: 'admin-users',
        rootIds: [],
      },
      components: {
        version: 1,
        domain: 'auth-preview.example.com',
        pageId: 'admin-users',
        components: [],
      },
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/admin/usuarios?draftDomain=auth-preview.example.com&debugWorkspace=false&lang=es`, {
    redirect: 'manual',
    headers: {
      Host: 'test.zoolandingpage.com.mx',
      'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('pragma'), 'no-cache');
  assert.equal(response.headers.get('expires'), '0');
  assert.match(response.headers.get('vary') ?? '', /\bCookie\b/i);
  assert.match(body, /<app-root\b[^>]*data-zlp-protected-shell="true"/i);
  assert.doesNotMatch(body, /<!--nghm-->/i);
  assert.doesNotMatch(body, /<script\b[^>]*\bid=(["'])ng-state\1/i);
  assert.match(body, /id="zlp-boot-curtain"/i);
  assert.match(body, /<meta name="robots" content="noindex,nofollow">/);
  assertNoSensitiveAuthSurface(body);
  assert.doesNotMatch(body, /Aprueba cuentas nuevas/i);
  assert.deepEqual(requests[0], {
    pathname: '/runtime-bundle',
    domain: 'auth-preview.example.com',
    path: '/',
  });
  assert.equal(getStderr(), '');
});

test('production SSR server renders a safe shell for Zoosite protected article detail routes', async (t) => {
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    ZLP_RUNTIME_ENV: 'test',
  });
  const articleId = 'art_ssr_route_param_regression';
  const routeSuffixes = ['editor', 'preview', 'seo', 'versiones'];

  for (const suffix of routeSuffixes) {
    const response = await fetch(
      `http://127.0.0.1:${port}/admin/blog/articulos/${articleId}/${suffix}?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es`,
      {
        redirect: 'manual',
        headers: {
          Host: 'test.zoolandingpage.com.mx',
          'X-Forwarded-Host': 'test.zoolandingpage.com.mx',
          'X-Forwarded-Port': '443',
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Server': 'dokploy-traefik',
        },
      },
    );
    const body = await response.text();
    const appRoot = extractAppRootHtml(body);
    const protectedOverlay = stripNonVisibleHtml(extractProtectedSsrOverlayHtml(body));

    assert.equal(response.status, 200, suffix);
    assert.equal(response.headers.get('location'), null, suffix);
    assert.equal(response.headers.get('cache-control'), 'no-store', suffix);
    assert.match(response.headers.get('vary') ?? '', /\bCookie\b/i, suffix);
    assert.match(body, /<title>Validando acceso \| zoositioweb<\/title>/, suffix);
    assert.match(body, /app-root\[data-zlp-protected-shell="true"\]\{display:none!important;visibility:hidden!important\}/, suffix);
    assert.match(body, /<app-root\b[^>]*data-zlp-protected-shell="true"/i, suffix);
    assert.match(body, /<app-root\b[^>]*aria-hidden="true"/i, suffix);
    assert.doesNotMatch(body, /<!--nghm-->/i, suffix);
    assert.doesNotMatch(body, /<script\b[^>]*\bid=(["'])ng-state\1/i, suffix);
    assert.doesNotMatch(body, /<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?Página no encontrada[\s\S]*?<\/script>/i, suffix);
    const appRootOpeningTag = appRoot.match(/^<app-root\b[^>]*>/i)?.[0] ?? '';
    assert.doesNotMatch(appRootOpeningTag, /(?:ng-version|ng-server-context|ngh=|_nghost-|_ngcontent-|ngSkipHydration)/i, suffix);
    assert.match(protectedOverlay, /<main\b/i, suffix);
    assert.match(protectedOverlay, /Validando acceso/i, suffix);
    assert.doesNotMatch(protectedOverlay, /Página no encontrada|Esta ruta no está publicada/i, suffix);
    assert.doesNotMatch(protectedOverlay, /Editor de artículo|Vista previa|Versiones|SEO/i, suffix);
    assert.ok(appRoot.length > 0, suffix);
    assert.doesNotMatch(
      stripNonVisibleHtml(appRoot),
      /notFoundHero|Página no encontrada|Esta ruta no está publicada/i,
      `protected app-root must not hide a not-found document for ${suffix}`,
    );
    assertNoSensitiveAuthSurface(protectedOverlay);
  }

  assert.equal(getStderr(), '');
});

test('production SSR server preserves local port in protected-route redirects', async (t) => {
  const apiBase = await startRuntimeApi(t, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname !== '/runtime-bundle') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      siteConfig: {
        domain: 'auth-preview.example.com',
        routes: [
          { path: '/', pageId: 'home' },
          { path: '/acceso', pageId: 'login' },
          {
            path: '/mi-cuenta',
            pageId: 'account',
            auth: {
              required: true,
              redirectTo: '/acceso',
              allowedGroups: ['client'],
            },
          },
        ],
        site: {
          seo: {
            canonicalOrigin: 'https://auth-preview.example.com',
          },
        },
      },
      pageConfig: {
        pageId: 'home',
      },
    }));
  });
  const { port, getStderr } = await startProductionServer(t, {
    CONFIG_API_SERVER_FALLBACK_URL: '',
    CONFIG_API_URL: apiBase,
  });
  const response = await fetch(`http://127.0.0.1:${port}/mi-cuenta?draftDomain=auth-preview.example.com&lang=es`, {
    redirect: 'manual',
  });

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    `http://127.0.0.1:${port}/acceso?draftDomain=auth-preview.example.com&lang=es`,
  );
  assert.equal(getStderr(), '');
});

test('production SSR server ignores draftDomain query params on published custom hosts', async (t) => {
  const { port, getStderr } = await startProductionServer(t);
  const response = await fetch(`http://127.0.0.1:${port}/?draftDomain=zoolandingpage.com.mx&debugWorkspace=false`, {
    headers: {
      Host: 'erosbarajas.com',
      'X-Forwarded-Host': 'erosbarajas.com',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Proto': 'https',
      'X-Forwarded-Server': 'dokploy-traefik',
    },
  });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /<main[\s>]/i);
  assert.match(body, /Eros Barajas/i);
  assert.equal(getStderr(), '');
});
