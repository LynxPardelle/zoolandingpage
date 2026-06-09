import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schemaPath = new URL('../../docs/api-driven-config/schemas/site-config.schema.json', import.meta.url);
const zoositeSiteConfigPath = new URL('../../drafts/zoositioweb.com.mx/site-config.json', import.meta.url);

const publicAuthDisallowedFields = [
    'access',
    'auth',
    'credentialRef',
    'clientSecret',
    'accessToken',
    'refreshToken',
];

async function readJson(url) {
    return JSON.parse(await readFile(url, 'utf8'));
}

async function readZoositePilotPage(pageId) {
    return readJson(new URL(`../../drafts/zoositioweb.com.mx/${pageId}/page-config.json`, import.meta.url));
}

test('site-config schema aligns HTTPS auth URL restrictions with runtime validators', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const pattern = schema.definitions?.httpsAbsoluteUrl?.pattern;

    assert.equal(typeof pattern, 'string');

    const httpsAbsoluteUrl = new RegExp(pattern);

    assert.equal(httpsAbsoluteUrl.test('https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TEST'), true);
    assert.equal(httpsAbsoluteUrl.test('https://test-client.auth.us-east-1.amazoncognito.com'), true);
    assert.equal(httpsAbsoluteUrl.test('https://user:pass@example.com/path'), false);
    assert.equal(httpsAbsoluteUrl.test('https://user:pass@example.com'), false);
    assert.equal(httpsAbsoluteUrl.test('https://example.com\\x'), false);
    assert.equal(httpsAbsoluteUrl.test('https://example.com/path\\x'), false);
});

test('site-config schema documents remote auth as a public minimal reference', async () => {
    const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
    const runtime = schema.definitions?.runtimeConfig;
    const authRemote = schema.definitions?.authRemoteRuntime;

    assert.equal(runtime.properties.authRemote.$ref, '#/definitions/authRemoteRuntime');
    assert.deepEqual(runtime.not.required, ['auth', 'authRemote']);
    assert.deepEqual(authRemote.required, ['authProfileId', 'endpoint']);
    assert.equal(authRemote.properties.access, undefined);
    assert.equal(authRemote.properties.auth, undefined);
    assert.equal(authRemote.properties.credentialRef, undefined);
    assert.equal(authRemote.properties.clientSecret, undefined);
    assert.equal(authRemote.additionalProperties, false);
});

test('Zoosite pilot uses public authRemote and protected account routing without server-only fields', async () => {
    const siteConfig = await readJson(zoositeSiteConfigPath);
    const routes = new Map(siteConfig.routes.map(route => [route.path, route]));

    assert.equal(siteConfig.domain, 'zoositioweb.com.mx');
    assert.equal(siteConfig.runtime?.auth, undefined);
    assert.deepEqual(siteConfig.runtime?.authRemote, {
        enabled: true,
        authProfileId: 'staff',
        endpoint: '/auth/runtime-config',
    });

    for (const field of publicAuthDisallowedFields) {
        assert.equal(siteConfig.runtime.authRemote[field], undefined, `runtime.authRemote.${field} must stay out of the browser config`);
        assert.equal(JSON.stringify(siteConfig.runtime.authRemote).includes(`ssm:/`), false);
        assert.equal(JSON.stringify(siteConfig.runtime.authRemote).includes(`secretsmanager:/`), false);
    }

    assert.deepEqual(routes.get('/acceso'), {
        path: '/acceso',
        pageId: 'acceso',
        label: 'Acceso',
    });
    assert.deepEqual(routes.get('/auth/callback'), {
        path: '/auth/callback',
        pageId: 'auth-callback',
        label: 'Auth callback',
    });
    assert.deepEqual(routes.get('/mi-cuenta'), {
        path: '/mi-cuenta',
        pageId: 'mi-cuenta',
        label: 'Mi cuenta',
        auth: {
            required: true,
            redirectTo: '/acceso',
            allowedGroups: ['zoosite-client', 'zoosite-admin'],
        },
    });

    const expectedPilotCanonicals = new Map([
        ['acceso', 'https://zoositioweb.com.mx/acceso'],
        ['auth-callback', 'https://zoositioweb.com.mx/auth/callback'],
        ['mi-cuenta', 'https://zoositioweb.com.mx/mi-cuenta'],
    ]);
    for (const [pageId, canonical] of expectedPilotCanonicals) {
        const page = await readZoositePilotPage(pageId);
        assert.equal(page.seo?.robots?.default, 'noindex,nofollow');
        assert.equal(page.seo?.canonical, canonical);
    }
});
